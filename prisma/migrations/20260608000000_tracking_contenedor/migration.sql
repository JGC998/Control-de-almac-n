-- Tracking automático de contenedor (Ship24 + CallMeBot)
ALTER TABLE `ImportacionContenedor`
  ADD COLUMN `blNumber`              VARCHAR(200)  NULL,
  ADD COLUMN `trackingActivo`        BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN `ultimoEvento`          TEXT          NULL,
  ADD COLUMN `ultimoEstadoTracking`  VARCHAR(100)  NULL,
  ADD COLUMN `ultimoTrackingCheck`   DATETIME(3)   NULL,
  ADD COLUMN `etaEstimada`           DATETIME(3)   NULL;
