-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PresupuestoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "pesoUnitario" REAL NOT NULL DEFAULT 0,
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
