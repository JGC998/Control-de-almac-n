/*
  Warnings:

  - You are about to drop the column `categoria` on the `Cliente` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre,ancho,lonas]` on the table `ReferenciaBobina` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ReferenciaBobina_nombre_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "tier" TEXT
);
INSERT INTO "new_Cliente" ("direccion", "email", "id", "nombre", "telefono") SELECT "direccion", "email", "id", "nombre", "telefono" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReferenciaBobina_nombre_ancho_lonas_key" ON "ReferenciaBobina"("nombre", "ancho", "lonas");
