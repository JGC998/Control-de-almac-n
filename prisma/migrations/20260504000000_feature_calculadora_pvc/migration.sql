-- ============================================================
-- Migration: feature/calculadora-pvc-v1 → main
-- Date: 2026-05-04
-- ============================================================
-- CAMBIOS DESTRUCTIVOS (se pierden datos si existen):
--   · Se eliminan tablas: ReglaDescuento, DescuentoTier, PrecioEspecial
--   · Se eliminan columnas: Stock.ubicacion, Stock.fechaEntrada,
--     Stock.stockMinimo, Stock.metrosInicialesPorBobina
--   · Se elimina columna: MovimientoStock.referencia
--   · Se eliminan columnas: BobinaPedido.color, BobinaPedido.costoFinalMetro
--   · Se elimina columna: ReglaMargen.tipo_categoria
--   · Se elimina columna: Producto.clienteId
--   · ReferenciaBobina: columna 'nombre' renombrada a 'referencia'
--   · Sequence: PK cambia de (name) a (name, year)
-- ============================================================

-- ------------------------------------------------------------
-- 1. ELIMINAR TABLAS QUE YA NO EXISTEN
--    (en orden para respetar las FKs)
-- ------------------------------------------------------------
ALTER TABLE `DescuentoTier` DROP FOREIGN KEY `DescuentoTier_reglaId_fkey`;
ALTER TABLE `PrecioEspecial` DROP FOREIGN KEY `PrecioEspecial_clienteId_fkey`;
ALTER TABLE `PrecioEspecial` DROP FOREIGN KEY `PrecioEspecial_productoId_fkey`;

DROP TABLE `DescuentoTier`;
DROP TABLE `PrecioEspecial`;
DROP TABLE `ReglaDescuento`;

-- ------------------------------------------------------------
-- 2. Cliente — añadir columna 'categoria' e índice en email
-- ------------------------------------------------------------
ALTER TABLE `Cliente`
    ADD COLUMN `categoria` VARCHAR(191) NULL;

CREATE INDEX `Cliente_email_idx` ON `Cliente`(`email`);

-- ------------------------------------------------------------
-- 3. Producto — quitar clienteId, añadir nuevos campos e índices
-- ------------------------------------------------------------
ALTER TABLE `Producto` DROP FOREIGN KEY `Producto_clienteId_fkey`;
ALTER TABLE `Producto`
    DROP COLUMN `clienteId`,
    ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `actualizado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    MODIFY `precioUnitario` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `pesoUnitario` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `tieneTroquel` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Producto_nombre_idx` ON `Producto`(`nombre`);
CREATE INDEX `Producto_fabricanteId_idx` ON `Producto`(`fabricanteId`);
CREATE INDEX `Producto_materialId_idx` ON `Producto`(`materialId`);

-- ------------------------------------------------------------
-- 4. Pedido — añadir índices de rendimiento
-- ------------------------------------------------------------
CREATE INDEX `Pedido_clienteId_idx` ON `Pedido`(`clienteId`);
CREATE INDEX `Pedido_estado_idx` ON `Pedido`(`estado`);
CREATE INDEX `Pedido_fechaCreacion_idx` ON `Pedido`(`fechaCreacion`);

-- ------------------------------------------------------------
-- 5. PedidoItem — añadir detallesTecnicos, ajustar FK productoId
-- ------------------------------------------------------------
ALTER TABLE `PedidoItem`
    ADD COLUMN `detallesTecnicos` TEXT NULL,
    MODIFY `pesoUnitario` DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE `PedidoItem` DROP FOREIGN KEY `PedidoItem_productoId_fkey`;
ALTER TABLE `PedidoItem`
    ADD CONSTRAINT `PedidoItem_productoId_fkey`
    FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 6. Presupuesto — añadir índices de rendimiento
-- ------------------------------------------------------------
CREATE INDEX `Presupuesto_clienteId_idx` ON `Presupuesto`(`clienteId`);
CREATE INDEX `Presupuesto_estado_idx` ON `Presupuesto`(`estado`);
CREATE INDEX `Presupuesto_fechaCreacion_idx` ON `Presupuesto`(`fechaCreacion`);

-- ------------------------------------------------------------
-- 7. PresupuestoItem — añadir detallesTecnicos, ajustar FK productoId
-- ------------------------------------------------------------
ALTER TABLE `PresupuestoItem`
    ADD COLUMN `detallesTecnicos` TEXT NULL;

ALTER TABLE `PresupuestoItem` DROP FOREIGN KEY `PresupuestoItem_productoId_fkey`;
ALTER TABLE `PresupuestoItem`
    ADD CONSTRAINT `PresupuestoItem_productoId_fkey`
    FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 8. Stock — eliminar columnas obsoletas
-- ------------------------------------------------------------
ALTER TABLE `Stock`
    DROP COLUMN `ubicacion`,
    DROP COLUMN `fechaEntrada`,
    DROP COLUMN `stockMinimo`,
    DROP COLUMN `metrosInicialesPorBobina`;

-- ------------------------------------------------------------
-- 9. MovimientoStock — eliminar columna 'referencia'
-- ------------------------------------------------------------
ALTER TABLE `MovimientoStock`
    DROP COLUMN `referencia`;

