import { db } from "./index";
import { assetClasses, settings } from "./schema";
import { eq } from "drizzle-orm";

export function seed() {
  // Seed asset classes (without thresholds)
  const existingClasses = db.select().from(assetClasses).all();
  if (existingClasses.length === 0) {
    db.insert(assetClasses)
      .values([
        { name: "股票基金", targetPct: 40 },
        { name: "黄金", targetPct: 20 },
        { name: "债券", targetPct: 25 },
        { name: "现金", targetPct: 15 },
      ])
      .run();
  }

  // Seed global thresholds in settings
  const warningSetting = db.select().from(settings).where(eq(settings.key, "warning_threshold")).get();
  if (!warningSetting) {
    db.insert(settings).values({ key: "warning_threshold", value: "3" }).run();
  }
  const dangerSetting = db.select().from(settings).where(eq(settings.key, "danger_threshold")).get();
  if (!dangerSetting) {
    db.insert(settings).values({ key: "danger_threshold", value: "5" }).run();
  }
}
