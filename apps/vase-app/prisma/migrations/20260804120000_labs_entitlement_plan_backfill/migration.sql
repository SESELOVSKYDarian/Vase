-- Deployment assumption: 20260804090000_client_product_access_and_team and this
-- forward migration are deployed in the same release, before application traffic
-- can intentionally persist STARTER alongside the legacy PREMIUM compatibility plan.
-- Legacy mapping is explicit: START -> STARTER, PREMIUM -> GROWTH.
UPDATE `TenantAiWorkspace`
SET `entitlementPlan` = CASE `plan`
  WHEN 'PREMIUM' THEN 'GROWTH'
  WHEN 'START' THEN 'STARTER'
  ELSE `entitlementPlan`
END
WHERE `entitlementPlan` = 'STARTER'
  AND `plan` IN ('START', 'PREMIUM');
