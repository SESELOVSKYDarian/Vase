ALTER TABLE `Module` MODIFY `product` ENUM('BUSINESS', 'LABS', 'MANAGEMENT', 'REST') NOT NULL;

CREATE TABLE `RestPricingVersion` (
  `id` VARCHAR(191) NOT NULL,
  `plan` ENUM('STARTER','GROWTH','PRO','ENTERPRISE') NOT NULL,
  `version` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS',
  `monthlyPrice` DECIMAL(12,2) NOT NULL,
  `branchLimit` INTEGER NOT NULL,
  `localEmployeeLimit` INTEGER NOT NULL,
  `deviceLimit` INTEGER NOT NULL,
  `edgeLimit` INTEGER NOT NULL,
  `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `effectiveAt` DATETIME(3) NOT NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `RestPricingVersion_plan_version_key`(`plan`, `version`),
  INDEX `RestPricingVersion_status_effectiveAt_idx`(`status`, `effectiveAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantRestContract` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `pricingVersionId` VARCHAR(191) NOT NULL,
  `plan` ENUM('STARTER','GROWTH','PRO','ENTERPRISE') NOT NULL,
  `status` ENUM('ACTIVE','TRIAL','PAUSED','SUSPENDED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `agreedMonthlyPrice` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS',
  `branchLimit` INTEGER NOT NULL,
  `localEmployeeLimit` INTEGER NOT NULL,
  `deviceLimit` INTEGER NOT NULL,
  `edgeLimit` INTEGER NOT NULL,
  `acceptedVersion` INTEGER NOT NULL,
  `activatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `suspendedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TenantRestContract_tenantId_key`(`tenantId`),
  INDEX `TenantRestContract_status_plan_idx`(`status`, `plan`),
  INDEX `TenantRestContract_pricingVersionId_idx`(`pricingVersionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TenantRestContract`
  ADD CONSTRAINT `TenantRestContract_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantRestContract`
  ADD CONSTRAINT `TenantRestContract_pricingVersionId_fkey`
  FOREIGN KEY (`pricingVersionId`) REFERENCES `RestPricingVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
