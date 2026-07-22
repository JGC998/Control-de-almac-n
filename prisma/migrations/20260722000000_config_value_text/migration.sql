-- Config.value: ampliar de varchar(191) a TEXT para soportar blobs JSON largos (nomenclatura, etc.)
ALTER TABLE `Config` MODIFY `value` TEXT NOT NULL;
