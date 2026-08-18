CREATE TABLE `TrainerAudioJob` (
  `id` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `trainerPhoneId` VARCHAR(191) NOT NULL,
  `providerMediaId` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NULL,
  `sourceMessageId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'QUEUED',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `transcript` LONGTEXT NULL,
  `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TrainerAudioJob_assistantId_providerMediaId_key`(`assistantId`, `providerMediaId`),
  INDEX `TrainerAudioJob_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `TrainerAudioJob_trainerPhoneId_createdAt_idx`(`trainerPhoneId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
