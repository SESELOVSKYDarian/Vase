CREATE TABLE "CashDrawer" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openingFloat" DECIMAL(18,2) NOT NULL,
  "expectedCash" DECIMAL(18,2) NOT NULL,
  "countedCash" DECIMAL(18,2),
  "variance" DECIMAL(18,2),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "openedBy" TEXT NOT NULL,
  "closedBy" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "drawerId" TEXT,
  "tenderType" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "provider" TEXT,
  "reference" TEXT,
  "operator" TEXT,
  "actorId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "reversedAt" TIMESTAMP(3),
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashMovement" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "drawerId" TEXT NOT NULL,
  "paymentId" TEXT,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "reversalOfId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialCommandReceipt" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialCommandReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashDrawer_one_open_station"
  ON "CashDrawer"("globalTenantId", "branchId", "stationId")
  WHERE "status" = 'OPEN';
CREATE INDEX "CashDrawer_globalTenantId_branchId_status_idx"
  ON "CashDrawer"("globalTenantId", "branchId", "status");
CREATE INDEX "CashDrawer_branchId_stationId_status_idx"
  ON "CashDrawer"("branchId", "stationId", "status");
CREATE UNIQUE INDEX "Payment_globalTenantId_commandId_key"
  ON "Payment"("globalTenantId", "commandId");
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
CREATE INDEX "Payment_globalTenantId_branchId_createdAt_idx"
  ON "Payment"("globalTenantId", "branchId", "createdAt");
CREATE UNIQUE INDEX "CashMovement_paymentId_key" ON "CashMovement"("paymentId");
CREATE UNIQUE INDEX "CashMovement_globalTenantId_commandId_key"
  ON "CashMovement"("globalTenantId", "commandId");
CREATE INDEX "CashMovement_drawerId_occurredAt_idx"
  ON "CashMovement"("drawerId", "occurredAt");
CREATE UNIQUE INDEX "FinancialCommandReceipt_globalTenantId_commandId_key"
  ON "FinancialCommandReceipt"("globalTenantId", "commandId");

ALTER TABLE "CashDrawer"
  ADD CONSTRAINT "CashDrawer_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CashDrawer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement"
  ADD CONSTRAINT "CashMovement_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CashMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashMovement_drawerId_fkey" FOREIGN KEY ("drawerId") REFERENCES "CashDrawer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CashMovement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialCommandReceipt"
  ADD CONSTRAINT "FinancialCommandReceipt_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
