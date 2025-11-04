/*
  Warnings:

  - You are about to drop the column `descripcion` on the `BobinaPedido` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PedidoProveedor" ADD COLUMN "notas" TEXT;

-- CreateTable
CREATE TABLE "ReferenciaBobina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BobinaPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ancho" REAL,
    "largo" REAL,
    "espesor" REAL,
    "precioMetro" REAL NOT NULL,
    "costoFinalMetro" REAL,
    "referenciaId" TEXT,
    "pedidoId" TEXT NOT NULL,
    CONSTRAINT "BobinaPedido_referenciaId_fkey" FOREIGN KEY ("referenciaId") REFERENCES "ReferenciaBobina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BobinaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BobinaPedido" ("ancho", "costoFinalMetro", "espesor", "id", "largo", "pedidoId", "precioMetro") SELECT "ancho", "costoFinalMetro", "espesor", "id", "largo", "pedidoId", "precioMetro" FROM "BobinaPedido";
DROP TABLE "BobinaPedido";
ALTER TABLE "new_BobinaPedido" RENAME TO "BobinaPedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReferenciaBobina_nombre_key" ON "ReferenciaBobina"("nombre");
