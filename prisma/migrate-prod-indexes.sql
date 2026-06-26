-- =============================================================
-- MIGRACIÓN PRODUCCIÓN — Solo índices y constraints únicos
-- Los FK changes (DB-01 a DB-05) ya fueron aplicados.
-- Este script elimina cada índice si existe antes de crearlo.
-- =============================================================

-- ─── Albaran ──────────────────────────────────────────────────
ALTER TABLE `Albaran` DROP INDEX IF EXISTS `Albaran_clienteId_idx`;
ALTER TABLE `Albaran` ADD INDEX `Albaran_clienteId_idx` (`clienteId`);
ALTER TABLE `Albaran` DROP INDEX IF EXISTS `Albaran_pedidoId_idx`;
ALTER TABLE `Albaran` ADD INDEX `Albaran_pedidoId_idx` (`pedidoId`);

-- ─── Factura ──────────────────────────────────────────────────
ALTER TABLE `Factura` DROP INDEX IF EXISTS `Factura_clienteId_idx`;
ALTER TABLE `Factura` ADD INDEX `Factura_clienteId_idx` (`clienteId`);
ALTER TABLE `Factura` DROP INDEX IF EXISTS `Factura_pedidoId_idx`;
ALTER TABLE `Factura` ADD INDEX `Factura_pedidoId_idx` (`pedidoId`);

-- ─── FacturaItem ──────────────────────────────────────────────
ALTER TABLE `FacturaItem` DROP INDEX IF EXISTS `FacturaItem_facturaId_idx`;
ALTER TABLE `FacturaItem` ADD INDEX `FacturaItem_facturaId_idx` (`facturaId`);
ALTER TABLE `FacturaItem` DROP INDEX IF EXISTS `FacturaItem_productoId_idx`;
ALTER TABLE `FacturaItem` ADD INDEX `FacturaItem_productoId_idx` (`productoId`);

-- ─── AlbaranItem ──────────────────────────────────────────────
ALTER TABLE `AlbaranItem` DROP INDEX IF EXISTS `AlbaranItem_albaranId_idx`;
ALTER TABLE `AlbaranItem` ADD INDEX `AlbaranItem_albaranId_idx` (`albaranId`);
ALTER TABLE `AlbaranItem` DROP INDEX IF EXISTS `AlbaranItem_productoId_idx`;
ALTER TABLE `AlbaranItem` ADD INDEX `AlbaranItem_productoId_idx` (`productoId`);

-- ─── PedidoProveedor ──────────────────────────────────────────
ALTER TABLE `PedidoProveedor` DROP INDEX IF EXISTS `PedidoProveedor_proveedorId_idx`;
ALTER TABLE `PedidoProveedor` ADD INDEX `PedidoProveedor_proveedorId_idx` (`proveedorId`);
ALTER TABLE `PedidoProveedor` DROP INDEX IF EXISTS `PedidoProveedor_estado_idx`;
ALTER TABLE `PedidoProveedor` ADD INDEX `PedidoProveedor_estado_idx` (`estado`);
ALTER TABLE `PedidoProveedor` DROP INDEX IF EXISTS `PedidoProveedor_fecha_idx`;
ALTER TABLE `PedidoProveedor` ADD INDEX `PedidoProveedor_fecha_idx` (`fecha`);

-- ─── Documento ────────────────────────────────────────────────
ALTER TABLE `Documento` DROP INDEX IF EXISTS `Documento_productoId_idx`;
ALTER TABLE `Documento` ADD INDEX `Documento_productoId_idx` (`productoId`);

-- ─── ImportacionContenedor ────────────────────────────────────
ALTER TABLE `ImportacionContenedor` DROP INDEX IF EXISTS `ImportacionContenedor_estado_idx`;
ALTER TABLE `ImportacionContenedor` ADD INDEX `ImportacionContenedor_estado_idx` (`estado`);
ALTER TABLE `ImportacionContenedor` DROP INDEX IF EXISTS `ImportacionContenedor_trackingActivo_idx`;
ALTER TABLE `ImportacionContenedor` ADD INDEX `ImportacionContenedor_trackingActivo_idx` (`trackingActivo`);

-- ─── ArticuloSimple ───────────────────────────────────────────
ALTER TABLE `ArticuloSimple` DROP INDEX IF EXISTS `ArticuloSimple_categoria_idx`;
ALTER TABLE `ArticuloSimple` ADD INDEX `ArticuloSimple_categoria_idx` (`categoria`);
ALTER TABLE `ArticuloSimple` DROP INDEX IF EXISTS `ArticuloSimple_activo_idx`;
ALTER TABLE `ArticuloSimple` ADD INDEX `ArticuloSimple_activo_idx` (`activo`);

-- ─── Notificacion ─────────────────────────────────────────────
ALTER TABLE `Notificacion` DROP INDEX IF EXISTS `Notificacion_leida_idx`;
ALTER TABLE `Notificacion` ADD INDEX `Notificacion_leida_idx` (`leida`);
ALTER TABLE `Notificacion` DROP INDEX IF EXISTS `Notificacion_creadaEn_idx`;
ALTER TABLE `Notificacion` ADD INDEX `Notificacion_creadaEn_idx` (`creadaEn`);

-- ─── DB-07: Unicidad Grapa y ModeloGrapa ─────────────────────
-- Verificar antes: SELECT nombre, COUNT(*) FROM Grapa GROUP BY nombre HAVING COUNT(*) > 1;
ALTER TABLE `Grapa` DROP INDEX IF EXISTS `Grapa_nombre_key`;
ALTER TABLE `Grapa` ADD UNIQUE INDEX `Grapa_nombre_key` (`nombre`);

-- Verificar antes: SELECT tipo, espesorDesde, COUNT(*) FROM ModeloGrapa GROUP BY tipo, espesorDesde HAVING COUNT(*) > 1;
ALTER TABLE `ModeloGrapa` DROP INDEX IF EXISTS `ModeloGrapa_tipo_espesorDesde_key`;
ALTER TABLE `ModeloGrapa` ADD UNIQUE INDEX `ModeloGrapa_tipo_espesorDesde_key` (`tipo`, `espesorDesde`);

-- ─── DB-08: Unicidad Producto ─────────────────────────────────
-- Verificar antes: SELECT nombre, referencia_fab, COUNT(*) FROM Producto GROUP BY nombre, referencia_fab HAVING COUNT(*) > 1;
ALTER TABLE `Producto` DROP INDEX IF EXISTS `Producto_nombre_referencia_fab_key`;
ALTER TABLE `Producto` ADD UNIQUE INDEX `Producto_nombre_referencia_fab_key` (`nombre`, `referencia_fab`);
