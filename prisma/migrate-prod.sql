-- =============================================================
-- MIGRACIÓN PRODUCCIÓN MySQL — Cambios de schema (DB-01 a DB-09)
-- Ejecutar en orden. Requiere MySQL 8.0+.
-- Hacer un dump de backup ANTES de ejecutar.
-- =============================================================

-- ─── DB-01: Renombrar Stock.proveedor → Stock.proveedorId ────────────────────
-- IMPORTANTE: hacer esto ANTES del deploy del código nuevo
ALTER TABLE `Stock` DROP FOREIGN KEY IF EXISTS `Stock_proveedor_fkey`;
ALTER TABLE `Stock` DROP INDEX IF EXISTS `Stock_proveedor_idx`;
ALTER TABLE `Stock` RENAME COLUMN `proveedor` TO `proveedorId`;
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_proveedorId_fkey`
  FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Stock_proveedorId_idx` ON `Stock`(`proveedorId`);

-- ─── DB-02: Eliminar Cliente.categoria (columna duplicada de tier) ────────────
ALTER TABLE `Cliente` DROP COLUMN IF EXISTS `categoria`;

-- ─── DB-03: Corregir default de ImportacionContenedor.estado ─────────────────
ALTER TABLE `ImportacionContenedor`
  MODIFY COLUMN `estado` VARCHAR(191) NOT NULL DEFAULT 'BORRADOR';

-- ─── DB-04: BobinaPedido.referenciaId con onDelete: SetNull ──────────────────
ALTER TABLE `BobinaPedido` DROP FOREIGN KEY IF EXISTS `BobinaPedido_referenciaId_fkey`;
ALTER TABLE `BobinaPedido` ADD CONSTRAINT `BobinaPedido_referenciaId_fkey`
  FOREIGN KEY (`referenciaId`) REFERENCES `ReferenciaBobina`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── DB-05: FK onDelete explícito — documento chain ──────────────────────────

-- Pedido
ALTER TABLE `Pedido` DROP FOREIGN KEY IF EXISTS `Pedido_clienteId_fkey`;
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_clienteId_fkey`
  FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Pedido` DROP FOREIGN KEY IF EXISTS `Pedido_presupuestoId_fkey`;
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_presupuestoId_fkey`
  FOREIGN KEY (`presupuestoId`) REFERENCES `Presupuesto`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Albaran
ALTER TABLE `Albaran` DROP FOREIGN KEY IF EXISTS `Albaran_clienteId_fkey`;
ALTER TABLE `Albaran` ADD CONSTRAINT `Albaran_clienteId_fkey`
  FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Albaran` DROP FOREIGN KEY IF EXISTS `Albaran_pedidoId_fkey`;
ALTER TABLE `Albaran` ADD CONSTRAINT `Albaran_pedidoId_fkey`
  FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Factura
