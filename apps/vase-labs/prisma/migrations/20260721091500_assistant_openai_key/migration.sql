CREATE TABLE `AssistantSecret` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `encryptedValue` TEXT NOT NULL,
  `rotatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `AssistantSecret_assistantId_kind_key` ON `AssistantSecret`(`assistantId`, `kind`);
CREATE INDEX `AssistantSecret_assistantId_idx` ON `AssistantSecret`(`assistantId`);

ALTER TABLE `AssistantSecret`
  ADD CONSTRAINT `AssistantSecret_assistantId_fkey`
  FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
