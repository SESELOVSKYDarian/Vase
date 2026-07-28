CREATE TABLE "DeliveryConnection" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
  "status" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
  "storeId" TEXT NOT NULL,
  "clientIdCiphertext" TEXT,
  "clientSecretCiphertext" TEXT,
  "webhookSecretCiphertext" TEXT,
  "config" JSONB NOT NULL,
  "certificationEvidence" JSONB,
  "lastSuccessfulOperationAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryOrder" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "orderId" TEXT,
  "providerOrderId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "customerName" TEXT,
  "deliveryAddress" TEXT,
  "total" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "providerCreatedAt" TIMESTAMP(3),
  "normalizedPayload" JSONB NOT NULL,
  "providerPayload" JSONB NOT NULL,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryWebhookEvent" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryCommandReceipt" (
  "id" TEXT NOT NULL,
  "restTenantId" TEXT NOT NULL,
  "globalTenantId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryCommandReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryConnection_branchId_provider_key"
  ON "DeliveryConnection"("branchId", "provider");
CREATE UNIQUE INDEX "DeliveryConnection_provider_environment_storeId_key"
  ON "DeliveryConnection"("provider", "environment", "storeId");
CREATE INDEX "DeliveryConnection_globalTenantId_provider_status_idx"
  ON "DeliveryConnection"("globalTenantId", "provider", "status");
CREATE UNIQUE INDEX "DeliveryOrder_connectionId_providerOrderId_key"
  ON "DeliveryOrder"("connectionId", "providerOrderId");
CREATE INDEX "DeliveryOrder_globalTenantId_branchId_status_createdAt_idx"
  ON "DeliveryOrder"("globalTenantId", "branchId", "status", "createdAt");
CREATE INDEX "DeliveryOrder_orderId_idx" ON "DeliveryOrder"("orderId");
CREATE UNIQUE INDEX "DeliveryWebhookEvent_connectionId_providerEventId_key"
  ON "DeliveryWebhookEvent"("connectionId", "providerEventId");
CREATE INDEX "DeliveryWebhookEvent_globalTenantId_receivedAt_idx"
  ON "DeliveryWebhookEvent"("globalTenantId", "receivedAt");
CREATE UNIQUE INDEX "DeliveryCommandReceipt_globalTenantId_commandId_key"
  ON "DeliveryCommandReceipt"("globalTenantId", "commandId");

ALTER TABLE "DeliveryConnection" ADD CONSTRAINT "DeliveryConnection_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryConnection" ADD CONSTRAINT "DeliveryConnection_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "DeliveryConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryWebhookEvent" ADD CONSTRAINT "DeliveryWebhookEvent_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryWebhookEvent" ADD CONSTRAINT "DeliveryWebhookEvent_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "DeliveryConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryCommandReceipt" ADD CONSTRAINT "DeliveryCommandReceipt_restTenantId_fkey"
  FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
