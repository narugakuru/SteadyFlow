import {
  DEFAULT_QUOTE_SYNC_STALE_THRESHOLD_MS,
  isQuoteSyncRunning,
  type QuoteSyncMetadata,
  type QuoteSyncState,
  type QuoteSyncTriggerSource,
} from "@/lib/utils/quote-sync";
import { readUserSettingsMap, upsertSetting } from "@/lib/services/settings-service";

const QUOTE_SYNC_KEYS = {
  lastStartedAt: "quote_sync.last_started_at",
  lastFinishedAt: "quote_sync.last_finished_at",
  lastSuccessAt: "quote_sync.last_success_at",
  lastStatus: "quote_sync.last_status",
  lastTriggerSource: "quote_sync.last_trigger_source",
  lastSummary: "quote_sync.last_summary",
} as const;

function normalizeState(raw: string | undefined): QuoteSyncState {
  if (raw === "running" || raw === "ok" || raw === "partial" || raw === "failed") {
    return raw;
  }
  return "idle";
}

function normalizeTrigger(raw: string | undefined): QuoteSyncTriggerSource | null {
  if (raw === "manual" || raw === "silent-client" || raw === "cron") {
    return raw;
  }
  return null;
}

export function getQuoteSyncMetadataFromMap(
  settingMap: ReadonlyMap<string, string>
): QuoteSyncMetadata {
  const metadataBase = {
    lastStartedAt: settingMap.get(QUOTE_SYNC_KEYS.lastStartedAt) ?? null,
    lastFinishedAt: settingMap.get(QUOTE_SYNC_KEYS.lastFinishedAt) ?? null,
    lastSuccessAt: settingMap.get(QUOTE_SYNC_KEYS.lastSuccessAt) ?? null,
    lastStatus: normalizeState(settingMap.get(QUOTE_SYNC_KEYS.lastStatus)),
    lastTriggerSource: normalizeTrigger(settingMap.get(QUOTE_SYNC_KEYS.lastTriggerSource)),
    lastSummary: settingMap.get(QUOTE_SYNC_KEYS.lastSummary) || null,
  };

  return {
    ...metadataBase,
    isRunning: isQuoteSyncRunning(metadataBase),
    staleThresholdMs: DEFAULT_QUOTE_SYNC_STALE_THRESHOLD_MS,
  };
}

export async function getQuoteSyncMetadata(userId: string) {
  return getQuoteSyncMetadataFromMap(await readUserSettingsMap(userId));
}

export async function markQuoteSyncStarted(
  userId: string,
  trigger: QuoteSyncTriggerSource,
  startedAt = new Date().toISOString()
) {
  await Promise.all([
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastStartedAt, startedAt),
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastStatus, "running"),
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastTriggerSource, trigger),
  ]);
}

interface MarkQuoteSyncFinishedOptions {
  trigger: QuoteSyncTriggerSource;
  status: Exclude<QuoteSyncState, "idle" | "running">;
  summary: string | null;
  hadSuccessfulUpdate: boolean;
  finishedAt?: string;
}

export async function markQuoteSyncFinished(userId: string, options: MarkQuoteSyncFinishedOptions) {
  const finishedAt = options.finishedAt ?? new Date().toISOString();
  const operations = [
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastFinishedAt, finishedAt),
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastStatus, options.status),
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastTriggerSource, options.trigger),
    upsertSetting(userId, QUOTE_SYNC_KEYS.lastSummary, options.summary ?? ""),
  ];

  if (options.hadSuccessfulUpdate) {
    operations.push(upsertSetting(userId, QUOTE_SYNC_KEYS.lastSuccessAt, finishedAt));
  }

  await Promise.all(operations);
}
