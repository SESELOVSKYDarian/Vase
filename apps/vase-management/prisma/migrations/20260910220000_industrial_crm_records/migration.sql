CREATE TABLE "industrial_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industrial_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "industrial_records_companyId_entity_externalId_key"
ON "industrial_records"("companyId", "entity", "externalId");

CREATE INDEX "industrial_records_companyId_entity_updatedAt_idx"
ON "industrial_records"("companyId", "entity", "updatedAt");
