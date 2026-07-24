ALTER TABLE `Message`
  ADD COLUMN `analysisPendingAt` DATETIME(3) NULL;

UPDATE `Message`
SET `analysisPendingAt` = `createdAt`
WHERE `analysisPendingAt` IS NULL
  AND (
    (
      JSON_TYPE(JSON_EXTRACT(
        `metadata`,
        '$.conversationAnalysisPending'
      )) = 'STRING'
      AND CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(
        `metadata`,
        '$.conversationAnalysisPending'
      )))) > 0
    )
    OR JSON_EXTRACT(`metadata`, '$.conversationAnalysisPending') = true
  );

ALTER TABLE `Message`
  ADD INDEX `Message_analysisPendingAt_id_idx` (`analysisPendingAt`, `id`);
