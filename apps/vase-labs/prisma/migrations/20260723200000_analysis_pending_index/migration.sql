ALTER TABLE `Message`
  ADD COLUMN `analysisPendingAt` DATETIME(3) NULL,
  ADD INDEX `Message_analysisPendingAt_id_idx` (`analysisPendingAt`, `id`);

UPDATE `Message`
SET `analysisPendingAt` = `createdAt`
WHERE JSON_EXTRACT(`metadata`, '$.conversationAnalysisPending') = true;
