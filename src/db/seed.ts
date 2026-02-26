import { assetClasses, settings } from "./schema";
import { eq } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: any) {
  // Seed asset classes
  const existingClasses = await db.select().from(assetClasses);
  if (existingClasses.length === 0) {
    await db.insert(assetClasses)
      .values([
        { name: "股票基金", targetPct: 40 },
        { name: "黄金", targetPct: 20 },
        { name: "债券", targetPct: 25 },
        { name: "现金", targetPct: 15 },
      ]);
  }

  // Seed global thresholds in settings
  const warningSetting = await db.select().from(settings).where(eq(settings.key, "warning_threshold"));
  if (warningSetting.length === 0) {
    await db.insert(settings).values({ key: "warning_threshold", value: "5" });
  }
  const dangerSetting = await db.select().from(settings).where(eq(settings.key, "danger_threshold"));
  if (dangerSetting.length === 0) {
    await db.insert(settings).values({ key: "danger_threshold", value: "15" });
  }
}
