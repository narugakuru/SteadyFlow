import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "../utils/asset-class.ts";
import { roundForStorage } from "../utils/format.ts";
import type {
  NetvalueAllocationSnapshot,
  NetvalueChartGrain,
  NetvalueChartPoint,
  NetvalueChartRange,
  NetvalueRecord,
  NetvalueSnapshotData,
} from "../utils/types.ts";

export const DEFAULT_NETVALUE_PAGE_SIZE = 30;
export const MAX_NETVALUE_PAGE_SIZE = 200;
export const NETVALUE_CHART_RANGE_ORDER: NetvalueChartRange[] = ["30d", "90d", "1y", "3y", "all"];

export const NETVALUE_CHART_GRAIN_BY_RANGE: Record<NetvalueChartRange, NetvalueChartGrain> = {
  "30d": "day",
  "90d": "day",
  "1y": "week",
  "3y": "month",
  all: "month",
};

function sortByDefaultAssetClassOrder<T extends { name: string; sortOrder?: number; id?: number }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aOrder = getDefaultAssetClassOrderIndex(a.name);
    const bOrder = getDefaultAssetClassOrderIndex(b.name);
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aSort - bSort || (a.id ?? 0) - (b.id ?? 0);
  });
}

function parseIsoDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function startOfIsoWeek(date: Date) {
  const next = new Date(date.getTime());
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() - (day - 1));
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function getWeekBucketKey(dateString: string) {
  return formatIsoDate(startOfIsoWeek(parseIsoDate(dateString)));
}

function getMonthBucketKey(dateString: string) {
  return dateString.slice(0, 7);
}

export function clampNetvaluePage(page: number) {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function clampNetvaluePageSize(pageSize: number) {
  if (!Number.isFinite(pageSize) || pageSize < 1) return DEFAULT_NETVALUE_PAGE_SIZE;
  return Math.min(MAX_NETVALUE_PAGE_SIZE, Math.floor(pageSize));
}

export function isNetvalueChartRange(
  value: string | null | undefined
): value is NetvalueChartRange {
  return typeof value === "string" && value in NETVALUE_CHART_GRAIN_BY_RANGE;
}

export function getNetvalueChartGrain(range: NetvalueChartRange): NetvalueChartGrain {
  return NETVALUE_CHART_GRAIN_BY_RANGE[range];
}

export function getNetvalueChartStartDate(range: NetvalueChartRange, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (range) {
    case "30d":
      return formatIsoDate(subtractDays(today, 29));
    case "90d":
      return formatIsoDate(subtractDays(today, 89));
    case "1y":
      return formatIsoDate(subtractDays(today, 364));
    case "3y":
      return formatIsoDate(subtractDays(today, 365 * 3 - 1));
    case "all":
      return null;
  }
}

export function normalizeAllocationSnapshot(rows: NetvalueAllocationSnapshot[]) {
  const merged = new Map<string, NetvalueAllocationSnapshot>();

  for (const row of rows) {
    const normalizedName = normalizeAssetClassName(row.name);
    const existing = merged.get(normalizedName);
    if (!existing) {
      merged.set(normalizedName, { ...row, name: normalizedName });
      continue;
    }

    existing.actualValue = roundForStorage(existing.actualValue + row.actualValue, "amount");
    existing.actualPct = roundForStorage(existing.actualPct + row.actualPct, "percent");
  }

  return sortByDefaultAssetClassOrder(
    Array.from(merged.values()).map((item, index) => ({
      ...item,
      sortOrder: getDefaultAssetClassOrderIndex(item.name),
      id: index,
    }))
  ).map(({ name, actualValue, actualPct }) => ({ name, actualValue, actualPct }));
}

export function normalizeNetvalueSnapshotData(input: unknown): NetvalueSnapshotData {
  if (!input || typeof input !== "object") {
    return { allocation: [], rates: {} };
  }

  const candidate = input as {
    allocation?: unknown;
    rates?: unknown;
  };

  const allocation = Array.isArray(candidate.allocation)
    ? normalizeAllocationSnapshot(
        candidate.allocation
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            return {
              name: String(row.name ?? "").trim(),
              actualValue: Number(row.actualValue ?? 0),
              actualPct: Number(row.actualPct ?? 0),
            };
          })
          .filter(
            (item): item is NetvalueAllocationSnapshot => item !== null && item.name.length > 0
          )
      )
    : [];

  const rates =
    candidate.rates && typeof candidate.rates === "object" && !Array.isArray(candidate.rates)
      ? Object.fromEntries(
          Object.entries(candidate.rates as Record<string, unknown>).map(([pair, value]) => [
            pair,
            Number(value ?? 0),
          ])
        )
      : {};

  return { allocation, rates };
}

export function parseNetvalueDataJson(dataJson: string) {
  try {
    return normalizeNetvalueSnapshotData(JSON.parse(dataJson));
  } catch {
    return normalizeNetvalueSnapshotData(null);
  }
}

export function slimNetvalueDataJsonString(dataJson: string) {
  try {
    const parsed = JSON.parse(dataJson) as { accounts?: unknown } | null;
    if (!parsed || typeof parsed !== "object" || !("accounts" in parsed)) {
      return null;
    }

    return JSON.stringify(normalizeNetvalueSnapshotData(parsed));
  } catch {
    return null;
  }
}

export function buildNetvalueRecord(row: {
  id: number;
  date: string;
  totalAssetCny: number;
  dataJson: string;
}): NetvalueRecord {
  return {
    id: row.id,
    date: row.date,
    totalAssetCny: row.totalAssetCny,
    dataJson: parseNetvalueDataJson(row.dataJson),
  };
}

export function aggregateNetvalueChartPoints(
  records: NetvalueRecord[],
  grain: NetvalueChartGrain
): NetvalueChartPoint[] {
  if (grain === "day") {
    return records.map((record) => ({
      date: record.date,
      totalAssetCny: record.totalAssetCny,
      allocation: record.dataJson.allocation,
    }));
  }

  const buckets = new Map<string, NetvalueChartPoint>();

  for (const record of records) {
    const key = grain === "week" ? getWeekBucketKey(record.date) : getMonthBucketKey(record.date);
    buckets.set(key, {
      date: record.date,
      totalAssetCny: record.totalAssetCny,
      allocation: record.dataJson.allocation,
    });
  }

  return Array.from(buckets.values());
}
