ALTER TABLE `BusinessOrderProjection` ADD COLUMN `trackingCarrier` VARCHAR(191) NULL, ADD COLUMN `trackingUrl` VARCHAR(191) NULL, ADD COLUMN `trackingCode` VARCHAR(191) NULL, ADD COLUMN `operationalRevision` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `OrderStatusEvent` ADD COLUMN `notificationText` TEXT NULL, ADD COLUMN `recipient` VARCHAR(191) NULL, ADD COLUMN `providerMessageId` VARCHAR(191) NULL;
