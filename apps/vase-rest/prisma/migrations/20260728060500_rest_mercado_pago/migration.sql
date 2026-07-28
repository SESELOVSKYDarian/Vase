CREATE TABLE "PaymentProviderConnection" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "providerAccountId" TEXT,
  "accessTokenCiphertext" TEXT,
  "refreshTokenCiphertext" TEXT,
  "webhookSecretCiphertext" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderPaymentAttempt" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "commandId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "response" JSONB,
  "result" JSONB,
  "lastError" TEXT,
  "lastReconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentProviderWebhookEvent" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "providerOrderId" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentProviderConnection_branchId_provider_key"
  ON "PaymentProviderConnection"("branchId", "provider");
CREATE INDEX "PaymentProviderConnection_globalTenantId_provider_status_idx"
  ON "PaymentProviderConnection"("globalTenantId", "provider", "status");
CREATE UNIQUE INDEX "ProviderPaymentAttempt_globalTenantId_commandId_key"
  ON "ProviderPaymentAttempt"("globalTenantId", "commandId");
CREATE INDEX "ProviderPaymentAttempt_connectionId_status_createdAt_idx"
  ON "ProviderPaymentAttempt"("connectionId", "status", "createdAt");
CREATE INDEX "ProviderPaymentAttempt_providerOrderId_idx"
  ON "ProviderPaymentAttempt"("providerOrderId");
CREATE UNIQUE INDEX "Payment_globalTenantId_provider_reference_key"
  ON "Payment"("globalTenantId", "provider", "reference");
CREATE UNIQUE INDEX "PaymentProviderWebhookEvent_connectionId_requestId_key"
  ON "PaymentProviderWebhookEvent"("connectionId", "requestId");
CREATE INDEX "PaymentProviderWebhookEvent_globalTenantId_providerOrderId_idx"
  ON "PaymentProviderWebhookEvent"("globalTenantId", "providerOrderId");

ALTER TABLE "PaymentProviderConnection"
  ADD CONSTRAINT "PaymentProviderConnection_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentProviderConnection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderPaymentAttempt"
  ADD CONSTRAINT "ProviderPaymentAttempt_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProviderPaymentAttempt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProviderPaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProviderPaymentAttempt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentProviderConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderWebhookEvent"
  ADD CONSTRAINT "PaymentProviderWebhookEvent_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentProviderWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentProviderConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
