/*
  Warnings:

  - The primary key for the `Sequence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `year` to the `Sequence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sequence" DROP CONSTRAINT "Sequence_pkey",
ADD COLUMN     "year" INTEGER NOT NULL,
ADD CONSTRAINT "Sequence_pkey" PRIMARY KEY ("name", "year");
