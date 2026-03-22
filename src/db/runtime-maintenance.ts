/* eslint-disable @typescript-eslint/no-explicit-any */
import { backfillSlimNetvalueDataJson } from "@/lib/services/netvalue-history-service";

export async function runRuntimeMaintenance(db: any) {
  const slimmedRows = await backfillSlimNetvalueDataJson(db);
  if (slimmedRows > 0) {
    console.info(`[db] Slimmed ${slimmedRows} historical netvalue snapshots.`);
  }
}
