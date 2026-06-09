-- Naviera del contenedor para mejorar el tracking en Ship24
ALTER TABLE `ImportacionContenedor`
  ADD COLUMN `courierCode` VARCHAR(50) NULL;
