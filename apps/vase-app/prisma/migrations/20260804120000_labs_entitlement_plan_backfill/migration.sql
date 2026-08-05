-- Deployment assumption: 20260804090000_client_product_access_and_team and this
-- forward migration are deployed in the same release, before application traffic
-- can intentionally persist STARTER alongside the legacy PREMIUM compatibility plan.
-- An active, commercially entitled Labs submodule is authoritative. Ranking is
-- deterministic when legacy data has multiple selections: GROWTH > PRO > STARTER.
-- Legacy workspace mapping is only the fallback: START -> STARTER, PREMIUM -> GROWTH.
UPDATE `TenantAiWorkspace` AS `workspace`
LEFT JOIN (
  SELECT
    `tenantSubmodule`.`tenantId`,
    MAX(CASE LOWER(`submodule`.`key`)
      WHEN 'growth' THEN 3
      WHEN 'pro' THEN 2
      WHEN 'starter' THEN 1
      ELSE 0
    END) AS `planRank`
  FROM `TenantSubmodule` AS `tenantSubmodule`
  INNER JOIN `ModuleSubmodule` AS `submodule`
    ON `submodule`.`id` = `tenantSubmodule`.`submoduleId`
    AND `submodule`.`moduleId` = 'vase_labs'
  WHERE `tenantSubmodule`.`isActive` = TRUE
    AND `tenantSubmodule`.`commercialStatus` IN ('ACTIVE', 'TRIAL')
  GROUP BY `tenantSubmodule`.`tenantId`
) AS `selectedLabsPlan`
  ON `selectedLabsPlan`.`tenantId` = `workspace`.`tenantId`
SET `workspace`.`entitlementPlan` = CASE `selectedLabsPlan`.`planRank`
  WHEN 3 THEN 'GROWTH'
  WHEN 2 THEN 'PRO'
  WHEN 1 THEN 'STARTER'
  ELSE CASE `workspace`.`plan`
    WHEN 'PREMIUM' THEN 'GROWTH'
    WHEN 'START' THEN 'STARTER'
    ELSE `workspace`.`entitlementPlan`
  END
END
WHERE `workspace`.`entitlementPlan` = 'STARTER';
