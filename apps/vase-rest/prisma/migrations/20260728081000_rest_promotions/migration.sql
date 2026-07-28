CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "restTenantId" TEXT NOT NULL,
    "globalTenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(18,4) NOT NULL,
    "productIds" JSONB NOT NULL,
    "paymentMethods" JSONB NOT NULL,
    "weekdays" JSONB NOT NULL,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Promotion_globalTenantId_code_key"
ON "Promotion"("globalTenantId", "code");
CREATE INDEX "Promotion_globalTenantId_active_startsAt_endsAt_idx"
ON "Promotion"("globalTenantId", "active", "startsAt", "endsAt");
CREATE INDEX "Promotion_globalTenantId_scopeType_scopeId_idx"
ON "Promotion"("globalTenantId", "scopeType", "scopeId");
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_restTenantId_fkey"
FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD COLUMN "grossBeforeDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "promotionIds" JSONB NOT NULL DEFAULT '[]';
UPDATE "OrderItem" SET "grossBeforeDiscount" = "lineTotal";
