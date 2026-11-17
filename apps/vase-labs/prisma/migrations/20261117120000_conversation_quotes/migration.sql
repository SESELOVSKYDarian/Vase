-- Presupuestos que arma la IA en una conversación. Tabla nueva: no cambia nada de lo existente.
-- Un primer intento la dejó creada a medias (sin la relación): solo esta tabla nueva, vacía, se vuelve a crear.
DROP TABLE IF EXISTS `ConversationQuote`;

CREATE TABLE `ConversationQuote` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `number` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS',
  `items` JSON NOT NULL,
  `subtotal` DECIMAL(14, 2) NOT NULL,
  `total` DECIMAL(14, 2) NOT NULL,
  `customerName` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `validUntil` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ConversationQuote_globalTenantId_number_key` (`globalTenantId`, `number`),
  INDEX `ConversationQuote_conversationId_createdAt_idx` (`conversationId`, `createdAt`),
  CONSTRAINT `ConversationQuote_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
