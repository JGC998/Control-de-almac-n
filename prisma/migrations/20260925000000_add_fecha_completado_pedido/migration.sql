-- AddColumn fechaCompletado to Pedido
ALTER TABLE `Pedido` ADD COLUMN `fechaCompletado` DATETIME(3) NULL;

-- Index for stats queries
CREATE INDEX `Pedido_fechaCompletado_idx` ON `Pedido`(`fechaCompletado`);
