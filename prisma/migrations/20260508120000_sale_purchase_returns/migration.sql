-- Sale and purchase return documents with line items; journal entry links.

CREATE TABLE `sale_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnNo` VARCHAR(191) NOT NULL,
    `saleId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `refundMethod` VARCHAR(191) NOT NULL,
    `refundedAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sale_returns_returnNo_key`(`returnNo`),
    INDEX `sale_returns_saleId_idx`(`saleId`),
    INDEX `sale_returns_returnDate_idx`(`returnDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sale_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleReturnId` INTEGER NOT NULL,
    `saleItemId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantityKg` DECIMAL(12, 3) NOT NULL,
    `displayUnit` VARCHAR(191) NOT NULL,
    `displayQty` DECIMAL(12, 3) NOT NULL,
    `unitPriceKg` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,

    INDEX `sale_return_items_saleReturnId_idx`(`saleReturnId`),
    INDEX `sale_return_items_saleItemId_idx`(`saleItemId`),
    INDEX `sale_return_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchase_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnNo` VARCHAR(191) NOT NULL,
    `purchaseId` INTEGER NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `returnDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `purchase_returns_returnNo_key`(`returnNo`),
    INDEX `purchase_returns_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_returns_returnDate_idx`(`returnDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchase_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseReturnId` INTEGER NOT NULL,
    `purchaseItemId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantityKg` DECIMAL(12, 3) NOT NULL,
    `displayUnit` VARCHAR(191) NOT NULL,
    `displayQty` DECIMAL(12, 3) NOT NULL,
    `unitCostKg` DECIMAL(12, 2) NOT NULL,
    `totalCost` DECIMAL(14, 2) NOT NULL,

    INDEX `purchase_return_items_purchaseReturnId_idx`(`purchaseReturnId`),
    INDEX `purchase_return_items_purchaseItemId_idx`(`purchaseItemId`),
    INDEX `purchase_return_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `journal_entries`
    ADD COLUMN `saleReturnId` INTEGER NULL,
    ADD COLUMN `purchaseReturnId` INTEGER NULL;

CREATE INDEX `journal_entries_saleReturnId_idx` ON `journal_entries`(`saleReturnId`);
CREATE INDEX `journal_entries_purchaseReturnId_idx` ON `journal_entries`(`purchaseReturnId`);

ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_saleReturnId_fkey` FOREIGN KEY (`saleReturnId`) REFERENCES `sale_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `sale_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_purchaseReturnId_fkey` FOREIGN KEY (`purchaseReturnId`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_purchaseItemId_fkey` FOREIGN KEY (`purchaseItemId`) REFERENCES `purchase_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_saleReturnId_fkey` FOREIGN KEY (`saleReturnId`) REFERENCES `sale_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_purchaseReturnId_fkey` FOREIGN KEY (`purchaseReturnId`) REFERENCES `purchase_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
