-- N-05: Stock mínimo configurable — alerta cuando los metros caen por debajo del umbral
ALTER TABLE `Stock`
  ADD COLUMN `stockMinimo` DOUBLE NOT NULL DEFAULT 0;

-- N-04: Fecha del último recordatorio enviado en un presupuesto
ALTER TABLE `Presupuesto`
  ADD COLUMN `ultimoRecordatorio` DATETIME(3) NULL;
