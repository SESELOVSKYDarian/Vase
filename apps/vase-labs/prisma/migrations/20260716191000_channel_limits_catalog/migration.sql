ALTER TABLE `LabsEntitlement`
  ADD COLUMN `channelLimits` JSON NULL;

UPDATE `LabsEntitlement`
SET `channelLimits` = JSON_OBJECT(
  'WHATSAPP', IF(JSON_CONTAINS(`enabledChannels`, JSON_QUOTE('WHATSAPP')), 1, 0),
  'INSTAGRAM', IF(JSON_CONTAINS(`enabledChannels`, JSON_QUOTE('INSTAGRAM')), 1, 0),
  'FACEBOOK', IF(JSON_CONTAINS(`enabledChannels`, JSON_QUOTE('FACEBOOK')), 1, 0)
);

ALTER TABLE `LabsEntitlement`
  MODIFY COLUMN `channelLimits` JSON NOT NULL;

CREATE TABLE `CatalogProduct` (
  `id` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `externalProductId` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(14, 2) NULL,
  `stock` INTEGER NOT NULL DEFAULT 0,
  `imageUrl` TEXT NULL,
  `categories` JSON NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sourceUpdatedAt` DATETIME(3) NOT NULL,
  `offeredByChatbot` BOOLEAN NOT NULL DEFAULT false,
  `aiAlias` VARCHAR(191) NULL,
  `aiDescription` TEXT NULL,
  `aiInstructions` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CatalogProduct_globalTenantId_externalProductId_key` (`globalTenantId`, `externalProductId`),
  INDEX `CatalogProduct_globalTenantId_active_offeredByChatbot_idx` (`globalTenantId`, `active`, `offeredByChatbot`),
  INDEX `CatalogProduct_globalTenantId_stock_idx` (`globalTenantId`, `stock`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `CatalogSyncEvent` (
  `id` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `productCount` INTEGER NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CatalogSyncEvent_eventId_key` (`eventId`),
  INDEX `CatalogSyncEvent_globalTenantId_occurredAt_idx` (`globalTenantId`, `occurredAt`),
  PRIMARY KEY (`id`)
);
