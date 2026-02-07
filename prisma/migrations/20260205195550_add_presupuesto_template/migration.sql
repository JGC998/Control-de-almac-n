-- CreateTable
CREATE TABLE "PresupuestoTemplate" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "items" JSONB NOT NULL,
    "marginId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresupuestoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoTemplate_nombre_key" ON "PresupuestoTemplate"("nombre");
