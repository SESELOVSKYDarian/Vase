CREATE TABLE "RestTenant" (
  "id" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestTenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestEntitlementProjection" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "contractVersion" INTEGER NOT NULL,
  "branchLimit" INTEGER NOT NULL,
  "localEmployeeLimit" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "edgeLimit" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestEntitlementProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchGroup" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchGroupMember" (
  "id" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchGroupId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestTenant_globalTenantId_key" ON "RestTenant"("globalTenantId");
CREATE UNIQUE INDEX "RestTenant_slug_key" ON "RestTenant"("slug");
CREATE UNIQUE INDEX "RestEntitlementProjection_restTenantId_key" ON "RestEntitlementProjection"("restTenantId");
CREATE UNIQUE INDEX "RestEntitlementProjection_globalTenantId_key" ON "RestEntitlementProjection"("globalTenantId");
CREATE INDEX "RestEntitlementProjection_globalTenantId_status_idx" ON "RestEntitlementProjection"("globalTenantId", "status");
CREATE UNIQUE INDEX "Branch_globalTenantId_code_key" ON "Branch"("globalTenantId", "code");
CREATE INDEX "Branch_globalTenantId_active_idx" ON "Branch"("globalTenantId", "active");
CREATE INDEX "Branch_restTenantId_idx" ON "Branch"("restTenantId");
CREATE UNIQUE INDEX "BranchGroup_globalTenantId_code_key" ON "BranchGroup"("globalTenantId", "code");
CREATE INDEX "BranchGroup_restTenantId_idx" ON "BranchGroup"("restTenantId");
CREATE UNIQUE INDEX "BranchGroupMember_branchGroupId_branchId_key" ON "BranchGroupMember"("branchGroupId", "branchId");
CREATE INDEX "BranchGroupMember_globalTenantId_branchId_idx" ON "BranchGroupMember"("globalTenantId", "branchId");
CREATE INDEX "AuditEvent_globalTenantId_occurredAt_idx" ON "AuditEvent"("globalTenantId", "occurredAt");
CREATE INDEX "AuditEvent_globalTenantId_entityType_entityId_idx" ON "AuditEvent"("globalTenantId", "entityType", "entityId");
CREATE INDEX "AuditEvent_branchId_occurredAt_idx" ON "AuditEvent"("branchId", "occurredAt");

ALTER TABLE "RestEntitlementProjection"
  ADD CONSTRAINT "RestEntitlementProjection_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchGroup"
  ADD CONSTRAINT "BranchGroup_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchGroupMember"
  ADD CONSTRAINT "BranchGroupMember_branchGroupId_fkey"
  FOREIGN KEY ("branchGroupId") REFERENCES "BranchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchGroupMember"
  ADD CONSTRAINT "BranchGroupMember_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
