-- CreateTable
CREATE TABLE "Factura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "numeroComprobante" INTEGER,
    "concepto" INTEGER NOT NULL DEFAULT 1,
    "tipoDocumento" INTEGER NOT NULL DEFAULT 99,
    "numeroDocumento" TEXT NOT NULL DEFAULT '0',
    "importeNeto" REAL NOT NULL,
    "importeIVA" REAL NOT NULL,
    "importeTotal" REAL NOT NULL,
    "cae" TEXT,
    "vencimientoCAE" TEXT,
    "resultadoArca" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Factura_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Factura_pedidoId_key" ON "Factura"("pedidoId");
