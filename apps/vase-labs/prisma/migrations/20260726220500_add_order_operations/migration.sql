ALTER TABLE `BusinessOrderProjection`
  ADD COLUMN `operationalStatus` VARCHAR(191) NOT NULL DEFAULT 'PROCESSING',
  ADD COLUMN `operationalUpdatedAt` DATETIME(3) NULL,
  ADD COLUMN `readyAt` DATETIME(3) NULL,
  ADD COLUMN `customerNotificationStatus` VARCHAR(191) NULL,
  ADD COLUMN `customerNotifiedAt` DATETIME(3) NULL,
  ADD COLUMN `customerNotificationError` TEXT NULL;

CREATE TABLE `OrderStatusEvent` (
  `id` VARCHAR(191) NOT NULL,
  `orderProjectionId` VARCHAR(191) NOT NULL,
  `fromStatus` VARCHAR(191) NULL,
  `toStatus` VARCHAR(191) NOT NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'TEAM',
  `notificationStatus` VARCHAR(191) NULL,
  `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OrderStatusEvent_orderProjectionId_createdAt_idx` (`orderProjectionId`, `createdAt`),
  CONSTRAINT `OrderStatusEvent_orderProjectionId_fkey`
    FOREIGN KEY (`orderProjectionId`) REFERENCES `BusinessOrderProjection`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
);
