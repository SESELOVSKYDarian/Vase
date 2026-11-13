-- Additive only: billing data and Mercado Pago settlement records for the client panel.
CREATE TABLE `TenantBillingProfile` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `taxCondition` VARCHAR(191) NULL,
    `fiscalAddress` VARCHAR(191) NULL,
    `mercadoPagoCustomerId` VARCHAR(191) NULL,
    `defaultCardId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantBillingProfile_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MercadoPagoPaymentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `mercadoPagoPaymentId` VARCHAR(191) NOT NULL,
    `clientPaymentId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MercadoPagoPaymentRecord_mercadoPagoPaymentId_key`(`mercadoPagoPaymentId`),
    INDEX `MercadoPagoPaymentRecord_clientPaymentId_idx`(`clientPaymentId`),
    INDEX `MercadoPagoPaymentRecord_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TenantBillingProfile` ADD CONSTRAINT `TenantBillingProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MercadoPagoPaymentRecord` ADD CONSTRAINT `MercadoPagoPaymentRecord_clientPaymentId_fkey` FOREIGN KEY (`clientPaymentId`) REFERENCES `ClientPayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
