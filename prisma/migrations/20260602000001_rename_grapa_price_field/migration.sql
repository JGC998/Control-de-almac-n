-- Rename precioMetroLineal → precioPor100mm in ModeloGrapa
-- Also converts existing values: €/metro ÷ 10 = €/100mm
ALTER TABLE `ModeloGrapa`
  CHANGE `precioMetroLineal` `precioPor100mm` DOUBLE NOT NULL DEFAULT 0;

-- Convert existing values if any (1 €/m = 0.10 €/100mm)
UPDATE `ModeloGrapa` SET `precioPor100mm` = `precioPor100mm` / 10 WHERE `precioPor100mm` > 0;
