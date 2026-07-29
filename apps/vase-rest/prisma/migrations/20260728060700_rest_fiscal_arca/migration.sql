ALTER TABLE "MenuProduct"
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  ADD COLUMN "taxIncluded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrderItem"
  ADD COLUMN "netTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  ADD COLUMN "taxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- Existing orders were created with tax included in their gross line total.
-- Preserve their accounting value instead of leaving the new snapshots at zero.
UPDATE "OrderItem"
SET
  "netTotal" = ROUND("lineTotal" / 1.21, 2),
  "taxAmount" = "lineTotal" - ROUND("lineTotal" / 1.21, 2);

CREATE TABLE "FiscalConnection" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "environment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNCONFIGURED', "cuit" TEXT NOT NULL,
  "legalName" TEXT NOT NULL, "pointOfSale" INTEGER NOT NULL,
  "certificateCiphertext" TEXT NOT NULL, "privateKeyCiphertext" TEXT NOT NULL,
  "passphraseCiphertext" TEXT, "certificateNotAfter" TIMESTAMP(3) NOT NULL,
  "authorizedVoucherTypes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalAccessTicket" (
  "id" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "service" TEXT NOT NULL,
  "tokenCiphertext" TEXT NOT NULL, "signCiphertext" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalAccessTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalDocument" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "connectionId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL, "voucherType" INTEGER NOT NULL,
  "pointOfSale" INTEGER NOT NULL, "voucherNumber" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "currency" TEXT NOT NULL DEFAULT 'PES',
  "total" DECIMAL(18,2) NOT NULL, "net" DECIMAL(18,2) NOT NULL,
  "vat" DECIMAL(18,2) NOT NULL, "exempt" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "untaxed" DECIMAL(18,2) NOT NULL DEFAULT 0, "recipientDocType" INTEGER NOT NULL,
  "recipientDocNumber" TEXT NOT NULL, "cae" TEXT, "caeExpiresAt" TIMESTAMP(3),
  "observations" JSONB NOT NULL, "qrPayload" JSONB, "request" JSONB NOT NULL,
  "response" JSONB, "commandId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FiscalConnection_branchId_key" ON "FiscalConnection"("branchId");
CREATE UNIQUE INDEX "FiscalConnection_globalTenantId_cuit_pointOfSale_key"
  ON "FiscalConnection"("globalTenantId", "cuit", "pointOfSale");
CREATE INDEX "FiscalConnection_globalTenantId_status_idx"
  ON "FiscalConnection"("globalTenantId", "status");
CREATE UNIQUE INDEX "FiscalAccessTicket_connectionId_service_key"
  ON "FiscalAccessTicket"("connectionId", "service");
CREATE UNIQUE INDEX "FiscalDocument_globalTenantId_commandId_key"
  ON "FiscalDocument"("globalTenantId", "commandId");
CREATE UNIQUE INDEX "FiscalDocument_connectionId_voucherType_pointOfSale_voucherNumber_key"
  ON "FiscalDocument"("connectionId", "voucherType", "pointOfSale", "voucherNumber");
CREATE INDEX "FiscalDocument_globalTenantId_branchId_status_createdAt_idx"
  ON "FiscalDocument"("globalTenantId", "branchId", "status", "createdAt");
CREATE INDEX "FiscalDocument_orderId_idx" ON "FiscalDocument"("orderId");

ALTER TABLE "FiscalConnection"
  ADD CONSTRAINT "FiscalConnection_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FiscalConnection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalAccessTicket"
  ADD CONSTRAINT "FiscalAccessTicket_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FiscalConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalDocument"
  ADD CONSTRAINT "FiscalDocument_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FiscalDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FiscalDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FiscalDocument_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FiscalConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
