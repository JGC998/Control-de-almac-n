-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BobinaPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
