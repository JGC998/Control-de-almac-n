-- Migración: añadir precioVenta y unidadesVendidas a Producto
-- Ejecutar en producción (MySQL)

ALTER TABLE `Producto`
  ADD COLUMN `precioVenta` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `unidadesVendidas` INT NOT NULL DEFAULT 0;

-- Inicializar precioVenta con el valor actual de precioUnitario
UPDATE `Producto` SET `precioVenta` = `precioUnitario`;
