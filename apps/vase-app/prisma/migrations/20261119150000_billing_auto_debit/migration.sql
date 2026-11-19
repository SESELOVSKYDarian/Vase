-- Additive only: débito automático de las facturas de Vase con Mercado Pago (una suscripción por cuenta).
CREATE TABLE `BillingAutoDebit` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mercadopago',
    `externalId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `amount` DECIMAL(14, 2) NOT NULL,
    `payerEmail` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BillingAutoDebit_tenantId_key`(`tenantId`),
    UNIQUE INDEX `BillingAutoDebit_externalId_key`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BillingAutoDebit` ADD CONSTRAINT `BillingAutoDebit_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
