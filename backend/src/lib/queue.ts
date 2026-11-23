import { Queue, QueueOptions, RedisOptions } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';

/**
 * BullMQ requires maxRetriesPerRequest to be null on the dedicated Redis connection
 */
export function getBullRedisOptions(): RedisOptions {
  const parsed = new URL(REDIS_URL);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6381', 10),
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
  };
}

export const QUEUE_NAMES = {
  CAMPAIGN: 'campaign-processing',
  WHATSAPP: 'whatsapp-processing',
  ANALYTICS: 'analytics-sync',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

const defaultQueueOptions: QueueOptions = {
  connection: getBullRedisOptions(),
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 86400, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 604800, // 7 days
    },
  },
};

// Singleton Queues
export const campaignQueue = new Queue(QUEUE_NAMES.CAMPAIGN, defaultQueueOptions);
export const whatsappQueue = new Queue(QUEUE_NAMES.WHATSAPP, defaultQueueOptions);
export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, defaultQueueOptions);

/**
 * Generates deterministic BullMQ custom job IDs strictly using hyphens and underscores.
 * NEVER contains colons, preventing Redis key delimiter interference.
 */
export function formatJobId(prefix: string, ...parts: (string | number)[]): string {
  const cleanParts = parts.map((p) =>
    String(p)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
  );
  return `${prefix}_${cleanParts.join('_')}`;
}

/**
 * Gracefully close all BullMQ queues and release Redis connections
 */
export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    campaignQueue.close(),
    whatsappQueue.close(),
    analyticsQueue.close(),
  ]);
}

