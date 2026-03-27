ALTER TABLE "accounts" ADD COLUMN "sort_order" integer DEFAULT 999 NOT NULL;
--> statement-breakpoint

WITH ordered AS (
  SELECT
    "id" AS account_id,
    ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "id") AS rn
  FROM "accounts"
)
UPDATE "accounts" a
SET "sort_order" = o."rn"
FROM ordered o
WHERE a."id" = o.account_id
  AND a."sort_order" = 999;
