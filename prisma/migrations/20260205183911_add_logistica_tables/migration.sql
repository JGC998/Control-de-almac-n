/*
  Warnings:

  - You are about to drop the column `color` on the `BobinaPedido` table. All the data in the column will be lost.
  - You are about to drop the column `costoFinalMetro` on the `BobinaPedido` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `Documento` table. All the data in the column will be lost.
  - You are about to drop the column `maquinaUbicacion` on the `Documento` table. All the data in the column will be lost.
  - The `productoId` column on the `Documento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `referencia` on the `MovimientoStock` table. All the data in the column will be lost.
  - The `productoId` column on the `PedidoItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `productoId` column on the `PresupuestoItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `fabricanteId` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `precioVentaFab` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `precioVentaFin` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `precioVentaInt` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `tieneTroquel` on the `Producto_Old` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `ReferenciaBobina` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `ReglaMargen` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_categoria` on the `ReglaMargen` table. All the data in the column will be lost.
  - You are about to drop the column `fechaEntrada` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `metrosInicialesPorBobina` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `stockMinimo` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the `DescuentoTier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrecioEspecial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReglaDescuento` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referencia,ancho,lonas]` on the table `ReferenciaBobina` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[material,espesor,color]` on the table `TarifaMaterial` will be added. If there are existing duplicate values, this will fail.
  - Made the column `tasaCambio` on table `PedidoProveedor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gastosTotales` on table `PedidoProveedor` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `referencia` to the `ReferenciaBobina` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DescuentoTier" DROP CONSTRAINT "DescuentoTier_reglaId_fkey";

-- DropForeignKey
ALTER TABLE "Documento" DROP CONSTRAINT "Documento_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoItem" DROP CONSTRAINT "PedidoItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PrecioEspecial" DROP CONSTRAINT "PrecioEspecial_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "PrecioEspecial" DROP CONSTRAINT "PrecioEspecial_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PresupuestoItem" DROP CONSTRAINT "PresupuestoItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Producto_Old" DROP CONSTRAINT "Producto_Old_fabricanteId_fkey";

-- DropForeignKey
ALTER TABLE "Producto_Old" DROP CONSTRAINT "Producto_Old_materialId_fkey";

-- DropIndex
DROP INDEX "ReferenciaBobina_nombre_ancho_lonas_key";

-- DropIndex
DROP INDEX "TarifaMaterial_material_espesor_key";

-- AlterTable
ALTER TABLE "BobinaPedido" DROP COLUMN "color",
DROP COLUMN "costoFinalMetro",
ALTER COLUMN "precioMetro" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "categoria" TEXT;

-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "descripcion",
DROP COLUMN "maquinaUbicacion",
DROP COLUMN "productoId",
ADD COLUMN     "productoId" INTEGER;

-- AlterTable
ALTER TABLE "MovimientoStock" DROP COLUMN "referencia";

-- AlterTable
ALTER TABLE "PedidoItem" ALTER COLUMN "pesoUnitario" SET DEFAULT 0,
DROP COLUMN "productoId",
ADD COLUMN     "productoId" INTEGER;

-- AlterTable
ALTER TABLE "PedidoProveedor" ALTER COLUMN "tipo" SET DEFAULT 'NACIONAL',
ALTER COLUMN "tasaCambio" SET NOT NULL,
ALTER COLUMN "gastosTotales" SET NOT NULL;

-- AlterTable
ALTER TABLE "PresupuestoItem" DROP COLUMN "productoId",
ADD COLUMN     "productoId" INTEGER;

-- AlterTable
ALTER TABLE "Producto_Old" DROP COLUMN "fabricanteId",
DROP COLUMN "materialId",
DROP COLUMN "precioVentaFab",
DROP COLUMN "precioVentaFin",
DROP COLUMN "precioVentaInt",
DROP COLUMN "tieneTroquel";

-- AlterTable
ALTER TABLE "ReferenciaBobina" DROP COLUMN "nombre",
ADD COLUMN     "referencia" TEXT NOT NULL,
ALTER COLUMN "lonas" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ReglaMargen" DROP COLUMN "tipo",
DROP COLUMN "tipo_categoria";

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "fechaEntrada",
DROP COLUMN "metrosInicialesPorBobina",
DROP COLUMN "stockMinimo",
DROP COLUMN "ubicacion";

-- AlterTable
ALTER TABLE "TarifaMaterial" ADD COLUMN     "color" TEXT;

-- DropTable
DROP TABLE "DescuentoTier";

-- DropTable
DROP TABLE "PrecioEspecial";

-- DropTable
DROP TABLE "ReglaDescuento";

-- CreateTable
CREATE TABLE "Taco" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "altura" INTEGER NOT NULL,
    "precioMetro" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaTransporte" (
    "id" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "parcel" DOUBLE PRECISION,
    "miniQuarter" DOUBLE PRECISION,
    "miniLight" DOUBLE PRECISION,
    "quarter" DOUBLE PRECISION,
    "light" DOUBLE PRECISION,
    "half" DOUBLE PRECISION,
    "megaLight" DOUBLE PRECISION,
    "full" DOUBLE PRECISION,
    "megaFull" DOUBLE PRECISION,

    CONSTRAINT "TarifaTransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigPaletizado" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "costePale" DOUBLE PRECISION NOT NULL,
    "costeFilm" DOUBLE PRECISION NOT NULL DEFAULT 0.538,
    "costeFleje" DOUBLE PRECISION NOT NULL DEFAULT 0.183,
    "costePrecinto" DOUBLE PRECISION NOT NULL DEFAULT 0.0147,

    CONSTRAINT "ConfigPaletizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Taco_tipo_altura_key" ON "Taco"("tipo", "altura");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaTransporte_provincia_codigoPostal_key" ON "TarifaTransporte"("provincia", "codigoPostal");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigPaletizado_tipo_key" ON "ConfigPaletizado"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenciaBobina_referencia_ancho_lonas_key" ON "ReferenciaBobina"("referencia", "ancho", "lonas");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaMaterial_material_espesor_color_key" ON "TarifaMaterial"("material", "espesor", "color");

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
