ALTER TABLE `Module` MODIFY `product` ENUM('BUSINESS', 'LABS', 'MANAGEMENT') NOT NULL;

CREATE TABLE `ManagementPricingVersion` (
  `id` VARCHAR(191) NOT NULL, `version` INTEGER NOT NULL, `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS',
  `setupPrice` DECIMAL(12,2) NOT NULL, `monthlyPrice` DECIMAL(12,2) NOT NULL,
  `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT', `publishedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, UNIQUE INDEX `ManagementPricingVersion_version_key`(`version`),
  INDEX `ManagementPricingVersion_status_createdAt_idx`(`status`, `createdAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantManagementContract` (
  `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `pricingVersionId` VARCHAR(191) NULL,
  `agreedSetupPrice` DECIMAL(12,2) NOT NULL, `agreedMonthlyPrice` DECIMAL(12,2) NOT NULL, `overrideReason` VARCHAR(191) NULL,
  `integrationProvider` ENUM('EXTERNAL_API','VASE_MANAGEMENT') NOT NULL DEFAULT 'EXTERNAL_API',
  `provisioningStatus` ENUM('PENDING','READY','FAILED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  `lastSyncAt` DATETIME(3) NULL, `lastSyncError` VARCHAR(191) NULL, `activatedAt` DATETIME(3) NULL, `suspendedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TenantManagementContract_tenantId_key`(`tenantId`),
  INDEX `TenantManagementContract_integrationProvider_provisioning_idx`(`integrationProvider`, `provisioningStatus`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ManagementIdentityLink` (
  `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `managementUserId` VARCHAR(191) NULL, `managementRole` VARCHAR(191) NOT NULL DEFAULT 'MEMBER', `isActive` BOOLEAN NOT NULL DEFAULT true,
  `provisionedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ManagementIdentityLink_tenantId_userId_key`(`tenantId`, `userId`),
  INDEX `ManagementIdentityLink_userId_isActive_idx`(`userId`, `isActive`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ManagementSsoNonce` (
  `id` VARCHAR(191) NOT NULL, `nonceHash` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL, `usedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ManagementSsoNonce_nonceHash_key`(`nonceHash`), INDEX `ManagementSsoNonce_expiresAt_usedAt_idx`(`expiresAt`, `usedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlatformSyncEvent` (
  `id` VARCHAR(191) NOT NULL, `eventId` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `destination` VARCHAR(191) NOT NULL,
  `entity` VARCHAR(191) NOT NULL, `action` VARCHAR(191) NOT NULL, `externalId` VARCHAR(191) NOT NULL, `version` INTEGER NOT NULL,
  `payload` JSON NOT NULL, `status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING', `attempts` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `lastError` VARCHAR(191) NULL, `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PlatformSyncEvent_eventId_key`(`eventId`), INDEX `PlatformSyncEvent_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
  INDEX `PlatformSyncEvent_tenant_entity_external_version_idx`(`tenantId`, `entity`, `externalId`, `version`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TenantManagementContract` ADD CONSTRAINT `TenantManagementContract_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ManagementIdentityLink` ADD CONSTRAINT `ManagementIdentityLink_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ManagementIdentityLink` ADD CONSTRAINT `ManagementIdentityLink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ManagementSsoNonce` ADD CONSTRAINT `ManagementSsoNonce_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ManagementSsoNonce` ADD CONSTRAINT `ManagementSsoNonce_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlatformSyncEvent` ADD CONSTRAINT `PlatformSyncEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
