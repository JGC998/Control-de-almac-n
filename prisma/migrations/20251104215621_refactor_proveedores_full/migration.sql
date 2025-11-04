/*
  Warnings:

  - You are about to drop the column `longitud` on the `BobinaPedido` table. All the data in the column will be lost.
  - You are about to alter the column `espesor` on the `BobinaPedido` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.
  - You are about to drop the column `proveedor` on the `PedidoProveedor` table. All the data in the column will be lost.
  - You are about to alter the column `espesor` on the `Stock` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.
  - A unique constraint covering the columns `[nombre]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `proveedorId` to the `PedidoProveedor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo` to the `PedidoProveedor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BobinaPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT,
    "ancho" REAL,
    "largo" REAL,
    "espesor" REAL,
    "precioMetro" REAL NOT NULL,
    "costoFinalMetro" REAL,
    "pedidoId" TEXT NOT NULL,
    CONSTRAINT "BobinaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BobinaPedido" ("ancho", "espesor", "id", "pedidoId", "precioMetro") SELECT "ancho", "espesor", "id", "pedidoId", "precioMetro" FROM "BobinaPedido";
DROP TABLE "BobinaPedido";
ALTER TABLE "new_BobinaPedido" RENAME TO "BobinaPedido";
CREATE TABLE "new_PedidoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tasaCambio" REAL DEFAULT 1,
    "gastosTotales" REAL DEFAULT 0,
    "proveedorId" TEXT NOT NULL,
    CONSTRAINT "PedidoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PedidoProveedor" ("estado", "fecha", "id", "material") SELECT "estado", "fecha", "id", "material" FROM "PedidoProveedor";
DROP TABLE "PedidoProveedor";
ALTER TABLE "new_PedidoProveedor" RENAME TO "PedidoProveedor";
CREATE TABLE "new_Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material" TEXT NOT NULL,
    "espesor" REAL,
    "metrosDisponibles" REAL NOT NULL,
    "proveedor" TEXT,
    "ubicacion" TEXT,
    "fechaEntrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costoMetro" REAL
);
INSERT INTO "new_Stock" ("espesor", "fechaEntrada", "id", "material", "metrosDisponibles", "proveedor", "ubicacion") SELECT "espesor", "fechaEntrada", "id", "material", "metrosDisponibles", "proveedor", "ubicacion" FROM "Stock";
DROP TABLE "Stock";
ALTER TABLE "new_Stock" RENAME TO "Stock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");
