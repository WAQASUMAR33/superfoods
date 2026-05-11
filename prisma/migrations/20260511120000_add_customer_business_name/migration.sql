-- Add optional business_name column to customers.
ALTER TABLE `customers` ADD COLUMN `business_name` VARCHAR(191) NULL;
