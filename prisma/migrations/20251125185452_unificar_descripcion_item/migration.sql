/*
  Warnings:

  - You are about to drop the column `description` on the `PresupuestoItem` table. All the data in the column will be lost.
  - Added the required column `descripcion` to the `PresupuestoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PresupuestoItem" DROP COLUMN "description",
ADD COLUMN     "descripcion" TEXT NOT NULL;
