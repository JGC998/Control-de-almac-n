-- =============================================================
-- MIGRACIÓN PRODUCCIÓN — Índices v2
-- Solo columnas SIN FK (las FK ya tienen índice automático en MySQL).
-- Los índices de clienteId, pedidoId, facturaId, albaranId, productoId,
-- proveedorId ya fueron creados automáticamente por los FK constraints.
-- =============================================================

-- ─── PedidoProveedor — columnas sin FK ───────────────────────
ALTER TABLE `PedidoProveedor` DROP INDEX IF EXISTS `PedidoProveedor_estado_idx`;
ALTER TABLE `PedidoProveedor` ADD INDEX `PedidoProveedor_estado_idx` (`estado`);
ALTER TABLE `PedidoProveedor` DROP INDEX IF EXISTS `PedidoProveedor_fecha_idx`;
ALTER TABLE `PedidoProveedor` ADD INDEX `PedidoProveedor_fecha_idx` (`fecha`);

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

-- ─── Grapa: unicidad por nombre ───────────────────────────────
ALTER TABLE `Grapa` DROP INDEX IF EXISTS `Grapa_nombre_key`;
ALTER TABLE `Grapa` ADD UNIQUE INDEX `Grapa_nombre_key` (`nombre`);

-- ─── Producto: unicidad por (nombre, referencia_fab) ─────────
ALTER TABLE `Producto` DROP INDEX IF EXISTS `Producto_nombre_referencia_fab_key`;
ALTER TABLE `Producto` ADD UNIQUE INDEX `Producto_nombre_referencia_fab_key` (`nombre`, `referencia_fab`);
