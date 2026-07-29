ALTER TABLE "KitchenTicket"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recalledAt" TIMESTAMP(3),
  ADD COLUMN "recallReason" TEXT;

ALTER TABLE "KitchenTicket"
  ADD CONSTRAINT "KitchenTicket_priority_check"
  CHECK ("priority" BETWEEN 0 AND 2);

CREATE INDEX "KitchenTicket_globalTenantId_branchId_priority_status_queuedAt_idx"
  ON "KitchenTicket"("globalTenantId", "branchId", "priority", "status", "queuedAt");
