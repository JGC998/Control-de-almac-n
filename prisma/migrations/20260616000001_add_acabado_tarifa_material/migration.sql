ALTER TABLE `TarifaMaterial` ADD COLUMN `acabado` VARCHAR(191) NULL;

DROP INDEX `TarifaMaterial_material_espesor_color_lonas_key` ON `TarifaMaterial`;

CREATE UNIQUE INDEX `TarifaMaterial_material_espesor_color_lonas_acabado_key` ON `TarifaMaterial`(`material`, `espesor`, `color`, `lonas`, `acabado`);
