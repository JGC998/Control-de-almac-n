/*
  Warnings:

  - You are about to drop the column `version` on the `Documento` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "descripcion" TEXT,
    "rutaArchivo" TEXT NOT NULL,
    "fechaSubida" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT,
    "maquinaUbicacion" TEXT,
    CONSTRAINT "Documento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Documento" ("descripcion", "fechaSubida", "id", "maquinaUbicacion", "productoId", "referencia", "rutaArchivo", "tipo") SELECT "descripcion", "fechaSubida", "id", "maquinaUbicacion", "productoId", "referencia", "rutaArchivo", "tipo" FROM "Documento";
DROP TABLE "Documento";
ALTER TABLE "new_Documento" RENAME TO "Documento";
CREATE UNIQUE INDEX "Documento_referencia_rutaArchivo_key" ON "Documento"("referencia", "rutaArchivo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
