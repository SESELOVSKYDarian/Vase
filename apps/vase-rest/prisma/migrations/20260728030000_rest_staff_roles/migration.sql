CREATE TABLE "LocalEmployee" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "pinChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LocalEmployee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LocalEmployee_globalTenantId_employeeCode_key"
ON "LocalEmployee"("globalTenantId", "employeeCode");
CREATE INDEX "LocalEmployee_restTenantId_active_idx"
ON "LocalEmployee"("restTenantId", "active");

CREATE TABLE "StaffBranchRole" (
  "id" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "localEmployeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffBranchRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffBranchRole_localEmployeeId_branchId_key"
ON "StaffBranchRole"("localEmployeeId", "branchId");
CREATE INDEX "StaffBranchRole_globalTenantId_branchId_role_idx"
ON "StaffBranchRole"("globalTenantId", "branchId", "role");

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "certificateFingerprint" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Device_globalTenantId_branchId_status_idx"
ON "Device"("globalTenantId", "branchId", "status");

CREATE TABLE "StaffSession" (
  "id" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "localEmployeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");
CREATE INDEX "StaffSession_globalTenantId_branchId_expiresAt_idx"
ON "StaffSession"("globalTenantId", "branchId", "expiresAt");
CREATE INDEX "StaffSession_localEmployeeId_revokedAt_idx"
ON "StaffSession"("localEmployeeId", "revokedAt");

ALTER TABLE "LocalEmployee" ADD CONSTRAINT "LocalEmployee_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBranchRole" ADD CONSTRAINT "StaffBranchRole_localEmployeeId_fkey"
FOREIGN KEY ("localEmployeeId") REFERENCES "LocalEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBranchRole" ADD CONSTRAINT "StaffBranchRole_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_localEmployeeId_fkey"
FOREIGN KEY ("localEmployeeId") REFERENCES "LocalEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
