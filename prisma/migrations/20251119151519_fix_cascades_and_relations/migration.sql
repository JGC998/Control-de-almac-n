-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BobinaPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ancho" REAL,
    "largo" REAL,
    "espesor" REAL,
    "precioMetro" REAL NOT NULL,
    "color" TEXT,
    "costoFinalMetro" REAL NOT NULL DEFAULT 0,
    "referenciaId" TEXT,
    "pedidoId" TEXT NOT NULL,
    CONSTRAINT "BobinaPedido_referenciaId_fkey" FOREIGN KEY ("referenciaId") REFERENCES "ReferenciaBobina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BobinaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProveedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BobinaPedido" ("ancho", "color", "costoFinalMetro", "espesor", "id", "largo", "pedidoId", "precioMetro", "referenciaId") SELECT "ancho", "color", "costoFinalMetro", "espesor", "id", "largo", "pedidoId", "precioMetro", "referenciaId" FROM "BobinaPedido";
DROP TABLE "BobinaPedido";
ALTER TABLE "new_BobinaPedido" RENAME TO "BobinaPedido";
CREATE TABLE "new_DescuentoTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cantidadMinima" INTEGER NOT NULL,
    "descuento" REAL NOT NULL,
    "reglaId" TEXT NOT NULL,
    CONSTRAINT "DescuentoTier_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaDescuento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DescuentoTier" ("cantidadMinima", "descuento", "id", "reglaId") SELECT "cantidadMinima", "descuento", "id", "reglaId" FROM "DescuentoTier";
DROP TABLE "DescuentoTier";
ALTER TABLE "new_DescuentoTier" RENAME TO "DescuentoTier";
CREATE TABLE "new_PedidoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "pesoUnitario" REAL NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PedidoItem" ("descripcion", "id", "pedidoId", "pesoUnitario", "productoId", "quantity", "unitPrice") SELECT "descripcion", "id", "pedidoId", "pesoUnitario", "productoId", "quantity", "unitPrice" FROM "PedidoItem";
DROP TABLE "PedidoItem";
ALTER TABLE "new_PedidoItem" RENAME TO "PedidoItem";
CREATE TABLE "new_PrecioEspecial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    CONSTRAINT "PrecioEspecial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrecioEspecial_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PrecioEspecial" ("clienteId", "descripcion", "id", "precio", "productoId") SELECT "clienteId", "descripcion", "id", "precio", "productoId" FROM "PrecioEspecial";
DROP TABLE "PrecioEspecial";
ALTER TABLE "new_PrecioEspecial" RENAME TO "PrecioEspecial";
CREATE UNIQUE INDEX "PrecioEspecial_clienteId_productoId_key" ON "PrecioEspecial"("clienteId", "productoId");
CREATE TABLE "new_PresupuestoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "productoId" TEXT,
    CONSTRAINT "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PresupuestoItem" ("description", "id", "presupuestoId", "productoId", "quantity", "unitPrice") SELECT "description", "id", "presupuestoId", "productoId", "quantity", "unitPrice" FROM "PresupuestoItem";
DROP TABLE "PresupuestoItem";
ALTER TABLE "new_PresupuestoItem" RENAME TO "PresupuestoItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
