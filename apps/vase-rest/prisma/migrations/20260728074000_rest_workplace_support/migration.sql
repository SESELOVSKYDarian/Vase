CREATE TABLE "RestSupportTicket" (
    "id" TEXT NOT NULL,
    "restTenantId" TEXT NOT NULL,
    "globalTenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "externalTicketId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdByActorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestSupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestSupportTicket_globalTenantId_requestId_key"
ON "RestSupportTicket"("globalTenantId", "requestId");
CREATE UNIQUE INDEX "RestSupportTicket_globalTenantId_externalTicketId_key"
ON "RestSupportTicket"("globalTenantId", "externalTicketId");
CREATE INDEX "RestSupportTicket_globalTenantId_createdAt_idx"
ON "RestSupportTicket"("globalTenantId", "createdAt");

ALTER TABLE "RestSupportTicket"
ADD CONSTRAINT "RestSupportTicket_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
