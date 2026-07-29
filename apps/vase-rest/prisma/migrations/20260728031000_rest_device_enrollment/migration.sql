CREATE TABLE "EdgeInstallation" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "certificateFingerprint" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EdgeInstallation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EdgeInstallation_certificateFingerprint_key"
ON "EdgeInstallation"("certificateFingerprint");
CREATE INDEX "EdgeInstallation_globalTenantId_branchId_status_idx"
ON "EdgeInstallation"("globalTenantId", "branchId", "status");

CREATE TABLE "DeviceEnrollment" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "edgeLimit" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceEnrollment_codeHash_key" ON "DeviceEnrollment"("codeHash");
CREATE INDEX "DeviceEnrollment_globalTenantId_branchId_expiresAt_idx"
ON "DeviceEnrollment"("globalTenantId", "branchId", "expiresAt");

ALTER TABLE "EdgeInstallation" ADD CONSTRAINT "EdgeInstallation_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EdgeInstallation" ADD CONSTRAINT "EdgeInstallation_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceEnrollment" ADD CONSTRAINT "DeviceEnrollment_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceEnrollment" ADD CONSTRAINT "DeviceEnrollment_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
