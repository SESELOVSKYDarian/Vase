-- Una base por app (Labs separada de app para que `prisma db push` de una no toque las tablas de la otra).
CREATE DATABASE IF NOT EXISTS vase_labs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON vase.* TO 'vase'@'%';
GRANT ALL PRIVILEGES ON vase_labs.* TO 'vase'@'%';
-- Prisma necesita crear una base "sombra" temporal para algunos comandos.
GRANT CREATE, DROP ON *.* TO 'vase'@'%';
FLUSH PRIVILEGES;
