-- CreateIndex
CREATE INDEX "Cliente_email_idx" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "Pedido_fechaCreacion_idx" ON "Pedido"("fechaCreacion");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "Producto_categoria_idx" ON "Producto"("categoria");
