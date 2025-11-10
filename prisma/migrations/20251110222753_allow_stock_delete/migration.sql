-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MovimientoStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "stockId" TEXT,
    CONSTRAINT "MovimientoStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MovimientoStock" ("cantidad", "fecha", "id", "referencia", "stockId", "tipo") SELECT "cantidad", "fecha", "id", "referencia", "stockId", "tipo" FROM "MovimientoStock";
DROP TABLE "MovimientoStock";
ALTER TABLE "new_MovimientoStock" RENAME TO "MovimientoStock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
