-- CreateTable
CREATE TABLE `TarifaVentaHistorial` (
    `id` VARCHAR(191) NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `espesor` DOUBLE NOT NULL,
    `precio` DOUBLE NOT NULL,
    `color` VARCHAR(191) NULL,
    `lonas` INTEGER NULL,
    `acabado` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TarifaVentaHistorial_material_espesor_idx`(`material`, `espesor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
