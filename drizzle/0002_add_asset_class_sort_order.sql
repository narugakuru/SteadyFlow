ALTER TABLE `asset_classes` ADD `sort_order` integer NOT NULL DEFAULT 999;
--> statement-breakpoint
UPDATE `asset_classes`
SET `sort_order` = CASE
  WHEN `name` IN ('股票', '股票基金') THEN 1
  WHEN `name` = '黄金' THEN 2
  WHEN `name` = '债券' THEN 3
  WHEN `name` = '现金' THEN 4
  ELSE 1000 + `id`
END
WHERE `sort_order` = 999;
