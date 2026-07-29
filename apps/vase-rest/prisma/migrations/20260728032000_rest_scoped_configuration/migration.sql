CREATE TABLE "ConfigurationPolicy" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfigurationPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConfigurationPolicy_globalTenantId_family_scopeType_scopeId_key"
ON "ConfigurationPolicy"("globalTenantId", "family", "scopeType", "scopeId");
CREATE INDEX "ConfigurationPolicy_globalTenantId_family_idx"
ON "ConfigurationPolicy"("globalTenantId", "family");
ALTER TABLE "ConfigurationPolicy" ADD CONSTRAINT "ConfigurationPolicy_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
