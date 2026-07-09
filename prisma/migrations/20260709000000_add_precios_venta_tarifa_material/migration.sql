-- AlterTable: añade columna preciosVenta (JSON nullable) a TarifaMaterial
-- Almacena precios de venta manuales por margen: { "FABRICACION": 19.43, ... }
ALTER TABLE `TarifaMaterial` ADD COLUMN `preciosVenta` JSON NULL;
