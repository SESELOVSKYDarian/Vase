CREATE TABLE "MenuCategory" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MenuCategory_globalTenantId_code_key" ON "MenuCategory"("globalTenantId","code");
CREATE INDEX "MenuCategory_globalTenantId_active_sortOrder_idx" ON "MenuCategory"("globalTenantId","active","sortOrder");

CREATE TABLE "MenuProduct" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL, "sku" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "available" BOOLEAN NOT NULL DEFAULT true, "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MenuProduct_globalTenantId_sku_key" ON "MenuProduct"("globalTenantId","sku");
CREATE INDEX "MenuProduct_globalTenantId_categoryId_available_idx" ON "MenuProduct"("globalTenantId","categoryId","available");

CREATE TABLE "Ingredient" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "sku" TEXT NOT NULL, "name" TEXT NOT NULL, "baseUnit" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ingredient_globalTenantId_sku_key" ON "Ingredient"("globalTenantId","sku");

CREATE TABLE "RecipeItem" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL, "quantity" DECIMAL(18,6) NOT NULL, "unit" TEXT NOT NULL,
  CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_key" ON "RecipeItem"("productId","ingredientId");
CREATE INDEX "RecipeItem_globalTenantId_ingredientId_idx" ON "RecipeItem"("globalTenantId","ingredientId");

CREATE TABLE "ProductPrice" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL, "scopeId" TEXT NOT NULL, "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS', "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductPrice_globalTenantId_productId_scopeType_scopeId_key"
ON "ProductPrice"("globalTenantId","productId","scopeType","scopeId");

CREATE TABLE "ProductBranchAvailability" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL, "available" BOOLEAN NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ProductBranchAvailability_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductBranchAvailability_productId_branchId_key"
ON "ProductBranchAvailability"("productId","branchId");
CREATE INDEX "ProductBranchAvailability_globalTenantId_branchId_available_idx"
ON "ProductBranchAvailability"("globalTenantId","branchId","available");

CREATE TABLE "ModifierGroup" (
  "id" TEXT NOT NULL, "restTenantId" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModifierGroup_globalTenantId_code_key" ON "ModifierGroup"("globalTenantId","code");

CREATE TABLE "ModifierOption" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "modifierGroupId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "priceDelta" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModifierOption_modifierGroupId_code_key" ON "ModifierOption"("modifierGroupId","code");

CREATE TABLE "ProductModifierGroup" (
  "id" TEXT NOT NULL, "globalTenantId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductModifierGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductModifierGroup_productId_modifierGroupId_key"
ON "ProductModifierGroup"("productId","modifierGroupId");

ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuProduct" ADD CONSTRAINT "MenuProduct_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuProduct" ADD CONSTRAINT "MenuProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBranchAvailability" ADD CONSTRAINT "ProductBranchAvailability_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBranchAvailability" ADD CONSTRAINT "ProductBranchAvailability_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_restTenantId_fkey" FOREIGN KEY ("restTenantId") REFERENCES "RestTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
