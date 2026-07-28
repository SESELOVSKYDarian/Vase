CREATE TABLE "EdgeAggregateProjection" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL, "aggregateId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "state" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EdgeAggregateProjection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EdgeAggregateProjection_globalTenantId_aggregateType_aggregateId_key"
ON "EdgeAggregateProjection"("globalTenantId","aggregateType","aggregateId");
CREATE INDEX "EdgeAggregateProjection_globalTenantId_aggregateType_updatedAt_idx"
ON "EdgeAggregateProjection"("globalTenantId","aggregateType","updatedAt");

CREATE TABLE "EdgeEventReceipt" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "installationId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "aggregateType" TEXT NOT NULL, "aggregateId" TEXT NOT NULL,
  "aggregateVersion" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EdgeEventReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EdgeEventReceipt_globalTenantId_eventId_key"
ON "EdgeEventReceipt"("globalTenantId","eventId");
CREATE UNIQUE INDEX "EdgeEventReceipt_globalTenantId_idempotencyKey_key"
ON "EdgeEventReceipt"("globalTenantId","idempotencyKey");
CREATE INDEX "EdgeEventReceipt_globalTenantId_aggregateType_aggregateId_aggregateVersion_idx"
ON "EdgeEventReceipt"("globalTenantId","aggregateType","aggregateId","aggregateVersion");
CREATE INDEX "EdgeEventReceipt_installationId_acceptedAt_idx"
ON "EdgeEventReceipt"("installationId","acceptedAt");
ALTER TABLE "EdgeAggregateProjection" ADD CONSTRAINT "EdgeAggregateProjection_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EdgeEventReceipt" ADD CONSTRAINT "EdgeEventReceipt_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
