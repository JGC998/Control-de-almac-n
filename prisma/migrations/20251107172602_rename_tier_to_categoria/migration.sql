/*
  Warnings:

  - You are about to drop the column `tier` on the `Cliente` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "categoria" TEXT
);
INSERT INTO "new_Cliente" ("direccion", "email", "id", "nombre", "telefono") SELECT "direccion", "email", "id", "nombre", "telefono" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
