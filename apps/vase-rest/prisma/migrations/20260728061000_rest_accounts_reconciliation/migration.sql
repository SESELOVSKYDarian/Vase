ALTER TABLE "Payment" ADD COLUMN "customerAccountId" TEXT;

CREATE TABLE "CustomerAccount" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "taxId" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "creditLimit" DECIMAL(18,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerAccountMovement" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "accountId" TEXT NOT NULL,
  "paymentId" TEXT,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "reversalOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAccountMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "providerRefundId" TEXT,
  "providerResponse" JSONB,
  "reason" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccount_globalTenantId_code_key"
  ON "CustomerAccount"("globalTenantId", "code");
CREATE INDEX "CustomerAccount_globalTenantId_status_name_idx"
  ON "CustomerAccount"("globalTenantId", "status", "name");
CREATE UNIQUE INDEX "CustomerAccountMovement_globalTenantId_commandId_key"
  ON "CustomerAccountMovement"("globalTenantId", "commandId");
CREATE UNIQUE INDEX "CustomerAccountMovement_reversalOfId_key"
  ON "CustomerAccountMovement"("reversalOfId");
CREATE INDEX "CustomerAccountMovement_accountId_createdAt_idx"
  ON "CustomerAccountMovement"("accountId", "createdAt");
CREATE INDEX "CustomerAccountMovement_globalTenantId_branchId_createdAt_idx"
  ON "CustomerAccountMovement"("globalTenantId", "branchId", "createdAt");
CREATE UNIQUE INDEX "PaymentRefund_globalTenantId_commandId_key"
  ON "PaymentRefund"("globalTenantId", "commandId");
CREATE UNIQUE INDEX "PaymentRefund_globalTenantId_provider_providerRefundId_key"
  ON "PaymentRefund"("globalTenantId", "provider", "providerRefundId");
CREATE INDEX "PaymentRefund_paymentId_status_idx" ON "PaymentRefund"("paymentId", "status");
CREATE INDEX "PaymentRefund_globalTenantId_branchId_createdAt_idx"
  ON "PaymentRefund"("globalTenantId", "branchId", "createdAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerAccountId_fkey"
  FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountMovement" ADD CONSTRAINT "CustomerAccountMovement_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountMovement" ADD CONSTRAINT "CustomerAccountMovement_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountMovement" ADD CONSTRAINT "CustomerAccountMovement_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountMovement" ADD CONSTRAINT "CustomerAccountMovement_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
