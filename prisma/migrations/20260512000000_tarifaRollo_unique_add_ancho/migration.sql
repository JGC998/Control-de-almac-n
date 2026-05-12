-- Ampliar unique constraint de TarifaRollo para incluir ancho
-- Permite distintos rollos del mismo material+espesor+color pero diferente ancho

ALTER TABLE `TarifaRollo` DROP INDEX `TarifaRollo_material_espesor_color_key`;
CREATE UNIQUE INDEX `TarifaRollo_material_espesor_color_ancho_key` ON `TarifaRollo`(`material`, `espesor`, `color`, `ancho`);