-- ------------------------------------------------------------
-- 10. BobinaPedido — eliminar columnas obsoletas
-- ------------------------------------------------------------
ALTER TABLE `BobinaPedido`
    DROP COLUMN `color`,
    DROP COLUMN `costoFinalMetro`,
    MODIFY `precioMetro` DOUBLE NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 11. ReferenciaBobina — renombrar 'nombre'→'referencia',
--     añadir nueva columna 'nombre', cambiar tipo de 'lonas'
-- ------------------------------------------------------------
ALTER TABLE `ReferenciaBobina`
    DROP INDEX `ReferenciaBobina_nombre_ancho_lonas_key`;

-- Renombrar columna nombre → referencia (conserva los datos)
ALTER TABLE `ReferenciaBobina`
    CHANGE `nombre` `referencia` VARCHAR(191) NOT NULL DEFAULT '';

-- Añadir la nueva columna 'nombre' (campo opcional)
ALTER TABLE `ReferenciaBobina`
    ADD COLUMN `nombre` VARCHAR(191) NULL;

-- Cambiar 'lonas' de INT a DOUBLE
ALTER TABLE `ReferenciaBobina`
    MODIFY `lonas` DOUBLE NULL;

-- Recrear índice único con el nombre correcto
CREATE UNIQUE INDEX `ReferenciaBobina_referencia_ancho_lonas_key`
    ON `ReferenciaBobina`(`referencia`, `ancho`, `lonas`);

-- ------------------------------------------------------------
-- 12. ReglaMargen — eliminar columna 'tipo_categoria'
-- ------------------------------------------------------------
ALTER TABLE `ReglaMargen`
    DROP COLUMN `tipo_categoria`;

-- ------------------------------------------------------------
-- 13. TarifaMaterial — añadir 'color', actualizar unique constraint
-- ------------------------------------------------------------
ALTER TABLE `TarifaMaterial`
    ADD COLUMN `color` VARCHAR(191) NULL,
    DROP INDEX `TarifaMaterial_material_espesor_key`;

CREATE UNIQUE INDEX `TarifaMaterial_material_espesor_color_key`
    ON `TarifaMaterial`(`material`, `espesor`, `color`);

-- ------------------------------------------------------------
-- 14. PedidoProveedor — añadir DEFAULT a 'tipo'
-- ------------------------------------------------------------
ALTER TABLE `PedidoProveedor`
    MODIFY `tipo` VARCHAR(191) NOT NULL DEFAULT 'NACIONAL';

-- ------------------------------------------------------------
-- 15. Sequence — añadir columna 'year', cambiar PK a compuesta
-- ------------------------------------------------------------
ALTER TABLE `Sequence`
    ADD COLUMN `year` INTEGER NOT NULL DEFAULT 2026;

ALTER TABLE `Sequence`
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (`name`, `year`);

-- ------------------------------------------------------------
-- 16. CREAR NUEVAS TABLAS
-- ------------------------------------------------------------

-- TarifaRollo
CREATE TABLE `TarifaRollo` (
    `id` VARCHAR(191) NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `espesor` DOUBLE NOT NULL,
    `ancho` DOUBLE NULL,
    `color` VARCHAR(191) NULL,
    `metrajeMinimo` DOUBLE NOT NULL DEFAULT 10,
    `precioBase` DOUBLE NOT NULL,
    `peso` DOUBLE NOT NULL,

    UNIQUE INDEX `TarifaRollo_material_espesor_color_key`(`material`, `espesor`, `color`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AuditLog
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `user` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_idx`(`entity`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Taco
CREATE TABLE `Taco` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `altura` INTEGER NOT NULL,
    `precioMetro` DOUBLE NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Taco_tipo_altura_key`(`tipo`, `altura`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grapa
CREATE TABLE `Grapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `fabricante` VARCHAR(191) NULL,
    `descripcion` VARCHAR(191) NULL,
    `precioMetro` DOUBLE NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- TarifaTransporte
CREATE TABLE `TarifaTransporte` (
    `id` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `codigoPostal` VARCHAR(191) NOT NULL,
    `parcel` DOUBLE NULL,
    `miniQuarter` DOUBLE NULL,
    `miniLight` DOUBLE NULL,
    `quarter` DOUBLE NULL,
    `light` DOUBLE NULL,
    `half` DOUBLE NULL,
    `megaLight` DOUBLE NULL,
    `full` DOUBLE NULL,
    `megaFull` DOUBLE NULL,

    UNIQUE INDEX `TarifaTransporte_provincia_codigoPostal_key`(`provincia`, `codigoPostal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ConfigPaletizado
CREATE TABLE `ConfigPaletizado` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `costePale` DOUBLE NOT NULL,
    `costeFilm` DOUBLE NOT NULL DEFAULT 0.538,
    `costeFleje` DOUBLE NOT NULL DEFAULT 0.183,
    `costePrecinto` DOUBLE NOT NULL DEFAULT 0.0147,

    UNIQUE INDEX `ConfigPaletizado_tipo_key`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- PresupuestoTemplate
CREATE TABLE `PresupuestoTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `items` JSON NOT NULL,
    `marginId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PresupuestoTemplate_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
