-- CreateTable
CREATE TABLE `TarifaCoste` (
    `id` VARCHAR(191) NOT NULL,
    `material` VARCHAR(191) NOT NULL,
    `espesor` DOUBLE NOT NULL,
    `precio` DOUBLE NOT NULL,
    `peso` DOUBLE NOT NULL DEFAULT 0,
    `color` VARCHAR(191) NULL,
    `lonas` INTEGER NULL,
    `acabado` VARCHAR(191) NULL,
    `actualizadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `importacionId` VARCHAR(191) NULL,

    UNIQUE INDEX `TarifaCoste_material_espesor_color_lonas_acabado_key`(`material`, `espesor`, `color`, `lonas`, `acabado`),
    INDEX `TarifaCoste_material_idx`(`material`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
