-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(45) NOT NULL,
    `username` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(25) NULL,
    `role` ENUM('STAF', 'ADMIN', 'USER', 'CORPORATE', 'DEMO', 'SELLER') NOT NULL DEFAULT 'USER',
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `reset_password_token` VARCHAR(191) NULL,
    `reset_password_token_exp` VARCHAR(191) NULL,
    `refresh_token` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_reset_password_token_key`(`reset_password_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_info` (
    `id` VARCHAR(45) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `seller_email` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(191) NOT NULL,
    `bio` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `seller_info_user_id_key`(`user_id`),
    UNIQUE INDEX `seller_info_seller_email_key`(`seller_email`),
    INDEX `seller_info_name_user_id_seller_email_idx`(`name`, `user_id`, `seller_email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(45) NOT NULL,
    `nip` VARCHAR(20) NOT NULL,
    `position` ENUM('CS', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CEO', 'COO', 'CTO', 'HR', 'ACCOUNTANT', 'MARKETING', 'SALES') NOT NULL,
    `salutation` VARCHAR(6) NOT NULL DEFAULT 'Mr/Mrs',
    `is_active` BOOLEAN NOT NULL,

    UNIQUE INDEX `admin_info_user_id_key`(`user_id`),
    UNIQUE INDEX `admin_info_nip_key`(`nip`),
    INDEX `admin_info_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(45) NOT NULL,
    `salutation` VARCHAR(6) NOT NULL DEFAULT 'Mr/Mrs',
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NULL,
    `customer_name` VARCHAR(191) NULL,
    `street_name` VARCHAR(191) NULL,
    `other_person_name` VARCHAR(191) NULL,
    `avatar_text` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `nationality` ENUM('WNA', 'WNI') NULL,
    `gender` ENUM('male', 'female', 'other') NULL,
    `religion` VARCHAR(40) NULL,
    `district` VARCHAR(100) NULL,
    `city` VARCHAR(40) NULL,
    `province` VARCHAR(35) NULL,
    `country` VARCHAR(35) NULL,
    `date_of_birth` VARCHAR(191) NULL,
    `place_of_birth` VARCHAR(191) NULL,
    `main_phone_number` VARCHAR(25) NULL,
    `secondary_email` VARCHAR(191) NULL,
    `other_person_phone_number` VARCHAR(25) NULL,
    `emergency_phone_number` VARCHAR(25) NULL,
    `emergency_email` VARCHAR(191) NULL,
    `height` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_addresses` (
    `id` VARCHAR(45) NOT NULL,
    `user_id` VARCHAR(45) NOT NULL,
    `seller_id` VARCHAR(45) NOT NULL,
    `address_type` VARCHAR(191) NOT NULL,
    `user_type` ENUM('CONSUMER', 'SELLER') NOT NULL,
    `address_line1` LONGTEXT NOT NULL,
    `recipient_name` VARCHAR(191) NOT NULL,
    `address_line2` LONGTEXT NULL,
    `city` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `house_number` VARCHAR(191) NULL,
    `residence_name` VARCHAR(191) NULL,
    `building_name` VARCHAR(191) NULL,
    `floor` VARCHAR(191) NULL,
    `postal_code` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `main_phone_number` VARCHAR(25) NOT NULL,
    `secondary_phone_number` VARCHAR(25) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_addresses_user_id_seller_id_address_type_user_type_idx`(`user_id`, `seller_id`, `address_type`, `user_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blacklist_entries` (
    `id` VARCHAR(45) NOT NULL,
    `start_date` VARCHAR(30) NOT NULL,
    `end_date` VARCHAR(30) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `user_id` VARCHAR(45) NULL,
    `no_identifier` VARCHAR(50) NOT NULL,
    `type_identifier` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `blacklist_entries_no_identifier_key`(`no_identifier`),
    INDEX `blacklist_entries_user_id_place_id_idx`(`user_id`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blacklist_history` (
    `id` VARCHAR(45) NOT NULL,
    `no_identifier` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(45) NOT NULL,
    `reason` LONGTEXT NOT NULL,
    `user_id` VARCHAR(45) NULL,
    `start_date` VARCHAR(30) NOT NULL,
    `end_date` VARCHAR(30) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `blacklist_history_no_identifier_user_id_place_id_idx`(`no_identifier`, `user_id`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(40) NOT NULL,
    `no_order` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(45) NOT NULL,
    `order_type` ENUM('RESERVATION', 'PRODUCT', 'SERVICE', 'VOUCHER', 'GIFT', 'SUBSCRIPTION', 'ADDON', 'TICKET') NOT NULL,
    `order_sub_type` ENUM('GN', 'VL', 'CP', 'OA', 'PD', 'VC', 'GF', 'SBPT', 'AD', 'TC') NOT NULL,
    `total_price` BIGINT NOT NULL,
    `total_price_before_discount` BIGINT NULL,
    `discount` INTEGER NULL,
    `total_quantity` INTEGER NOT NULL,
    `status` ENUM('INPROGRESS', 'DELIVERY', 'CANCELED', 'REJECTED', 'COMPLETED', 'FAILURE') NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `payment_method` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `orders_order_id_key`(`order_id`),
    UNIQUE INDEX `orders_no_order_key`(`no_order`),
    INDEX `orders_user_id_no_order_status_is_deleted_created_at_updated_idx`(`user_id`, `no_order`, `status`, `is_deleted`, `created_at`, `updated_at`),
    FULLTEXT INDEX `orders_no_order_idx`(`no_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_detail` (
    `id` VARCHAR(45) NOT NULL,
    `order_id` VARCHAR(40) NOT NULL,
    `seller_id` VARCHAR(45) NOT NULL,
    `user_id` VARCHAR(45) NOT NULL,
    `order_identifier` VARCHAR(191) NOT NULL,
    `basecamp_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `thumbnail_url` VARCHAR(191) NOT NULL,
    `thumbnail_text` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `start_reservation` VARCHAR(30) NULL,
    `end_reservation` VARCHAR(30) NULL,
    `price` BIGINT NOT NULL,
    `price_before_discount` BIGINT NULL,
    `discount` INTEGER NULL,

    INDEX `order_detail_order_id_user_id_seller_id_order_identifier_idx`(`order_id`, `user_id`, `seller_id`, `order_identifier`),
    FULLTEXT INDEX `order_detail_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(40) NOT NULL,
    `value` INTEGER NOT NULL,
    `value_type` VARCHAR(191) NOT NULL,
    `fee_type` VARCHAR(191) NOT NULL,

    INDEX `fee_order_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_user_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_detail_id` VARCHAR(45) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `salutation` VARCHAR(10) NOT NULL DEFAULT 'Mr/Mrs',
    `last_name` VARCHAR(191) NULL,
    `primary_email` VARCHAR(191) NOT NULL,
    `secondary_email` VARCHAR(191) NULL,
    `primary_phone_number` VARCHAR(25) NOT NULL,
    `secondary_phone_number` VARCHAR(25) NULL,
    `country` VARCHAR(191) NOT NULL,
    `no_identifier` VARCHAR(191) NOT NULL,
    `birthday` VARCHAR(191) NULL,

    INDEX `order_user_info_order_detail_id_no_identifier_idx`(`order_detail_id`, `no_identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher_order_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('used', 'revoke') NOT NULL,
    `order_detail_id` VARCHAR(45) NULL,
    `order_id` VARCHAR(40) NULL,
    `used_id` VARCHAR(45) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `use_time` DATETIME(3) NOT NULL,
    `revoke_time` DATETIME(3) NULL,

    INDEX `voucher_order_info_order_detail_id_used_id_status_idx`(`order_detail_id`, `used_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(45) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `message` VARCHAR(191) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `order_id` VARCHAR(40) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher` (
    `code` VARCHAR(25) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `min_spend` INTEGER NULL,
    `image_url` VARCHAR(191) NULL,
    `image_text` VARCHAR(191) NULL,
    `type` ENUM('percentage', 'price') NOT NULL,
    `using_type` ENUM('disposable', 'reusable', 'threshold', 'cashback') NOT NULL,
    `source` ENUM('mia', 'merchant') NOT NULL,
    `created_by_id` VARCHAR(45) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `start_date` VARCHAR(30) NOT NULL,
    `end_date` VARCHAR(30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `voucher_is_active_is_deleted_type_start_date_end_date_idx`(`is_active`, `is_deleted`, `type`, `start_date`, `end_date`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_identity` (
    `id` VARCHAR(45) NOT NULL,
    `image` LONGBLOB NOT NULL,
    `format_base64` VARCHAR(191) NOT NULL,
    `no_identifier` VARCHAR(191) NOT NULL,
    `identity_type` VARCHAR(191) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `user_id` VARCHAR(45) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_identity_no_identifier_key`(`no_identifier`),
    UNIQUE INDEX `user_identity_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_schedule` (
    `id` VARCHAR(45) NOT NULL,
    `place_id` VARCHAR(45) NULL,
    `basecamp_id` VARCHAR(45) NULL,
    `type` ENUM('GN', 'VL', 'CP', 'OA', 'PD', 'VC', 'GF', 'SBPT', 'AD', 'TC') NOT NULL,
    `start_time` VARCHAR(30) NOT NULL,
    `end_time` VARCHAR(30) NULL,
    `quota` INTEGER NULL,
    `current_quota` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reservation_schedule_start_time_end_time_place_id_idx`(`start_time`, `end_time`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quota_place` (
    `id` VARCHAR(45) NOT NULL,
    `place_id` VARCHAR(45) NULL,
    `basecamp_id` VARCHAR(45) NULL,
    `day` ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL,
    `quota` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quota_place_place_id_basecamp_id_day_idx`(`place_id`, `basecamp_id`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_destination` (
    `id` VARCHAR(45) NOT NULL,
    `seller_id` VARCHAR(45) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('RESERVATION', 'PRODUCT', 'SERVICE', 'VOUCHER', 'GIFT', 'SUBSCRIPTION', 'ADDON', 'TICKET') NOT NULL,
    `price` BIGINT NULL,
    `price_before_discount` BIGINT NULL,
    `discount` INTEGER NULL,
    `latitude` VARCHAR(191) NOT NULL,
    `longitude` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone_number` VARCHAR(25) NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(40) NOT NULL,
    `province` VARCHAR(35) NOT NULL,
    `country` VARCHAR(40) NOT NULL,
    `altitude` INTEGER NULL,
    `website` VARCHAR(191) NULL,
    `thumbnail_url` VARCHAR(191) NOT NULL,
    `thumbnail_text` VARCHAR(191) NOT NULL,
    `meta_title` VARCHAR(191) NOT NULL,
    `meta_description` VARCHAR(191) NOT NULL,
    `meta_keywords` VARCHAR(191) NOT NULL,
    `seo_url` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(45) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `place_destination_slug_key`(`slug`),
    INDEX `place_destination_category_id_is_active_is_deleted_seller_id_idx`(`category_id`, `is_active`, `is_deleted`, `seller_id`, `province`, `city`, `country`),
    FULLTEXT INDEX `place_destination_name_province_city_country_description_idx`(`name`, `province`, `city`, `country`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tracking_basecamp` (
    `id` VARCHAR(45) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `price` BIGINT NOT NULL,
    `price_before_discount` BIGINT NULL,
    `discount` INTEGER NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `thumbnail_text` VARCHAR(191) NULL,
    `latitude` VARCHAR(191) NOT NULL,
    `longitude` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(25) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(40) NOT NULL,
    `province` VARCHAR(35) NOT NULL,
    `country` VARCHAR(40) NOT NULL,
    `place_id` VARCHAR(45) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `tracking_basecamp_name_is_active_city_province_email_idx`(`name`, `is_active`, `city`, `province`, `email`),
    FULLTEXT INDEX `tracking_basecamp_name_province_city_country_description_idx`(`name`, `province`, `city`, `country`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `destination_categories` (
    `id` VARCHAR(45) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` ENUM('GN', 'VL', 'CP', 'OA', 'PD', 'VC', 'GF', 'SBPT', 'AD', 'TC') NOT NULL,
    `description` LONGTEXT NULL,
    `image_url` VARCHAR(191) NULL,
    `image_text` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` VARCHAR(45) NOT NULL,
    `updated_by_id` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `destination_categories_code_key`(`code`),
    INDEX `destination_categories_is_active_created_by_id_updated_by_id_idx`(`is_active`, `created_by_id`, `updated_by_id`),
    FULLTEXT INDEX `destination_categories_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_images` (
    `image_text` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(45) NULL,
    `basecamp_id` VARCHAR(45) NULL,
    `image_url` VARCHAR(191) NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    INDEX `place_images_place_id_is_delete_basecamp_id_idx`(`place_id`, `is_delete`, `basecamp_id`),
    PRIMARY KEY (`image_text`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_facilities` (
    `id` VARCHAR(45) NOT NULL,
    `place_id` VARCHAR(45) NULL,
    `basecamp_id` VARCHAR(45) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `place_facilities_name_place_id_idx`(`name`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_activities` (
    `id` VARCHAR(45) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `duration` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `place_id` VARCHAR(45) NOT NULL,

    INDEX `place_activities_name_place_id_is_active_idx`(`name`, `place_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_transaction` (
    `transaction_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(40) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'SETTLEMENT', 'CANCEL', 'EXPIRE', 'FAILURE') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `expiry_time` DATETIME(3) NOT NULL,
    `transaction_time` DATETIME(3) NOT NULL,
    `settlement_time` DATETIME(3) NULL,
    `va_number` VARCHAR(191) NULL,
    `bank` VARCHAR(191) NULL,
    `redirect_url` VARCHAR(191) NULL,
    `qr_code` VARCHAR(191) NULL,
    `qr_string` VARCHAR(191) NULL,

    UNIQUE INDEX `payment_transaction_order_id_key`(`order_id`),
    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `popular_place` (
    `id` VARCHAR(45) NOT NULL,
    `place_id` VARCHAR(45) NOT NULL,
    `rating` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `popular_place_place_id_idx`(`place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banners` (
    `id` VARCHAR(45) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `image_url` VARCHAR(191) NULL,
    `image_text` VARCHAR(191) NOT NULL,
    `type` ENUM('PROMO', 'ANNOUNCEMENT', 'WARNING', 'INFO') NOT NULL DEFAULT 'INFO',
    `position` ENUM('TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER') NOT NULL DEFAULT 'TOP',
    `start_active` VARCHAR(30) NULL,
    `end_active` VARCHAR(30) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(45) NOT NULL,

    INDEX `banners_start_active_end_active_is_deleted_is_active_priorit_idx`(`start_active`, `end_active`, `is_deleted`, `is_active`, `priority`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `seller_info` ADD CONSTRAINT `seller_info_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `seller_info`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blacklist_history` ADD CONSTRAINT `blacklist_history_id_fkey` FOREIGN KEY (`id`) REFERENCES `blacklist_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_detail` ADD CONSTRAINT `order_detail_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_detail` ADD CONSTRAINT `order_detail_basecamp_id_fkey` FOREIGN KEY (`basecamp_id`) REFERENCES `tracking_basecamp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_detail` ADD CONSTRAINT `order_detail_order_identifier_fkey` FOREIGN KEY (`order_identifier`) REFERENCES `place_destination`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_detail` ADD CONSTRAINT `order_detail_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `seller_info`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_order` ADD CONSTRAINT `fee_order_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_user_info` ADD CONSTRAINT `order_user_info_order_detail_id_fkey` FOREIGN KEY (`order_detail_id`) REFERENCES `order_detail`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_order_info` ADD CONSTRAINT `voucher_order_info_order_detail_id_fkey` FOREIGN KEY (`order_detail_id`) REFERENCES `order_detail`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_order_info` ADD CONSTRAINT `voucher_order_info_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_order_info` ADD CONSTRAINT `voucher_order_info_code_fkey` FOREIGN KEY (`code`) REFERENCES `voucher`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher` ADD CONSTRAINT `voucher_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_identity` ADD CONSTRAINT `user_identity_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_schedule` ADD CONSTRAINT `reservation_schedule_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_schedule` ADD CONSTRAINT `reservation_schedule_basecamp_id_fkey` FOREIGN KEY (`basecamp_id`) REFERENCES `tracking_basecamp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quota_place` ADD CONSTRAINT `quota_place_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quota_place` ADD CONSTRAINT `quota_place_basecamp_id_fkey` FOREIGN KEY (`basecamp_id`) REFERENCES `tracking_basecamp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_destination` ADD CONSTRAINT `place_destination_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `destination_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_destination` ADD CONSTRAINT `place_destination_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `seller_info`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracking_basecamp` ADD CONSTRAINT `tracking_basecamp_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `destination_categories` ADD CONSTRAINT `destination_categories_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `admin_info`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_images` ADD CONSTRAINT `place_images_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_images` ADD CONSTRAINT `place_images_basecamp_id_fkey` FOREIGN KEY (`basecamp_id`) REFERENCES `tracking_basecamp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_facilities` ADD CONSTRAINT `place_facilities_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_facilities` ADD CONSTRAINT `place_facilities_basecamp_id_fkey` FOREIGN KEY (`basecamp_id`) REFERENCES `tracking_basecamp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_activities` ADD CONSTRAINT `place_activities_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transaction` ADD CONSTRAINT `payment_transaction_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `popular_place` ADD CONSTRAINT `popular_place_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place_destination`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `banners` ADD CONSTRAINT `banners_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `admin_info`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
