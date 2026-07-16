ALTER TABLE `TenantAiWorkspace`
  ADD COLUMN `channelLimits` JSON NULL,
  ADD COLUMN `channelOverrideReason` VARCHAR(191) NULL,
  ADD COLUMN `channelOverrideBy` VARCHAR(191) NULL,
  ADD COLUMN `channelOverrideAt` DATETIME(3) NULL,
  ADD COLUMN `labsSyncStatus` VARCHAR(191) NOT NULL DEFAULT 'SYNCED';
