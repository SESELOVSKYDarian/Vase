ALTER TABLE `Tenant`
  ADD COLUMN `primaryOwnerUserId` VARCHAR(191) NULL;

UPDATE `Tenant` AS tenant
INNER JOIN `Membership` AS membership
  ON membership.`tenantId` = tenant.`id`
  AND membership.`role` = 'OWNER'
INNER JOIN (
  SELECT `tenantId`
  FROM `Membership`
  WHERE `role` = 'OWNER'
  GROUP BY `tenantId`
  HAVING COUNT(*) = 1
) AS single_tenant_owner
  ON single_tenant_owner.`tenantId` = membership.`tenantId`
INNER JOIN (
  SELECT `userId`
  FROM `Membership`
  WHERE `role` = 'OWNER'
  GROUP BY `userId`
  HAVING COUNT(*) = 1
) AS single_owned_tenant
  ON single_owned_tenant.`userId` = membership.`userId`
SET tenant.`primaryOwnerUserId` = membership.`userId`;

CREATE UNIQUE INDEX `Tenant_primaryOwnerUserId_key` ON `Tenant`(`primaryOwnerUserId`);

ALTER TABLE `Tenant`
  ADD CONSTRAINT `Tenant_primaryOwnerUserId_fkey`
  FOREIGN KEY (`primaryOwnerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
