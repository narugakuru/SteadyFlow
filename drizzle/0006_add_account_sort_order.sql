ALTER TABLE `accounts` ADD `sort_order` integer DEFAULT 999 NOT NULL;
--> statement-breakpoint

WITH ordered AS (
  SELECT
    `id` AS account_id,
    ROW_NUMBER() OVER (PARTITION BY `user_id` ORDER BY `id`) AS rn
  FROM `accounts`
)
UPDATE `accounts`
SET `sort_order` = (
  SELECT ordered.rn FROM ordered WHERE ordered.account_id = `accounts`.`id`
)
WHERE `sort_order` = 999;
