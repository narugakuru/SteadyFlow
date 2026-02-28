ALTER TABLE "holdings" RENAME COLUMN "sort_order" TO "account_sort_order";
ALTER TABLE "holdings" ADD COLUMN "discipline_sort_order" integer DEFAULT 999 NOT NULL;

WITH ordered AS (
  SELECT
    h."id" AS holding_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        a."user_id",
        CASE
          WHEN btrim(h."asset_class") = '股票基金' THEN '股票'
          ELSE btrim(h."asset_class")
        END
      ORDER BY h."account_sort_order", h."id"
    ) AS rn
  FROM "holdings" h
  INNER JOIN "accounts" a ON a."id" = h."account_id"
)
UPDATE "holdings" h
SET "discipline_sort_order" = o."rn"
FROM ordered o
WHERE h."id" = o.holding_id
  AND h."discipline_sort_order" = 999;
