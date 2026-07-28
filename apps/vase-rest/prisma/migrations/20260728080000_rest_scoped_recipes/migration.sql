ALTER TABLE "RecipeItem"
ADD COLUMN "scopeType" TEXT NOT NULL DEFAULT 'TENANT',
ADD COLUMN "scopeId" TEXT,
ADD COLUMN "scopeRevision" INTEGER NOT NULL DEFAULT 1;

UPDATE "RecipeItem" SET "scopeId" = "globalTenantId" WHERE "scopeId" IS NULL;
ALTER TABLE "RecipeItem" ALTER COLUMN "scopeId" SET NOT NULL;

DROP INDEX "RecipeItem_productId_ingredientId_key";
CREATE UNIQUE INDEX "RecipeItem_productId_ingredientId_scopeType_scopeId_key"
ON "RecipeItem"("productId", "ingredientId", "scopeType", "scopeId");
