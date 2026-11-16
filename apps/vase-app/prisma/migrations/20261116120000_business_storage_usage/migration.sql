-- Additive only: cuánto ocupa la web de cada cuenta (lo informa Vase Business) y si ya se avisó del 85%.
CREATE TABLE `BusinessStorageUsage` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `imageCount` INTEGER NOT NULL DEFAULT 0,
    `totalBytes` BIGINT NOT NULL DEFAULT 0,
    `breakdown` JSON NULL,
    `lastBackupAt` DATETIME(3) NULL,
    `lastBackupBytes` BIGINT NOT NULL DEFAULT 0,
    `alertedPercent` INTEGER NOT NULL DEFAULT 0,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusinessStorageUsage_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BusinessStorageUsage` ADD CONSTRAINT `BusinessStorageUsage_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
