-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" REAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Producto" ("categoria", "createdAt", "descripcion", "disponible", "id", "imagenUrl", "nombre", "precio", "updatedAt") SELECT "categoria", "createdAt", "descripcion", "disponible", "id", "imagenUrl", "nombre", "precio", "updatedAt" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
