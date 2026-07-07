CREATE TYPE "MetaConnectionAttemptStatus" AS ENUM (
  'AUTHORIZING',
  'SELECTING_ASSET',
  'VERIFYING',
  'CONNECTED',
  'FAILED'
);

CREATE TABLE "MetaConnectionAttempt" (
  "id" TEXT NOT NULL,
  "assistantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "globalUserId" TEXT NOT NULL,
  "tenantSlug" TEXT NOT NULL,
  "channelType" "LabsChannel" NOT NULL,
  "status" "MetaConnectionAttemptStatus" NOT NULL DEFAULT 'AUTHORIZING',
  "stateHash" TEXT NOT NULL,
  "encryptedUserToken" TEXT,
  "candidates" JSONB,
  "errorCode" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetaConnectionAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetaConnectionAttempt_assistantId_fkey"
    FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MetaConnectionAttempt_stateHash_key"
  ON "MetaConnectionAttempt"("stateHash");
CREATE INDEX "MetaConnectionAttempt_globalTenantId_globalUserId_status_idx"
  ON "MetaConnectionAttempt"("globalTenantId", "globalUserId", "status");
CREATE INDEX "MetaConnectionAttempt_expiresAt_idx"
  ON "MetaConnectionAttempt"("expiresAt");
CREATE UNIQUE INDEX "Channel_assistantId_type_providerAccountId_key"
  ON "Channel"("assistantId", "type", "providerAccountId");
