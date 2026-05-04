-- Drop legacy product classification columns (variety, grain length).
ALTER TABLE `products` DROP COLUMN `variety`;
ALTER TABLE `products` DROP COLUMN `grainLength`;
