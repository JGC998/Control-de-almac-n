-- T-56 + T-62: Añadir trazabilidad a ImportacionContenedor
-- Proveedor, nº factura, nº contenedor, estado, fechas

ALTER TABLE `ImportacionContenedor`
  ADD COLUMN `proveedorId`   VARCHAR(191) NULL,
  ADD COLUMN `numFactura`    VARCHAR(191) NULL,
  ADD COLUMN `numContenedor` VARCHAR(191) NULL,
  ADD COLUMN `estado`        VARCHAR(191) NOT NULL DEFAULT 'RECIBIDO',
  ADD COLUMN `fechaPedido`   DATETIME(3)  NULL,
  ADD COLUMN `fechaLlegada`  DATETIME(3)  NULL;

-- Índice para búsquedas por proveedor
CREATE INDEX `ImportacionContenedor_proveedorId_idx`
  ON `ImportacionContenedor`(`proveedorId`);

-- Foreign key hacia Proveedor (nullable, SetNull al borrar proveedor)
ALTER TABLE `ImportacionContenedor`
  ADD CONSTRAINT `ImportacionContenedor_proveedorId_fkey`
  FOREIGN KEY (`proveedorId`) REFERENCES `Proveedor`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
