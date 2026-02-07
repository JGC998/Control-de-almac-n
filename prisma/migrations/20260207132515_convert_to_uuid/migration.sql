/*
  Warnings:

  - The primary key for the `Producto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `categoria` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the `Producto_Old` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Documento" DROP CONSTRAINT "Documento_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoItem" DROP CONSTRAINT "PedidoItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PresupuestoItem" DROP CONSTRAINT "PresupuestoItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Producto_Old" DROP CONSTRAINT "Producto_Old_clienteId_fkey";

-- DropIndex
DROP INDEX "Producto_categoria_idx";

-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "maquinaUbicacion" TEXT,
ALTER COLUMN "productoId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PedidoItem" ALTER COLUMN "productoId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PresupuestoItem" ALTER COLUMN "productoId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_pkey",
DROP COLUMN "categoria",
DROP COLUMN "descripcion",
DROP COLUMN "precio",
DROP COLUMN "stock",
ADD COLUMN     "ancho" DOUBLE PRECISION,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "costo" DOUBLE PRECISION,
ADD COLUMN     "espesor" DOUBLE PRECISION,
ADD COLUMN     "fabricanteId" TEXT,
ADD COLUMN     "largo" DOUBLE PRECISION,
ADD COLUMN     "materialId" TEXT,
ADD COLUMN     "pesoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "precioUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "precioVentaFab" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "precioVentaFin" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "precioVentaInt" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "referencia_fab" TEXT,
ADD COLUMN     "tieneTroquel" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Producto_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Producto_id_seq";

-- DropTable
DROP TABLE "Producto_Old";

-- CreateIndex
CREATE INDEX "Producto_fabricanteId_idx" ON "Producto"("fabricanteId");

-- CreateIndex
CREATE INDEX "Producto_materialId_idx" ON "Producto"("materialId");

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_fabricanteId_fkey" FOREIGN KEY ("fabricanteId") REFERENCES "Fabricante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
