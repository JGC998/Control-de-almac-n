-- Índices para PedidoItem (búsquedas frecuentes por pedidoId y productoId)
CREATE INDEX `PedidoItem_pedidoId_idx` ON `PedidoItem`(`pedidoId`);
CREATE INDEX `PedidoItem_productoId_idx` ON `PedidoItem`(`productoId`);

-- Índices para PresupuestoItem (búsquedas frecuentes por presupuestoId y productoId)
CREATE INDEX `PresupuestoItem_presupuestoId_idx` ON `PresupuestoItem`(`presupuestoId`);
CREATE INDEX `PresupuestoItem_productoId_idx` ON `PresupuestoItem`(`productoId`);
