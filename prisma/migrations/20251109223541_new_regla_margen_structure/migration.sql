/*
  Warnings:

  - You are about to drop the column `categoria` on the `ReglaMargen` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `ReglaMargen` table. All the data in the column will be lost.
  - Added the required column `base` to the `ReglaMargen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `multiplicador` to the `ReglaMargen` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReglaMargen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL,
    "multiplicador" REAL NOT NULL,
    "gastoFijo" REAL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT DEFAULT 'General',
    "tipo_categoria" TEXT
);
INSERT INTO "new_ReglaMargen" ("descripcion", "id", "tipo") SELECT "descripcion", "id", "tipo" FROM "ReglaMargen";
DROP TABLE "ReglaMargen";
ALTER TABLE "new_ReglaMargen" RENAME TO "ReglaMargen";
CREATE UNIQUE INDEX "ReglaMargen_base_key" ON "ReglaMargen"("base");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
