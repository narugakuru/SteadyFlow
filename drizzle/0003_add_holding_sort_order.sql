ALTER TABLE `holdings` ADD `sort_order` integer NOT NULL DEFAULT 999;
--> statement-breakpoint
UPDATE `holdings`
SET `sort_order` = (
  SELECT COUNT(*)
  FROM `holdings` h2
  WHERE h2.`account_id` = `holdings`.`account_id`
    AND h2.`id` <= `holdings`.`id`
)
WHERE `sort_order` = 999;
