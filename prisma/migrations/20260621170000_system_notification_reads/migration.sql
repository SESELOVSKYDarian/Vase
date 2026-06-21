CREATE TABLE `SystemNotificationRead` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `notificationKey` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SystemNotificationRead_tenantId_userId_notificationKey_key`(`tenantId`, `userId`, `notificationKey`),
    INDEX `SystemNotificationRead_userId_readAt_idx`(`userId`, `readAt`),
    INDEX `SystemNotificationRead_tenantId_source_readAt_idx`(`tenantId`, `source`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SystemNotificationRead`
ADD CONSTRAINT `SystemNotificationRead_tenantId_fkey`
FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SystemNotificationRead`
ADD CONSTRAINT `SystemNotificationRead_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
