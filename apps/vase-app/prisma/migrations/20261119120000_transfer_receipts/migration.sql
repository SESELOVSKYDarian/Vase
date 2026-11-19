-- Additive only: comprobantes de transferencia que suben los clientes para pagar sus facturas de Vase.
CREATE TABLE `TransferReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `clientPaymentId` VARCHAR(191) NOT NULL,
    `uploadedByUserId` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `contentType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `data` MEDIUMBLOB NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedByUserId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rejectReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransferReceipt_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `TransferReceipt_clientPaymentId_status_idx`(`clientPaymentId`, `status`),
    INDEX `TransferReceipt_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TransferReceipt` ADD CONSTRAINT `TransferReceipt_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TransferReceipt` ADD CONSTRAINT `TransferReceipt_clientPaymentId_fkey` FOREIGN KEY (`clientPaymentId`) REFERENCES `ClientPayment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
