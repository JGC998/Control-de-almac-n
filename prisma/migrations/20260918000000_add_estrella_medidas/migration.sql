-- CreateTable
CREATE TABLE `EstrellaMedida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` VARCHAR(191) NOT NULL,
    `ancho` DOUBLE NOT NULL,
    `largo` DOUBLE NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EstrellaMedida_productoId_idx`(`productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EstrellaMedida` ADD CONSTRAINT `EstrellaMedida_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
