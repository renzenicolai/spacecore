-- phpMyAdmin SQL Dump
-- version 4.8.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 26, 2018 at 12:26 PM
-- Server version: 10.1.36-MariaDB
-- PHP Version: 7.2.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `datastore`
--

-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `files` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Uploaded by',
  `filename` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` longblob NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_no` int(11) NOT NULL,
  `invoice_prefix` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `person_id` int(11) NOT NULL,
  `person_address_id` int(11) NOT NULL,
  `amount_total` decimal(10,4) NOT NULL,
  `status` int(11) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_product`
--

CREATE TABLE `invoice_product` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_status`
--

CREATE TABLE `invoice_status` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` int(8) NOT NULL DEFAULT '11184810' COMMENT 'HEX color code',
  `concept` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `member_history`
--

CREATE TABLE `member_history` (
  `id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `type_id` int(11) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `member_types`
--

CREATE TABLE `member_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `monthly_fee` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `bar_discount_price` tinyint(1) NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `persons`
--

CREATE TABLE `persons` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Henk',
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'de Vries',
  `nick_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Anonymous',
  `avatar_id` int(11) DEFAULT NULL,
  `default_payment_address_id` int(11) DEFAULT NULL,
  `default_shipping_address_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_address`
--

CREATE TABLE `person_address` (
  `id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `mail` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_bankaccount`
--

CREATE TABLE `person_bankaccount` (
  `id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `iban` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_email`
--

CREATE TABLE `person_email` (
  `id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `newsletter` tinyint(1) NOT NULL DEFAULT '0',
  `mailinglist` tinyint(1) NOT NULL DEFAULT '0',
  `contact` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_group`
--

CREATE TABLE `person_group` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_group_mapping`
--

CREATE TABLE `person_group_mapping` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `person_group_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_phone`
--

CREATE TABLE `person_phone` (
  `id` int(11) NOT NULL,
  `person_id` int(11) DEFAULT NULL,
  `number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `contact` tinyint(1) NOT NULL DEFAULT '0',
  `emergency` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `picture_id` int(11) DEFAULT NULL,
  `package_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_brand`
--

CREATE TABLE `product_brand` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `picture` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_group`
--

CREATE TABLE `product_group` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_group_mapping`
--

CREATE TABLE `product_group_mapping` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_group_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_identifier`
--

CREATE TABLE `product_identifier` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `value` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_identifier_type`
--

CREATE TABLE `product_identifier_type` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `long_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` tinyint(1) NOT NULL DEFAULT '0',
  `display_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `supplier` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_package`
--

CREATE TABLE `product_package` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ask` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_price`
--

CREATE TABLE `product_price` (
  `id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `product_id` int(11) NOT NULL,
  `person_group_id` int(11) DEFAULT NULL,
  `package_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `user_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Anonymous',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '¯\\_(ツ)_/¯',
  `password` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0',
  `avatar_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `endpoint` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `files`
--
ALTER TABLE `files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploader_of_file` (`user_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status_of_invoice` (`status`),
  ADD KEY `person_of_invoice` (`person_id`),
  ADD KEY `person_address_of_invoice` (`person_address_id`);

--
-- Indexes for table `invoice_product`
--
ALTER TABLE `invoice_product`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id_of_invoice_product` (`invoice_id`);

--
-- Indexes for table `invoice_status`
--
ALTER TABLE `invoice_status`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `member_history`
--
ALTER TABLE `member_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id_of_history_member` (`person_id`),
  ADD KEY `type_id_of_history_member` (`type_id`);

--
-- Indexes for table `member_types`
--
ALTER TABLE `member_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `persons`
--
ALTER TABLE `persons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_file_id_of_avatar` (`avatar_id`),
  ADD KEY `default_payment_address_of_person` (`default_payment_address_id`),
  ADD KEY `default_shipping_address_of_person` (`default_shipping_address_id`);

--
-- Indexes for table `person_address`
--
ALTER TABLE `person_address`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id_of_address` (`person_id`);

--
-- Indexes for table `person_bankaccount`
--
ALTER TABLE `person_bankaccount`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id_of_bank_account` (`person_id`);

--
-- Indexes for table `person_email`
--
ALTER TABLE `person_email`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id_of_email` (`person_id`);

--
-- Indexes for table `person_group`
--
ALTER TABLE `person_group`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `person_group_mapping`
--
ALTER TABLE `person_group_mapping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_id_of_person_group` (`person_id`),
  ADD KEY `person_groups_id_of_person_group` (`person_group_id`);

--
-- Indexes for table `person_phone`
--
ALTER TABLE `person_phone`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id_of_phone` (`person_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `picture_id_of_product` (`picture_id`),
  ADD KEY `product_brand_id_of_product` (`brand_id`),
  ADD KEY `product_package_id_of_product` (`package_id`);

--
-- Indexes for table `product_brand`
--
ALTER TABLE `product_brand`
  ADD PRIMARY KEY (`id`),
  ADD KEY `picture_id_of_product_brand` (`picture`);

--
-- Indexes for table `product_group`
--
ALTER TABLE `product_group`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_group_mapping`
--
ALTER TABLE `product_group_mapping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id_of_product_group_mapping` (`product_id`),
  ADD KEY `product_group_id_of_product_group_mapping` (`product_group_id`);

--
-- Indexes for table `product_identifier`
--
ALTER TABLE `product_identifier`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id_of_product_identifier` (`product_id`),
  ADD KEY `product_identifier_type_id_of_product_identifier` (`type_id`);

--
-- Indexes for table `product_identifier_type`
--
ALTER TABLE `product_identifier_type`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_package`
--
ALTER TABLE `product_package`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_price`
--
ALTER TABLE `product_price`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id_of_product_price` (`product_id`),
  ADD KEY `person_group_id_of_product_price` (`person_group_id`),
  ADD KEY `product_package_id_of_product_price` (`package_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `file_id_of_user_avatar` (`avatar_id`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id_of_permission` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `files`
--
ALTER TABLE `files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_product`
--
ALTER TABLE `invoice_product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_status`
--
ALTER TABLE `invoice_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `member_history`
--
ALTER TABLE `member_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `member_types`
--
ALTER TABLE `member_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `persons`
--
ALTER TABLE `persons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_address`
--
ALTER TABLE `person_address`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_bankaccount`
--
ALTER TABLE `person_bankaccount`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_email`
--
ALTER TABLE `person_email`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_group`
--
ALTER TABLE `person_group`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_group_mapping`
--
ALTER TABLE `person_group_mapping`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_phone`
--
ALTER TABLE `person_phone`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_brand`
--
ALTER TABLE `product_brand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_group`
--
ALTER TABLE `product_group`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_group_mapping`
--
ALTER TABLE `product_group_mapping`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_identifier`
--
ALTER TABLE `product_identifier`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_identifier_type`
--
ALTER TABLE `product_identifier_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_package`
--
ALTER TABLE `product_package`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_price`
--
ALTER TABLE `product_price`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `files`
--
ALTER TABLE `files`
  ADD CONSTRAINT `uploader_of_file` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `person_address_of_invoice` FOREIGN KEY (`person_address_id`) REFERENCES `person_address` (`id`),
  ADD CONSTRAINT `person_of_invoice` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`),
  ADD CONSTRAINT `status_of_invoice` FOREIGN KEY (`status`) REFERENCES `invoice_status` (`id`);

--
-- Constraints for table `invoice_product`
--
ALTER TABLE `invoice_product`
  ADD CONSTRAINT `invoice_id_of_invoice_product` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);

--
-- Constraints for table `member_history`
--
ALTER TABLE `member_history`
  ADD CONSTRAINT `person_id_of_history_member` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`),
  ADD CONSTRAINT `type_id_of_history_member` FOREIGN KEY (`type_id`) REFERENCES `member_types` (`id`);

--
-- Constraints for table `persons`
--
ALTER TABLE `persons`
  ADD CONSTRAINT `default_payment_address_of_person` FOREIGN KEY (`default_payment_address_id`) REFERENCES `person_address` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `default_shipping_address_of_person` FOREIGN KEY (`default_shipping_address_id`) REFERENCES `person_address` (`id`),
  ADD CONSTRAINT `person_file_id_of_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `files` (`id`);

--
-- Constraints for table `person_address`
--
ALTER TABLE `person_address`
  ADD CONSTRAINT `person_id_of_address` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `person_bankaccount`
--
ALTER TABLE `person_bankaccount`
  ADD CONSTRAINT `person_id_of_bank_account` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `person_email`
--
ALTER TABLE `person_email`
  ADD CONSTRAINT `person_id_of_email` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `person_group_mapping`
--
ALTER TABLE `person_group_mapping`
  ADD CONSTRAINT `person_groups_id_of_person_group` FOREIGN KEY (`person_group_id`) REFERENCES `person_group` (`id`),
  ADD CONSTRAINT `person_id_of_person_group` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `person_phone`
--
ALTER TABLE `person_phone`
  ADD CONSTRAINT `person_id_of_phone` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `picture_id_of_product` FOREIGN KEY (`picture_id`) REFERENCES `files` (`id`),
  ADD CONSTRAINT `product_brand_id_of_product` FOREIGN KEY (`brand_id`) REFERENCES `product_brand` (`id`),
  ADD CONSTRAINT `product_package_id_of_product` FOREIGN KEY (`package_id`) REFERENCES `product_package` (`id`);

--
-- Constraints for table `product_brand`
--
ALTER TABLE `product_brand`
  ADD CONSTRAINT `picture_id_of_product_brand` FOREIGN KEY (`picture`) REFERENCES `files` (`id`);

--
-- Constraints for table `product_group_mapping`
--
ALTER TABLE `product_group_mapping`
  ADD CONSTRAINT `product_group_id_of_product_group_mapping` FOREIGN KEY (`product_group_id`) REFERENCES `product_group` (`id`),
  ADD CONSTRAINT `product_id_of_product_group_mapping` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `product_identifier`
--
ALTER TABLE `product_identifier`
  ADD CONSTRAINT `product_id_of_product_identifier` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `product_identifier_type_id_of_product_identifier` FOREIGN KEY (`type_id`) REFERENCES `product_identifier_type` (`id`);

--
-- Constraints for table `product_price`
--
ALTER TABLE `product_price`
  ADD CONSTRAINT `person_group_id_of_product_price` FOREIGN KEY (`person_group_id`) REFERENCES `person_group` (`id`),
  ADD CONSTRAINT `product_id_of_product_price` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `product_package_id_of_product_price` FOREIGN KEY (`package_id`) REFERENCES `product_package` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `file_id_of_user_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `files` (`id`);

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_id_of_permission` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
