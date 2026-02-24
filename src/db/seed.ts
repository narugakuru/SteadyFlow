import { db } from "./index";
import { assetClasses } from "./schema";
import { sql } from "drizzle-orm";

export function seed() {
  const existing = db.select().from(assetClasses).all();
  if (existing.length > 0) return;

  db.insert(assetClasses)
    .values([
      { name: "股票基金", targetPct: 40, warningThreshold: 3, dangerThreshold: 5 },
      { name: "黄金", targetPct: 20, warningThreshold: 3, dangerThreshold: 5 },
      { name: "债券", targetPct: 25, warningThreshold: 3, dangerThreshold: 5 },
      { name: "现金", targetPct: 15, warningThreshold: 3, dangerThreshold: 5 },
    ])
    .run();
}
