CREATE TABLE `ConversationInsight` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `analysisVersion` INTEGER NOT NULL,
  `summary` TEXT NOT NULL,
  `currentNeed` TEXT NOT NULL,
  `productInterests` JSON NOT NULL,
  `preferences` JSON NOT NULL,
  `objections` JSON NOT NULL,
  `budgetSignals` JSON NOT NULL,
  `urgencySignals` JSON NOT NULL,
  `recommendations` JSON NOT NULL,
  `nextBestAction` TEXT NOT NULL,
  `scoreReasons` JSON NOT NULL,
  `leadScore` INTEGER NOT NULL,
  `intentLabel` ENUM('HOT_LEAD', 'RESEARCHING', 'LOW_INTENT', 'HUMAN_REQUESTED', 'UNCLASSIFIED') NOT NULL,
  `identitySignals` JSON NOT NULL,
  `analyzedThroughMessageId` VARCHAR(191) NOT NULL,
  `analyzedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ConversationInsight_conversationId_key` (`conversationId`),
  INDEX `ConversationInsight_intentLabel_leadScore_idx` (`intentLabel`, `leadScore`),
  INDEX `ConversationInsight_analyzedAt_idx` (`analyzedAt`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `ConversationInsightSettings` (
  `id` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `hotLeadThreshold` INTEGER NOT NULL DEFAULT 75,
  `purchaseIntentWeight` INTEGER NOT NULL DEFAULT 25,
  `productDefinedWeight` INTEGER NOT NULL DEFAULT 15,
  `budgetAcceptanceWeight` INTEGER NOT NULL DEFAULT 15,
  `urgencyWeight` INTEGER NOT NULL DEFAULT 15,
  `contactFulfillmentWeight` INTEGER NOT NULL DEFAULT 10,
  `interactionDepthWeight` INTEGER NOT NULL DEFAULT 10,
  `negativeSignalsWeight` INTEGER NOT NULL DEFAULT -10,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ConversationInsightSettings_assistantId_key` (`assistantId`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `ConversationAnalysisJob` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `requestedThroughMessageId` VARCHAR(191) NOT NULL,
  `requestedThroughMessageCreatedAt` DATETIME(3) NOT NULL,
  `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `leaseToken` VARCHAR(191) NULL,
  `leaseExpiresAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ConversationAnalysisJob_conversationId_key` (`conversationId`),
  INDEX `ConversationAnalysisJob_status_leaseExpiresAt_idx` (`status`, `leaseExpiresAt`),
  INDEX `ConversationAnalysisJob_status_attempts_updatedAt_idx` (`status`, `attempts`, `updatedAt`),
  PRIMARY KEY (`id`)
);

ALTER TABLE `ConversationInsight`
  ADD CONSTRAINT `ConversationInsight_conversationId_fkey`
  FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConversationInsightSettings`
  ADD CONSTRAINT `ConversationInsightSettings_assistantId_fkey`
  FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConversationAnalysisJob`
  ADD CONSTRAINT `ConversationAnalysisJob_conversationId_fkey`
  FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
