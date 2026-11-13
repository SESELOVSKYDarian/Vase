-- Additive only: more shared business data (redes, horario, zona horaria, moneda, localidad).
ALTER TABLE `TenantBusinessInfo`
    ADD COLUMN `tiktok` VARCHAR(191) NULL,
    ADD COLUMN `youtube` VARCHAR(191) NULL,
    ADD COLUMN `hours` VARCHAR(191) NULL,
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'ARS';

ALTER TABLE `TenantBillingProfile`
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `postalCode` VARCHAR(191) NULL;
