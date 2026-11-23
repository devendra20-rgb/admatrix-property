-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "externalCampaignId" TEXT,
ADD COLUMN     "lastPublishError" TEXT,
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'IDLE';

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "externalMessageId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "claimOwner" TEXT,
    "claimedAt" TIMESTAMP(3),
    "claimExpiresAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOperation" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_FLIGHT',
    "providerReference" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_jobId_key" ON "OutboxEvent"("jobId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_claimExpiresAt_idx" ON "OutboxEvent"("status", "claimExpiresAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_organizationId_idx" ON "OutboxEvent"("organizationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_organizationId_idx" ON "WebhookEvent"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOperation_idempotencyKey_key" ON "ProviderOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderOperation_provider_entityId_idx" ON "ProviderOperation"("provider", "entityId");

-- CreateIndex
CREATE INDEX "ProviderOperation_organizationId_idx" ON "ProviderOperation"("organizationId");
