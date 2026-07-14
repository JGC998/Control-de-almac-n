-- ============================================================
-- Migración: Familias y Subfamilias de catálogo
-- Ejecutar en producción (MySQL) después de deploy
-- ============================================================

-- Crear tabla Familia
CREATE TABLE IF NOT EXISTS `Familia` (
  `id`          VARCHAR(191) NOT NULL,
  `nombre`      VARCHAR(191) NOT NULL,
  `color`       VARCHAR(191) NULL,
  `descripcion` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Familia_nombre_key` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear tabla Subfamilia
CREATE TABLE IF NOT EXISTS `Subfamilia` (
  `id`        VARCHAR(191) NOT NULL,
  `nombre`    VARCHAR(191) NOT NULL,
  `familiaId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Subfamilia_nombre_familiaId_key` (`nombre`, `familiaId`),
  INDEX `Subfamilia_familiaId_idx` (`familiaId`),
  CONSTRAINT `Subfamilia_familiaId_fkey`
    FOREIGN KEY (`familiaId`) REFERENCES `Familia` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Añadir subfamiliaId a Producto
ALTER TABLE `Producto`
  ADD COLUMN IF NOT EXISTS `subfamiliaId` VARCHAR(191) NULL;

ALTER TABLE `Producto`
  ADD INDEX IF NOT EXISTS `Producto_subfamiliaId_idx` (`subfamiliaId`);

ALTER TABLE `Producto`
  ADD CONSTRAINT IF NOT EXISTS `Producto_subfamiliaId_fkey`
    FOREIGN KEY (`subfamiliaId`) REFERENCES `Subfamilia` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Añadir subfamiliaId a ArticuloSimple
ALTER TABLE `ArticuloSimple`
  ADD COLUMN IF NOT EXISTS `subfamiliaId` VARCHAR(191) NULL;

ALTER TABLE `ArticuloSimple`
  ADD INDEX IF NOT EXISTS `ArticuloSimple_subfamiliaId_idx` (`subfamiliaId`);

ALTER TABLE `ArticuloSimple`
  ADD CONSTRAINT IF NOT EXISTS `ArticuloSimple_subfamiliaId_fkey`
    FOREIGN KEY (`subfamiliaId`) REFERENCES `Subfamilia` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
