ALTER TABLE `TarifaMaterial` ADD COLUMN `lonas` INTEGER NULL;

DROP INDEX `TarifaMaterial_material_espesor_color_key` ON `TarifaMaterial`;

CREATE UNIQUE INDEX `TarifaMaterial_material_espesor_color_lonas_key` ON `TarifaMaterial`(`material`, `espesor`, `color`, `lonas`);
