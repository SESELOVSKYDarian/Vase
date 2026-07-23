ALTER TABLE `Message`
  ADD COLUMN `analysisPendingAt` DATETIME(3) NULL;

-- Rolling-deploy bridge: remove these triggers only after every pre-column app
-- instance is retired and all legacy pending markers have been drained.
-- Legacy marker strings are intentionally not parsed as dates: createdAt is a
-- durable and safe ordering value even when an old writer sends malformed JSON.
CREATE TRIGGER `Message_analysis_pending_legacy_insert`
BEFORE INSERT ON `Message`
FOR EACH ROW
SET NEW.`analysisPendingAt` = CASE
  WHEN NEW.`analysisPendingAt` IS NOT NULL THEN NEW.`analysisPendingAt`
  WHEN JSON_TYPE(JSON_EXTRACT(
    NEW.`metadata`,
    '$.conversationAnalysisPending'
  )) = 'STRING'
    AND CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(
      NEW.`metadata`,
      '$.conversationAnalysisPending'
    )))) > 0
  THEN COALESCE(NEW.`createdAt`, CURRENT_TIMESTAMP(3))
  WHEN JSON_EXTRACT(
    NEW.`metadata`,
    '$.conversationAnalysisPending'
  ) = true
  THEN COALESCE(NEW.`createdAt`, CURRENT_TIMESTAMP(3))
  ELSE NULL
END;

CREATE TRIGGER `Message_analysis_pending_legacy_update`
BEFORE UPDATE ON `Message`
FOR EACH ROW
SET NEW.`analysisPendingAt` = CASE
  WHEN NEW.`analysisPendingAt` IS NOT NULL THEN NEW.`analysisPendingAt`
  WHEN JSON_EXTRACT(
    OLD.`metadata`,
    '$.conversationAnalysisPending'
  ) <=> JSON_EXTRACT(
    NEW.`metadata`,
    '$.conversationAnalysisPending'
  )
  THEN NULL
  WHEN JSON_TYPE(JSON_EXTRACT(
    NEW.`metadata`,
    '$.conversationAnalysisPending'
  )) = 'STRING'
    AND CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(
      NEW.`metadata`,
      '$.conversationAnalysisPending'
    )))) > 0
  THEN COALESCE(NEW.`createdAt`, CURRENT_TIMESTAMP(3))
  WHEN JSON_EXTRACT(
    NEW.`metadata`,
    '$.conversationAnalysisPending'
  ) = true
  THEN COALESCE(NEW.`createdAt`, CURRENT_TIMESTAMP(3))
  ELSE NULL
END;

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
