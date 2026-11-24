-- Additive only: anuncios para personas puntuales (null = todas).
ALTER TABLE `Announcement` ADD COLUMN `targetUserIds` JSON NULL;
