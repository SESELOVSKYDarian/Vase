-- Additive only: marca cuentas de prueba internas (todos los productos, la prueba nunca vence).
ALTER TABLE `TenantSubscription` ADD COLUMN `isTestAccount` BOOLEAN NOT NULL DEFAULT false;