ALTER TABLE `Factura` DROP FOREIGN KEY IF EXISTS `Factura_clienteId_fkey`;
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_clienteId_fkey`
  FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Factura` DROP FOREIGN KEY IF EXISTS `Factura_albaranId_fkey`;
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_albaranId_fkey`
  FOREIGN KEY (`albaranId`) REFERENCES `Albaran`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Factura` DROP FOREIGN KEY IF EXISTS `Factura_pedidoId_fkey`;
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_pedidoId_fkey`
  FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Factura` DROP FOREIGN KEY IF EXISTS `Factura_facturaOriginalId_fkey`;
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_facturaOriginalId_fkey`
  FOREIGN KEY (`facturaOriginalId`) REFERENCES `Factura`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Presupuesto
ALTER TABLE `Presupuesto` DROP FOREIGN KEY IF EXISTS `Presupuesto_clienteId_fkey`;
ALTER TABLE `Presupuesto` ADD CONSTRAINT `Presupuesto_clienteId_fkey`
  FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PedidoProveedor
ALTER TABLE `PedidoProveedor` DROP FOREIGN KEY IF EXISTS `PedidoProveedor_proveedorId_fkey`;
ALTER TABLE `PedidoProveedor` ADD CONSTRAINT `PedidoProveedor_proveedorId_fkey`
  FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── DB-06 + DB-09: Índices faltantes ────────────────────────────────────────

-- Albaran
CREATE INDEX `Albaran_clienteId_idx` ON `Albaran`(`clienteId`);
CREATE INDEX `Albaran_pedidoId_idx`  ON `Albaran`(`pedidoId`);

-- Factura
CREATE INDEX `Factura_clienteId_idx` ON `Factura`(`clienteId`);
CREATE INDEX `Factura_pedidoId_idx`  ON `Factura`(`pedidoId`);

-- FacturaItem
CREATE INDEX `FacturaItem_facturaId_idx`   ON `FacturaItem`(`facturaId`);
CREATE INDEX `FacturaItem_productoId_idx`  ON `FacturaItem`(`productoId`);

-- AlbaranItem
CREATE INDEX `AlbaranItem_albaranId_idx`   ON `AlbaranItem`(`albaranId`);
CREATE INDEX `AlbaranItem_productoId_idx`  ON `AlbaranItem`(`productoId`);

-- PedidoProveedor
CREATE INDEX `PedidoProveedor_proveedorId_idx` ON `PedidoProveedor`(`proveedorId`);
CREATE INDEX `PedidoProveedor_estado_idx`      ON `PedidoProveedor`(`estado`);
CREATE INDEX `PedidoProveedor_fecha_idx`       ON `PedidoProveedor`(`fecha`);

-- Documento
CREATE INDEX `Documento_productoId_idx` ON `Documento`(`productoId`);

-- ImportacionContenedor
CREATE INDEX `ImportacionContenedor_estado_idx`        ON `ImportacionContenedor`(`estado`);
CREATE INDEX `ImportacionContenedor_trackingActivo_idx` ON `ImportacionContenedor`(`trackingActivo`);

-- ArticuloSimple
CREATE INDEX `ArticuloSimple_categoria_idx` ON `ArticuloSimple`(`categoria`);
CREATE INDEX `ArticuloSimple_activo_idx`    ON `ArticuloSimple`(`activo`);

-- Notificacion
CREATE INDEX `Notificacion_leida_idx`    ON `Notificacion`(`leida`);
CREATE INDEX `Notificacion_creadaEn_idx` ON `Notificacion`(`creadaEn`);

-- ─── DB-07: Unicidad Grapa y ModeloGrapa ─────────────────────────────────────
-- OJO: fallará si hay datos duplicados — verificar antes con SELECT
-- SELECT nombre, COUNT(*) FROM Grapa GROUP BY nombre HAVING COUNT(*) > 1;
-- SELECT tipo, espesorDesde, COUNT(*) FROM ModeloGrapa GROUP BY tipo, espesorDesde HAVING COUNT(*) > 1;
ALTER TABLE `Grapa`       ADD UNIQUE INDEX `Grapa_nombre_key`                   (`nombre`);
ALTER TABLE `ModeloGrapa` ADD UNIQUE INDEX `ModeloGrapa_tipo_espesorDesde_key`  (`tipo`, `espesorDesde`);

-- ─── DB-08: Unicidad Producto (nombre + referencia_fab) ──────────────────────
-- OJO: fallará si hay productos duplicados — verificar antes con:
-- SELECT nombre, referencia_fab, COUNT(*) FROM Producto GROUP BY nombre, referencia_fab HAVING COUNT(*) > 1;
ALTER TABLE `Producto` ADD UNIQUE INDEX `Producto_nombre_referencia_fab_key` (`nombre`, `referencia_fab`);

-- =============================================================
-- FIN — después de esto, hacer deploy del código y
-- ejecutar: npx prisma generate --schema=prisma/schema.prisma
-- =============================================================
