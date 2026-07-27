UPDATE `LabsEntitlement`
SET `aiBudgetMicros` = 10000000
WHERE `plan` = 'GROWTH'
  AND `aiBudgetMicros` = 15000000;

UPDATE `LabsEntitlement`
SET `aiBudgetMicros` = 20000000
WHERE `plan` = 'PRO'
  AND `aiBudgetMicros` = 40000000;
