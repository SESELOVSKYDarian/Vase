-- Additive only: team seat limit per account and a profile photo per user.
ALTER TABLE `TenantSubscription` ADD COLUMN `teamMemberLimit` INTEGER NOT NULL DEFAULT 3;

ALTER TABLE `User` ADD COLUMN `avatarUrl` TEXT NULL;
