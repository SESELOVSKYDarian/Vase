CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Warehouse_globalTenantId_code_key" ON "Warehouse"("globalTenantId","code");
CREATE INDEX "Warehouse_globalTenantId_active_idx" ON "Warehouse"("globalTenantId","active");

CREATE TABLE "WarehouseBranch" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "WarehouseBranch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WarehouseBranch_warehouseId_branchId_key" ON "WarehouseBranch"("warehouseId","branchId");
CREATE INDEX "WarehouseBranch_globalTenantId_branchId_idx" ON "WarehouseBranch"("globalTenantId","branchId");

CREATE TABLE "InventoryBalance" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL, "onHand" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryBalance_warehouseId_ingredientId_key" ON "InventoryBalance"("warehouseId","ingredientId");
CREATE INDEX "InventoryBalance_globalTenantId_ingredientId_idx" ON "InventoryBalance"("globalTenantId","ingredientId");

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "warehouseId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL, "kind" TEXT NOT NULL, "quantity" DECIMAL(18,6) NOT NULL,
  "balanceAfter" DECIMAL(18,6) NOT NULL, "commandId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "referenceType" TEXT, "referenceId" TEXT, "reason" TEXT, "reversalOfId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryMovement_reversalOfId_key" ON "InventoryMovement"("reversalOfId");
CREATE UNIQUE INDEX "InventoryMovement_globalTenantId_commandId_key" ON "InventoryMovement"("globalTenantId","commandId");
CREATE INDEX "InventoryMovement_globalTenantId_warehouseId_ingredientId_occurredAt_idx"
ON "InventoryMovement"("globalTenantId","warehouseId","ingredientId","occurredAt");

CREATE TABLE "BranchInventoryAllocation" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL, "ingredientId" TEXT NOT NULL, "available" DECIMAL(18,6) NOT NULL,
  "safetyStock" DECIMAL(18,6) NOT NULL DEFAULT 0, "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BranchInventoryAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BranchInventoryAllocation_branchId_ingredientId_key"
ON "BranchInventoryAllocation"("branchId","ingredientId");
CREATE INDEX "BranchInventoryAllocation_globalTenantId_warehouseId_idx"
ON "BranchInventoryAllocation"("globalTenantId","warehouseId");

CREATE TABLE "AllocationConsumption" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "allocationId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL, "quantity" DECIMAL(18,6) NOT NULL,
  "remainingAfter" DECIMAL(18,6) NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllocationConsumption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AllocationConsumption_globalTenantId_commandId_key"
ON "AllocationConsumption"("globalTenantId","commandId");
CREATE INDEX "AllocationConsumption_allocationId_occurredAt_idx"
ON "AllocationConsumption"("allocationId","occurredAt");

ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseBranch" ADD CONSTRAINT "WarehouseBranch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseBranch" ADD CONSTRAINT "WarehouseBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchInventoryAllocation" ADD CONSTRAINT "BranchInventoryAllocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchInventoryAllocation" ADD CONSTRAINT "BranchInventoryAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchInventoryAllocation" ADD CONSTRAINT "BranchInventoryAllocation_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllocationConsumption" ADD CONSTRAINT "AllocationConsumption_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "BranchInventoryAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
