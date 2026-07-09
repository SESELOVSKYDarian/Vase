CREATE TABLE `Assistant` (
  `id` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `tenantSlug` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `systemPrompt` TEXT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Assistant_tenantSlug_key` (`tenantSlug`),
  INDEX `Assistant_globalTenantId_idx` (`globalTenantId`)
);

CREATE TABLE `Channel` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `type` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
  `provider` ENUM('META_OFFICIAL', 'OPENWA_UNOFFICIAL', 'BAILEYS_UNOFFICIAL') NULL,
  `providerAccountId` VARCHAR(191) NULL,
  `phoneNumberId` VARCHAR(191) NULL,
  `wabaId` VARCHAR(191) NULL,
  `accountLabel` VARCHAR(191) NULL,
  `externalId` VARCHAR(191) NULL,
  `externalHandle` VARCHAR(191) NULL,
  `webhookUrl` TEXT NULL,
  `config` JSON NULL,
  `status` ENUM('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR', 'QR_READY') NOT NULL DEFAULT 'DISCONNECTED',
  `connectedAt` DATETIME(3) NULL,
  `lastSyncedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Channel_assistantId_type_providerAccountId_key` (`assistantId`, `type`, `providerAccountId`),
  INDEX `Channel_type_status_idx` (`type`, `status`),
  INDEX `Channel_provider_status_idx` (`provider`, `status`),
  CONSTRAINT `Channel_assistantId_fkey` FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `MetaConnectionAttempt` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `globalUserId` VARCHAR(191) NOT NULL,
  `tenantSlug` VARCHAR(191) NOT NULL,
  `channelType` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
  `status` ENUM('AUTHORIZING', 'SELECTING_ASSET', 'VERIFYING', 'CONNECTED', 'FAILED') NOT NULL DEFAULT 'AUTHORIZING',
  `stateHash` VARCHAR(191) NOT NULL,
  `encryptedUserToken` TEXT NULL,
  `candidates` JSON NULL,
  `errorCode` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MetaConnectionAttempt_stateHash_key` (`stateHash`),
  INDEX `MetaConnectionAttempt_globalTenantId_globalUserId_status_idx` (`globalTenantId`, `globalUserId`, `status`),
  INDEX `MetaConnectionAttempt_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `MetaConnectionAttempt_assistantId_fkey` FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `MetaOAuthState` (
  `id` VARCHAR(191) NOT NULL,
  `tenantSlug` VARCHAR(191) NOT NULL,
  `channelType` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
  `stateHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MetaOAuthState_stateHash_key` (`stateHash`),
  INDEX `MetaOAuthState_tenantSlug_channelType_idx` (`tenantSlug`, `channelType`),
  INDEX `MetaOAuthState_expiresAt_idx` (`expiresAt`)
);

CREATE TABLE `ChannelSecret` (
  `id` VARCHAR(191) NOT NULL,
  `channelId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `encryptedValue` TEXT NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `rotatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ChannelSecret_channelId_kind_key` (`channelId`, `kind`),
  INDEX `ChannelSecret_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `ChannelSecret_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `WebhookEvent` (
  `id` VARCHAR(191) NOT NULL,
  `channelId` VARCHAR(191) NOT NULL,
  `providerEventId` VARCHAR(191) NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `status` ENUM('PROCESSING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
  `metadata` JSON NULL,
  `processedAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `WebhookEvent_channelId_providerMessageId_key` (`channelId`, `providerMessageId`),
  INDEX `WebhookEvent_channelId_status_idx` (`channelId`, `status`),
  INDEX `WebhookEvent_providerEventId_idx` (`providerEventId`),
  CONSTRAINT `WebhookEvent_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `LabsEntitlement` (
  `id` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `plan` ENUM('STARTER', 'GROWTH', 'PRO') NOT NULL,
  `status` ENUM('ACTIVE', 'TRIAL', 'PAUSED', 'SUSPENDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `enabledChannels` JSON NOT NULL,
  `tokenPack` ENUM('BASIC', 'MEDIUM', 'PRO') NULL,
  `tokensIncluded` INTEGER NOT NULL,
  `tokensUsed` INTEGER NOT NULL DEFAULT 0,
  `extraTokens` INTEGER NOT NULL DEFAULT 0,
  `currentPeriodStart` DATETIME(3) NULL,
  `renewsAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `LabsEntitlement_globalTenantId_key` (`globalTenantId`),
  INDEX `LabsEntitlement_globalTenantId_status_idx` (`globalTenantId`, `status`),
  INDEX `LabsEntitlement_renewsAt_idx` (`renewsAt`)
);

CREATE TABLE `KnowledgeItem` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'READY',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `KnowledgeItem_assistantId_fkey` FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `Conversation` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `channel` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NULL,
  `status` ENUM('OPEN', 'ESCALATED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `externalUserId` VARCHAR(191) NULL,
  `externalThreadKey` VARCHAR(191) NULL,
  `customerName` VARCHAR(191) NULL,
  `customerContact` VARCHAR(191) NULL,
  `summary` TEXT NULL,
  `intentLabel` VARCHAR(191) NULL,
  `intentScore` INTEGER NULL,
  `metadata` JSON NULL,
  `messageCount` INTEGER NOT NULL DEFAULT 0,
  `escalatedToHuman` BOOLEAN NOT NULL DEFAULT false,
  `lastMessageAt` DATETIME(3) NULL,
  `lastInboundAt` DATETIME(3) NULL,
  `lastOutboundAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Conversation_assistantId_channel_externalThreadKey_key` (`assistantId`, `channel`, `externalThreadKey`),
  INDEX `Conversation_assistantId_status_lastMessageAt_idx` (`assistantId`, `status`, `lastMessageAt`),
  INDEX `Conversation_externalThreadKey_idx` (`externalThreadKey`),
  CONSTRAINT `Conversation_assistantId_fkey` FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `Message` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `direction` ENUM('INBOUND', 'OUTBOUND') NULL,
  `content` TEXT NOT NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `tokens` INTEGER NULL,
  `costCents` INTEGER NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Message_providerMessageId_idx` (`providerMessageId`),
  CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `MessageDelivery` (
  `id` VARCHAR(191) NOT NULL,
  `messageId` VARCHAR(191) NOT NULL,
  `channel` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
  `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `providerMessageId` VARCHAR(191) NULL,
  `error` TEXT NULL,
  `metadata` JSON NULL,
  `sentAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `MessageDelivery_messageId_idx` (`messageId`),
  INDEX `MessageDelivery_channel_status_idx` (`channel`, `status`),
  CONSTRAINT `MessageDelivery_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `TokenUsage` (
  `id` VARCHAR(191) NOT NULL,
  `globalTenantId` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NULL,
  `conversationId` VARCHAR(191) NULL,
  `messageId` VARCHAR(191) NULL,
  `channel` ENUM('WHATSAPP', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
  `inputTokens` INTEGER NOT NULL DEFAULT 0,
  `outputTokens` INTEGER NOT NULL DEFAULT 0,
  `totalTokens` INTEGER NOT NULL,
  `costCents` INTEGER NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'assistant',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TokenUsage_globalTenantId_createdAt_idx` (`globalTenantId`, `createdAt`),
  INDEX `TokenUsage_conversationId_idx` (`conversationId`),
  INDEX `TokenUsage_messageId_idx` (`messageId`),
  INDEX `TokenUsage_channel_idx` (`channel`),
  INDEX `TokenUsage_assistantId_idx` (`assistantId`)
);

CREATE TABLE `Handoff` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `target` VARCHAR(191) NOT NULL DEFAULT 'workplace',
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `assignedTo` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `Handoff_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
