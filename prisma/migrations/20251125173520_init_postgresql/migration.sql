-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "tier" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "referencia_fab" TEXT,
    "espesor" DOUBLE PRECISION,
    "largo" DOUBLE PRECISION,
    "ancho" DOUBLE PRECISION,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "pesoUnitario" DOUBLE PRECISION NOT NULL,
    "costo" DOUBLE PRECISION,
    "tieneTroquel" BOOLEAN DEFAULT false,
    "clienteId" TEXT,
    "fabricanteId" TEXT,
    "materialId" TEXT,
    "precioVentaFab" DOUBLE PRECISION,
    "precioVentaInt" DOUBLE PRECISION,
    "precioVentaFin" DOUBLE PRECISION,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fabricante" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Fabricante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "notas" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "clienteId" TEXT,
    "presupuestoId" TEXT,
    "marginId" TEXT,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "pesoUnitario" DOUBLE PRECISION NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "notas" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "clienteId" TEXT,
    "marginId" TEXT,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "pesoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presupuestoId" TEXT NOT NULL,
    "productoId" TEXT,

    CONSTRAINT "PresupuestoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "espesor" DOUBLE PRECISION,
    "metrosDisponibles" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "ubicacion" TEXT,
    "fechaEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costoMetro" DOUBLE PRECISION,
    "stockMinimo" DOUBLE PRECISION,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "stockId" TEXT,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoProveedor" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "notas" TEXT,
    "numeroContenedor" TEXT,
    "numeroFactura" TEXT,
    "naviera" TEXT,
    "fechaLlegadaEstimada" TIMESTAMP(3),
    "tasaCambio" DOUBLE PRECISION DEFAULT 1,
    "gastosTotales" DOUBLE PRECISION DEFAULT 0,
    "proveedorId" TEXT NOT NULL,

    CONSTRAINT "PedidoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BobinaPedido" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "ancho" DOUBLE PRECISION,
    "largo" DOUBLE PRECISION,
    "espesor" DOUBLE PRECISION,
    "precioMetro" DOUBLE PRECISION NOT NULL,
    "color" TEXT,
    "costoFinalMetro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referenciaId" TEXT,
    "pedidoId" TEXT NOT NULL,

    CONSTRAINT "BobinaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaMaterial" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "espesor" DOUBLE PRECISION NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TarifaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenciaBobina" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ancho" DOUBLE PRECISION,
    "lonas" INTEGER,
    "pesoPorMetroLineal" DOUBLE PRECISION,

    CONSTRAINT "ReferenciaBobina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaMargen" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "multiplicador" DOUBLE PRECISION NOT NULL,
    "gastoFijo" DOUBLE PRECISION,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT DEFAULT 'General',
    "tipo_categoria" TEXT,
    "tierCliente" TEXT,

    CONSTRAINT "ReglaMargen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaDescuento" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "tierCliente" TEXT,
    "descuento" DOUBLE PRECISION NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "ReglaDescuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescuentoTier" (
    "id" TEXT NOT NULL,
    "cantidadMinima" INTEGER NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL,
    "reglaId" TEXT NOT NULL,

    CONSTRAINT "DescuentoTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioEspecial" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "PrecioEspecial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "descripcion" TEXT,
    "rutaArchivo" TEXT NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT,
    "maquinaUbicacion" TEXT,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");

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
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaMaterial_material_espesor_key" ON "TarifaMaterial"("material", "espesor");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenciaBobina_nombre_ancho_lonas_key" ON "ReferenciaBobina"("nombre", "ancho", "lonas");

-- CreateIndex
CREATE UNIQUE INDEX "ReglaMargen_base_key" ON "ReglaMargen"("base");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioEspecial_clienteId_productoId_key" ON "PrecioEspecial"("clienteId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_referencia_rutaArchivo_key" ON "Documento"("referencia", "rutaArchivo");

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_fabricanteId_fkey" FOREIGN KEY ("fabricanteId") REFERENCES "Fabricante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoProveedor" ADD CONSTRAINT "PedidoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobinaPedido" ADD CONSTRAINT "BobinaPedido_referenciaId_fkey" FOREIGN KEY ("referenciaId") REFERENCES "ReferenciaBobina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobinaPedido" ADD CONSTRAINT "BobinaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoProveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescuentoTier" ADD CONSTRAINT "DescuentoTier_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaDescuento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioEspecial" ADD CONSTRAINT "PrecioEspecial_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioEspecial" ADD CONSTRAINT "PrecioEspecial_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
