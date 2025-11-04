-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "tier" TEXT
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "modelo" TEXT,
    "espesor" REAL,
    "largo" REAL,
    "ancho" REAL,
    "precioUnitario" REAL NOT NULL,
    "pesoUnitario" REAL NOT NULL,
    "costo" REAL,
    "categoria" TEXT,
    "fabricanteId" TEXT,
    "materialId" TEXT,
    CONSTRAINT "Producto_fabricanteId_fkey" FOREIGN KEY ("fabricanteId") REFERENCES "Fabricante" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Producto_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fabricante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "notas" TEXT,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "clienteId" TEXT,
    "presupuestoId" TEXT,
    CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "pesoUnitario" REAL NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "notas" TEXT,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "clienteId" TEXT,
    CONSTRAINT "Presupuesto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PresupuestoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "productoId" TEXT,
    CONSTRAINT "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material" TEXT NOT NULL,
    "espesor" TEXT,
    "metrosDisponibles" REAL NOT NULL,
    "proveedor" TEXT,
    "ubicacion" TEXT,
    "fechaEntrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "stockId" TEXT NOT NULL,
    CONSTRAINT "MovimientoStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PedidoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedor" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BobinaPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "precioMetro" REAL NOT NULL,
    "longitud" REAL NOT NULL,
    "ancho" REAL NOT NULL,
    "espesor" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    CONSTRAINT "BobinaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TarifaMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material" TEXT NOT NULL,
    "espesor" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "peso" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ReglaMargen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ReglaDescuento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "tierCliente" TEXT,
    "descuento" REAL NOT NULL,
    "fechaInicio" DATETIME,
    "fechaFin" DATETIME
);

-- CreateTable
CREATE TABLE "DescuentoTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cantidadMinima" INTEGER NOT NULL,
    "descuento" REAL NOT NULL,
    "reglaId" TEXT NOT NULL,
    CONSTRAINT "DescuentoTier_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaDescuento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrecioEspecial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descripcion" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    CONSTRAINT "PrecioEspecial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrecioEspecial_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Fabricante_nombre_key" ON "Fabricante"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Material_nombre_key" ON "Material"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_presupuestoId_key" ON "Pedido"("presupuestoId");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_numero_key" ON "Presupuesto"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaMaterial_material_espesor_key" ON "TarifaMaterial"("material", "espesor");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioEspecial_clienteId_productoId_key" ON "PrecioEspecial"("clienteId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");
