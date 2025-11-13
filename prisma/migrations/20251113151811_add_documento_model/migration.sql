-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "descripcion" TEXT,
    "rutaArchivo" TEXT NOT NULL,
    "version" TEXT,
    "fechaSubida" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT,
    "maquinaUbicacion" TEXT,
    CONSTRAINT "Documento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Documento_referencia_version_key" ON "Documento"("referencia", "version");
