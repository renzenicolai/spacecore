-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 28, 2019 at 10:44 PM
-- Server version: 10.3.14-MariaDB-log
-- PHP Version: 7.3.4

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
-- Table structure for table `bankaccounts`
--

CREATE TABLE `bankaccounts` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iban` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saldo` int(11) DEFAULT NULL,
  `internal` tinyint(1) NOT NULL DEFAULT 0,
  `person_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `files` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` longblob NOT NULL
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
  `saldo` int(5) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_address`
--

CREATE TABLE `person_address` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `street` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `housenumber` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postalcode` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_email`
--

CREATE TABLE `person_email` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_group`
--

CREATE TABLE `person_group` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `addToNew` tinyint(1) NOT NULL DEFAULT 0
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
  `person_id` int(11) NOT NULL,
  `phonenumber` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_token`
--

CREATE TABLE `person_token` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `type_id` int(11) NOT NULL,
  `public` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `private` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `person_token_type`
--

CREATE TABLE `person_token_type` (
  `id` int(11) NOT NULL,
  `name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
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
  `display_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_location`
--

CREATE TABLE `product_location` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub` int(11) DEFAULT NULL,
  `visible` int(1) NOT NULL DEFAULT 0,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_package`
--

CREATE TABLE `product_package` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ask` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_price`
--

CREATE TABLE `product_price` (
  `id` int(11) NOT NULL,
  `amount` int(5) NOT NULL DEFAULT 0,
  `product_id` int(11) NOT NULL,
  `person_group_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_stock`
--

CREATE TABLE `product_stock` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `amount_initial` int(11) NOT NULL,
  `amount_current` int(11) NOT NULL,
  `timestamp_initial` int(11) NOT NULL DEFAULT 0,
  `timestamp_current` int(11) NOT NULL DEFAULT 0,
  `person_id` int(11) DEFAULT NULL,
  `comment` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `price` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_stock_mapping`
--

CREATE TABLE `product_stock_mapping` (
  `id` int(11) NOT NULL,
  `transaction_row_id` int(11) NOT NULL,
  `product_stock_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `person_id` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `timestamp` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transaction_rows`
--

CREATE TABLE `transaction_rows` (
  `id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `tax_id` int(11) DEFAULT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `amount` int(11) NOT NULL DEFAULT 0
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
  `active` tinyint(1) NOT NULL DEFAULT 0,
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
-- Indexes for table `bankaccounts`
--
ALTER TABLE `bankaccounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `iban` (`iban`),
  ADD KEY `person_id_of_bankaccount` (`person_id`);

--
-- Indexes for table `files`
--
ALTER TABLE `files`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `persons`
--
ALTER TABLE `persons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_file_id_of_avatar` (`avatar_id`);

--
-- Indexes for table `person_address`
--
ALTER TABLE `person_address`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_id_of_person_address` (`person_id`);

--
-- Indexes for table `person_email`
--
ALTER TABLE `person_email`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_id_of_person_email` (`person_id`);

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
  ADD KEY `person_id_of_person_phone` (`person_id`);

--
-- Indexes for table `person_token`
--
ALTER TABLE `person_token`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_id_of_person_token` (`person_id`),
  ADD KEY `type_id_of_token` (`type_id`);

--
-- Indexes for table `person_token_type`
--
ALTER TABLE `person_token_type`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `product_location`
--
ALTER TABLE `product_location`
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
  ADD KEY `person_group_id_of_product_price` (`person_group_id`);

--
-- Indexes for table `product_stock`
--
ALTER TABLE `product_stock`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id_of_product_stock` (`product_id`),
  ADD KEY `person_id_of_product_stock` (`person_id`);

--
-- Indexes for table `product_stock_mapping`
--
ALTER TABLE `product_stock_mapping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_stock_id_of_product_stock_mapping` (`product_stock_id`),
  ADD KEY `transaction_row_id_of_product_stock_mapping` (`transaction_row_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `person_id_of_log_entry` (`person_id`);

--
-- Indexes for table `transaction_rows`
--
ALTER TABLE `transaction_rows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id_of_transaction_row` (`product_id`),
  ADD KEY `transaction_id_of_transaction_row` (`transaction_id`);

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
-- AUTO_INCREMENT for table `bankaccounts`
--
ALTER TABLE `bankaccounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `files`
--
ALTER TABLE `files`
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
-- AUTO_INCREMENT for table `person_token`
--
ALTER TABLE `person_token`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `person_token_type`
--
ALTER TABLE `person_token_type`
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
-- AUTO_INCREMENT for table `product_location`
--
ALTER TABLE `product_location`
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
-- AUTO_INCREMENT for table `product_stock`
--
ALTER TABLE `product_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_stock_mapping`
--
ALTER TABLE `product_stock_mapping`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_rows`
--
ALTER TABLE `transaction_rows`
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
-- Constraints for table `bankaccounts`
--
ALTER TABLE `bankaccounts`
  ADD CONSTRAINT `person_id_of_bankaccount` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `persons`
--
ALTER TABLE `persons`
  ADD CONSTRAINT `person_file_id_of_avatar` FOREIGN KEY (`avatar_id`) REFERENCES `files` (`id`);

--
-- Constraints for table `person_address`
--
ALTER TABLE `person_address`
  ADD CONSTRAINT `person_id_of_person_address` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `person_email`
--
ALTER TABLE `person_email`
  ADD CONSTRAINT `person_id_of_person_email` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

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
  ADD CONSTRAINT `person_id_of_person_phone` FOREIGN KEY (`person_id`) REFERENCES `barsystem`.`barsystem_person` (`id`);

--
-- Constraints for table `person_token`
--
ALTER TABLE `person_token`
  ADD CONSTRAINT `person_id_of_person_token` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`),
  ADD CONSTRAINT `type_id_of_token` FOREIGN KEY (`type_id`) REFERENCES `person_token_type` (`id`);

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
  ADD CONSTRAINT `product_id_of_product_price` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `product_stock`
--
ALTER TABLE `product_stock`
  ADD CONSTRAINT `person_id_of_product_stock` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`),
  ADD CONSTRAINT `product_id_of_product_stock` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `product_stock_mapping`
--
ALTER TABLE `product_stock_mapping`
  ADD CONSTRAINT `product_stock_id_of_product_stock_mapping` FOREIGN KEY (`product_stock_id`) REFERENCES `product_stock` (`id`),
  ADD CONSTRAINT `transaction_row_id_of_product_stock_mapping` FOREIGN KEY (`transaction_row_id`) REFERENCES `transaction_rows` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `person_id_of_log_entry` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`);

--
-- Constraints for table `transaction_rows`
--
ALTER TABLE `transaction_rows`
  ADD CONSTRAINT `product_id_of_transaction_row` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `transaction_id_of_transaction_row` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`);

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
