-- Additive only: notas internas del equipo sobre cada cliente.
CREATE TABLE `TenantAdminNote` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `done` BOOLEAN NOT NULL DEFAULT false,
    `authorUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantAdminNote_tenantId_done_createdAt_idx`(`tenantId`, `done`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
