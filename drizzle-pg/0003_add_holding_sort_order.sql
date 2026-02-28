ALTER TABLE "holdings" ADD COLUMN "sort_order" integer DEFAULT 999 NOT NULL;
--> statement-breakpoint
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "account_id" ORDER BY "id") AS "rn"
  FROM "holdings"
)
UPDATE "holdings" h
SET "sort_order" = o."rn"
FROM ordered o
WHERE h."id" = o."id"
  AND h."sort_order" = 999;
