ALTER TABLE "users" ADD COLUMN "globalUserId" TEXT;
CREATE UNIQUE INDEX "users_globalUserId_key" ON "users"("globalUserId");

ALTER TABLE "Company"
  ADD COLUMN "globalTenantId" TEXT,
  ADD COLUMN "integrationProvider" TEXT NOT NULL DEFAULT 'EXTERNAL_API',
  ADD COLUMN "provisioningStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncError" TEXT;
CREATE UNIQUE INDEX "Company_globalTenantId_key" ON "Company"("globalTenantId");

ALTER TABLE "customers" ADD COLUMN "globalExternalId" TEXT, ADD COLUMN "sourceVersion" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "customers_companyId_globalExternalId_key" ON "customers"("companyId", "globalExternalId");
ALTER TABLE "products" ADD COLUMN "globalExternalId" TEXT, ADD COLUMN "sourceVersion" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "products_companyId_globalExternalId_key" ON "products"("companyId", "globalExternalId");
ALTER TABLE "sales" ADD COLUMN "globalExternalId" TEXT, ADD COLUMN "sourceVersion" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "sales_companyId_globalExternalId_key" ON "sales"("companyId", "globalExternalId");

CREATE TABLE "management_sso_nonces" (
  "id" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "management_sso_nonces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "management_sso_nonces_nonceHash_key" ON "management_sso_nonces"("nonceHash");
CREATE INDEX "management_sso_nonces_expiresAt_usedAt_idx" ON "management_sso_nonces"("expiresAt", "usedAt");

CREATE TABLE "management_sync_outbox" (
  "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "destination" TEXT NOT NULL, "entity" TEXT NOT NULL, "action" TEXT NOT NULL, "externalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "management_sync_outbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "management_sync_outbox_eventId_key" ON "management_sync_outbox"("eventId");
CREATE INDEX "management_sync_outbox_status_nextAttemptAt_idx" ON "management_sync_outbox"("status", "nextAttemptAt");
CREATE INDEX "management_sync_outbox_tenant_entity_external_version_idx" ON "management_sync_outbox"("globalTenantId", "entity", "externalId", "version");

CREATE TABLE "management_sync_receipts" (
  "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "entity" TEXT NOT NULL, "externalId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "management_sync_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "management_sync_receipts_eventId_key" ON "management_sync_receipts"("eventId");
CREATE INDEX "management_sync_receipts_tenant_entity_external_version_idx" ON "management_sync_receipts"("globalTenantId", "entity", "externalId", "version");
