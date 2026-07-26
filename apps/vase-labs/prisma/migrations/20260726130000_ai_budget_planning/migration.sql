ALTER TABLE `LabsEntitlement`
  ADD COLUMN `aiBudgetMicros` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aiBudgetUsedMicros` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `extraAiBudgetMicros` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `TokenUsage`
  ADD COLUMN `costMicros` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `model` VARCHAR(191) NULL,
  ADD COLUMN `profile` VARCHAR(191) NULL;

CREATE INDEX `TokenUsage_globalTenantId_model_createdAt_idx`
  ON `TokenUsage`(`globalTenantId`, `model`, `createdAt`);
