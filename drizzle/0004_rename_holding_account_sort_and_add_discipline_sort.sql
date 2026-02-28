ALTER TABLE `holdings` RENAME COLUMN `sort_order` TO `account_sort_order`;
--> statement-breakpoint
ALTER TABLE `holdings` ADD `discipline_sort_order` integer NOT NULL DEFAULT 999;
--> statement-breakpoint

WITH ordered AS (
  SELECT
    h.`id` AS holding_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        a.`user_id`,
        CASE
          WHEN trim(h.`asset_class`) = '股票基金' THEN '股票'
          ELSE trim(h.`asset_class`)
        END
      ORDER BY h.`account_sort_order`, h.`id`
    ) AS rn
  FROM `holdings` h
  INNER JOIN `accounts` a ON a.`id` = h.`account_id`
)
UPDATE `holdings`
SET `discipline_sort_order` = (
  SELECT ordered.rn FROM ordered WHERE ordered.holding_id = `holdings`.`id`
)
WHERE `discipline_sort_order` = 999;
