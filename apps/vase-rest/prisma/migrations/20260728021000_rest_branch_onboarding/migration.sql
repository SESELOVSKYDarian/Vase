ALTER TABLE "Branch" ADD COLUMN "slug" TEXT;

UPDATE "Branch"
SET "slug" = lower(regexp_replace("code", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "Branch" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Branch_globalTenantId_slug_key"
ON "Branch"("globalTenantId", "slug");
