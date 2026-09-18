-- Migration: add stockMetros and stockMinimo to TarifaRollo
ALTER TABLE `TarifaRollo` ADD COLUMN `stockMetros` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `TarifaRollo` ADD COLUMN `stockMinimo` DOUBLE NULL;
