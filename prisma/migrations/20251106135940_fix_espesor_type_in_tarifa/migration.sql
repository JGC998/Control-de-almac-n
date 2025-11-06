/*
  Warnings:

  - You are about to alter the column `espesor` on the `TarifaMaterial` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TarifaMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material" TEXT NOT NULL,
    "espesor" REAL NOT NULL,
    "precio" REAL NOT NULL,
    "peso" REAL NOT NULL
);
INSERT INTO "new_TarifaMaterial" ("espesor", "id", "material", "peso", "precio") SELECT "espesor", "id", "material", "peso", "precio" FROM "TarifaMaterial";
DROP TABLE "TarifaMaterial";
ALTER TABLE "new_TarifaMaterial" RENAME TO "TarifaMaterial";
CREATE UNIQUE INDEX "TarifaMaterial_material_espesor_key" ON "TarifaMaterial"("material", "espesor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
