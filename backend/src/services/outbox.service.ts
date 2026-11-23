import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { campaignQueue, whatsappQueue, analyticsQueue, formatJobId } from '../lib/queue.js';
import { Prisma } from '@prisma/client';

export interface CreateOutboxEventParams {
  aggregateType: 'CAMPAIGN' | 'WHATSAPP' | 'ANALYTICS';
  aggregateId: string;
  eventType: string;
  payload: any;
  organizationId: string;
}

export class OutboxService {
  private static LEASE_DURATION_MS = 60000; // 60 seconds lease
  private dispatcherId: string;

  constructor(dispatcherId?: string) {
    this.dispatcherId = dispatcherId || `dispatcher_${crypto.randomUUID()}`;
  }

  /**
   * Insert an OutboxEvent within an existing Prisma Transaction.
   * Guarantees atomic creation of business entity state and outbox record.
   */
  public static async createEvent(
    tx: Prisma.TransactionClient,
    params: CreateOutboxEventParams
  ) {
    return tx.outboxEvent.create({
      data: {
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        eventType: params.eventType,
        payload: params.payload,
        organizationId: params.organizationId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Atomically claim a batch of pending or expired-lease outbox events.
   * Guarantees that only one dispatcher process claims an event at a time.
   */
  public async claimPendingEvents(batchSize: number = 25) {
    const now = new Date();
    const claimExpiresAt = new Date(now.getTime() + OutboxService.LEASE_DURATION_MS);

    // 1. Find candidates: PENDING or CLAIMED with an expired lease
    const candidates = await prisma.outboxEvent.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          {
            status: 'CLAIMED',
            claimExpiresAt: { lt: now },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
      select: { id: true },
    });

    if (candidates.length === 0) {
      return [];
    }

    const candidateIds = candidates.map((c) => c.id);

    // 2. Atomically update and claim the lease
    await prisma.outboxEvent.updateMany({
      where: {
        id: { in: candidateIds },
        OR: [
          { status: 'PENDING' },
          {
            status: 'CLAIMED',
            claimExpiresAt: { lt: now },
          },
        ],
      },
      data: {
        status: 'CLAIMED',
        claimOwner: this.dispatcherId,
        claimedAt: now,
        claimExpiresAt,
      },
    });

    // 3. Retrieve the claimed records assigned to this dispatcher
    return prisma.outboxEvent.findMany({
      where: {
        id: { in: candidateIds },
        claimOwner: this.dispatcherId,
        status: 'CLAIMED',
      },
    });
  }

  /**
   * Dispatch claimed events to BullMQ with deterministic job IDs.
   * Format: outbox_${event.id} (Strictly hyphens and underscores, never colons).
   */
  public async dispatchEvents(events: any[]) {
    const results = {
      dispatched: 0,
      failed: 0,
      errors: [] as { eventId: string; error: string }[],
    };

    for (const event of events) {
      const jobId = formatJobId('outbox', event.id);

      try {
        // Route to the appropriate BullMQ queue based on aggregateType
        switch (event.aggregateType) {
          case 'CAMPAIGN':
            await campaignQueue.add(event.eventType, event.payload, { jobId });
            break;
          case 'WHATSAPP':
            await whatsappQueue.add(event.eventType, event.payload, { jobId });
            break;
          case 'ANALYTICS':
            await analyticsQueue.add(event.eventType, event.payload, { jobId });
            break;
          default:
            throw new Error(`Unknown aggregateType: ${event.aggregateType}`);
        }

        // Successfully enqueued -> mark outbox event COMPLETED strictly validating lease ownership
        const updateResult = await prisma.outboxEvent.updateMany({
          where: {
            id: event.id,
            claimOwner: this.dispatcherId,
            status: 'CLAIMED',
          },
          data: {
            status: 'COMPLETED',
            jobId,
            processedAt: new Date(),
          },
        });

        if (updateResult.count > 0) {
          results.dispatched++;
        } else {
          console.warn(`[OutboxService] Event ${event.id} lease expired or changed owner before completion update`);
          results.failed++;
          results.errors.push({ eventId: event.id, error: 'Lease expired or ownership lost during dispatch' });
        }
      } catch (err: any) {
        console.error(`[OutboxService] Failed to dispatch event ${event.id}:`, err.message);

        // Record failure and increment retry count, respecting lease ownership
        await prisma.outboxEvent.updateMany({
          where: {
            id: event.id,
            claimOwner: this.dispatcherId,
            status: 'CLAIMED',
          },
          data: {
            status: 'FAILED',
            lastError: err.message || 'Unknown queue dispatch error',
            retryCount: { increment: 1 },
          },
        });

        results.failed++;
        results.errors.push({ eventId: event.id, error: err.message });
      }
    }

    return results;
  }

  /**
   * Recover expired leases: resets stale claimed events back to PENDING.
   * Useful when a previous dispatcher crashed after claiming events.
   */
  public static async recoverExpiredLeases() {
    const now = new Date();
    const result = await prisma.outboxEvent.updateMany({
      where: {
        status: 'CLAIMED',
        claimExpiresAt: { lt: now },
      },
      data: {
        status: 'PENDING',
        claimOwner: null,
        claimedAt: null,
        claimExpiresAt: null,
      },
    });

    return result.count;
  }

  /**
   * Persistent Worker-Level Idempotency Engine.
   * 
   * Guarantees at-most-once execution of business operations even when BullMQ
   * no longer retains the original job (e.g., job completed and removed, retention expired,
   * multiple concurrent workers, or crashed workers).
   * 
   * State transitions:
   * [Unseen] -> IN_PROGRESS -> COMPLETED (or FAILED / AMBIGUOUS)
   * 
   * Database-backed constraint: ProviderOperation.idempotencyKey (@unique)
   */
  public static async executeIdempotentOperation(
    params: {
      idempotencyKey: string;
      provider: string;
      operationType: string;
      entityId: string;
      organizationId: string;
      payload?: any;
      execute: () => Promise<{ providerReference?: string; response?: any }>;
    }
  ): Promise<{
    status: 'EXECUTED_SUCCESS' | 'SKIPPED_ALREADY_COMPLETED' | 'SKIPPED_IN_PROGRESS';
    operation: any;
    executed: boolean;
  }> {
    // 1. Check if the operation is already recorded in the database
    const existing = await prisma.providerOperation.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      if (existing.status === 'CONFIRMED') {
        // Idempotent Short-Circuit: Operation already confirmed. Never repeat external call.
        return {
          status: 'SKIPPED_ALREADY_COMPLETED',
          operation: existing,
          executed: false,
        };
      }
      if (existing.status === 'IN_FLIGHT') {
        // Concurrency Lock: Another worker is currently executing this operation.
        return {
          status: 'SKIPPED_IN_PROGRESS',
          operation: existing,
          executed: false,
        };
      }
    }

    // 2. Atomically reserve IN_FLIGHT state via PostgreSQL unique constraint
    let operation;
    try {
      operation = await prisma.providerOperation.create({
        data: {
          idempotencyKey: params.idempotencyKey,
          provider: params.provider,
          operationType: params.operationType,
          entityId: params.entityId,
          organizationId: params.organizationId,
          requestPayload: params.payload ?? Prisma.JsonNull,
          status: 'IN_FLIGHT',
          attempts: existing ? existing.attempts + 1 : 1,
        },
      });
    } catch (err: any) {
      // P2002: Unique constraint failed on idempotencyKey (race condition between concurrent workers)
      if (err.code === 'P2002') {
        const concurrent = await prisma.providerOperation.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        return {
          status: concurrent?.status === 'CONFIRMED' ? 'SKIPPED_ALREADY_COMPLETED' : 'SKIPPED_IN_PROGRESS',
          operation: concurrent,
          executed: false,
        };
      }
      throw err;
    }

    // 3. Execute business logic with strict error and state tracking
    try {
      const execResult = await params.execute();

      // 4. Atomically persist CONFIRMED state and external provider reference
      const completed = await prisma.providerOperation.update({
        where: { id: operation.id },
        data: {
          status: 'CONFIRMED',
          providerReference: execResult.providerReference || null,
          responsePayload: execResult.response ?? Prisma.JsonNull,
        },
      });

      return {
        status: 'EXECUTED_SUCCESS',
        operation: completed,
        executed: true,
      };
    } catch (execErr: any) {
      // Mark as AMBIGUOUS if external state is unknown, otherwise FAILED
      const finalStatus = execErr.isAmbiguous ? 'AMBIGUOUS' : 'FAILED';
      await prisma.providerOperation.update({
        where: { id: operation.id },
        data: {
          status: finalStatus,
          lastError: execErr.message || 'Worker execution failed',
        },
      });
      throw execErr;
    }
  }
}

