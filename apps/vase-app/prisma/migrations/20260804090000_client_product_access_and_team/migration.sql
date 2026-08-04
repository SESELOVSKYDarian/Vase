ALTER TABLE `TenantModule`
  ADD COLUMN `commercialStatus` ENUM('TRIAL', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
  ADD INDEX `TenantModule_tenantId_commercialStatus_idx`(`tenantId`, `commercialStatus`);

ALTER TABLE `TenantSubmodule`
  ADD COLUMN `commercialStatus` ENUM('TRIAL', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
  ADD INDEX `TenantSubmodule_tenantId_commercialStatus_idx`(`tenantId`, `commercialStatus`);

ALTER TABLE `TenantAiWorkspace`
  ADD COLUMN `entitlementPlan` ENUM('STARTER', 'PRO', 'GROWTH') NOT NULL DEFAULT 'STARTER';

ALTER TABLE `Membership`
  ADD COLUMN `createdByUserId` VARCHAR(191) NULL,
  ADD INDEX `Membership_tenantId_createdByUserId_idx`(`tenantId`, `createdByUserId`);

CREATE TABLE `ModuleFeature` (
  `id` VARCHAR(191) NOT NULL,
  `moduleId` VARCHAR(191) NOT NULL,
  `submoduleId` VARCHAR(191) NULL,
  `key` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `valueType` ENUM('BOOLEAN', 'INTEGER', 'TEXT') NOT NULL DEFAULT 'BOOLEAN',
  `trialDefault` JSON NULL,
  `activeDefault` JSON NULL,
  `minValue` INTEGER NULL,
  `maxValue` INTEGER NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ModuleFeature_moduleId_submoduleId_key_key`(`moduleId`, `submoduleId`, `key`),
  INDEX `ModuleFeature_moduleId_submoduleId_isActive_sortOrder_idx`(`moduleId`, `submoduleId`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantFeatureGrant` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `featureId` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `value` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TenantFeatureGrant_tenantId_featureId_key`(`tenantId`, `featureId`),
  INDEX `TenantFeatureGrant_tenantId_enabled_idx`(`tenantId`, `enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantInvitation` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `invitedByUserId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `role` ENUM('OWNER', 'MANAGER', 'MEMBER') NOT NULL,
  `moduleIds` JSON NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TenantInvitation_tokenHash_key`(`tokenHash`),
  INDEX `TenantInvitation_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt`),
  INDEX `TenantInvitation_email_status_idx`(`email`, `status`),
  INDEX `TenantInvitation_expiresAt_status_idx`(`expiresAt`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Membership`
  ADD CONSTRAINT `Membership_createdByUserId_fkey`
  FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ModuleFeature`
  ADD CONSTRAINT `ModuleFeature_moduleId_fkey`
  FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ModuleFeature`
  ADD CONSTRAINT `ModuleFeature_submoduleId_fkey`
  FOREIGN KEY (`submoduleId`) REFERENCES `ModuleSubmodule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TenantFeatureGrant`
  ADD CONSTRAINT `TenantFeatureGrant_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantFeatureGrant`
  ADD CONSTRAINT `TenantFeatureGrant_featureId_fkey`
  FOREIGN KEY (`featureId`) REFERENCES `ModuleFeature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TenantInvitation`
  ADD CONSTRAINT `TenantInvitation_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantInvitation`
  ADD CONSTRAINT `TenantInvitation_invitedByUserId_fkey`
  FOREIGN KEY (`invitedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
