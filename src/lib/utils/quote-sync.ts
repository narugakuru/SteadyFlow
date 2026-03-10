export const DEFAULT_QUOTE_SYNC_STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;
export const QUOTE_SYNC_RUNNING_TIMEOUT_MS = 15 * 60 * 1000;

export type QuoteSyncTriggerSource = "manual" | "silent-client" | "cron";
export type QuoteSyncState = "idle" | "running" | "ok" | "partial" | "failed";

export interface QuoteSyncMetadata {
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: QuoteSyncState;
  lastTriggerSource: QuoteSyncTriggerSource | null;
  lastSummary: string | null;
  isRunning: boolean;
  staleThresholdMs: number;
}

function toMillis(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isQuoteSyncRunning(
  metadata: Pick<QuoteSyncMetadata, "lastStartedAt" | "lastFinishedAt" | "lastStatus">,
  nowMs = Date.now()
) {
  if (metadata.lastStatus !== "running") return false;

  const startedAtMs = toMillis(metadata.lastStartedAt);
  if (startedAtMs == null) return false;

  const finishedAtMs = toMillis(metadata.lastFinishedAt);
  if (finishedAtMs != null && finishedAtMs >= startedAtMs) return false;

  return nowMs - startedAtMs <= QUOTE_SYNC_RUNNING_TIMEOUT_MS;
}

export function shouldTriggerSilentQuoteRefresh(
  metadata: QuoteSyncMetadata,
  nowMs = Date.now(),
  staleThresholdMs = DEFAULT_QUOTE_SYNC_STALE_THRESHOLD_MS
) {
  if (isQuoteSyncRunning(metadata, nowMs)) return false;

  const lastSuccessAtMs = toMillis(metadata.lastSuccessAt);
  if (lastSuccessAtMs == null) return true;

  return nowMs - lastSuccessAtMs >= staleThresholdMs;
}
