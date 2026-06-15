CREATE TABLE `HistorialPrecioGrapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `modeloGrapaId` INTEGER NOT NULL,
    `precioPor100mmAnterior` DOUBLE NOT NULL,
    `precioPor100mmNuevo` DOUBLE NOT NULL,
    `costePorCaja` DOUBLE NOT NULL,
    `anchoPar` INTEGER NOT NULL,
    `paresPorCaja` INTEGER NOT NULL,
    `importacionId` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistorialPrecioGrapa_modeloGrapaId_idx`(`modeloGrapaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `HistorialPrecioGrapa` ADD CONSTRAINT `HistorialPrecioGrapa_modeloGrapaId_fkey` FOREIGN KEY (`modeloGrapaId`) REFERENCES `ModeloGrapa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
