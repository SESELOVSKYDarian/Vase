-- Additive only: Mi negocio › Cómo se conectan tus productos (de dónde sale cada cosa).
CREATE TABLE `TenantDataSource` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `resource` ENUM('CATALOG', 'STOCK', 'ORDERS', 'CUSTOMERS') NOT NULL,
    `source` ENUM('BUSINESS', 'MANAGEMENT', 'REST', 'EXTERNAL') NOT NULL,
    `externalSystem` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantDataSource_tenantId_resource_key`(`tenantId`, `resource`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TenantDataSource` ADD CONSTRAINT `TenantDataSource_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
