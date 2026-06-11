import { roundForStorage } from "../utils/format.ts";
import type {
  NetvaluePerformanceResponse,
  NetvaluePerformanceSeriesPoint,
} from "../utils/types.ts";

export interface MarketValuePoint {
  date: string;
  value: number;
}

export interface CashFlowPoint {
  date: string;
  amountCny: number;
}

export interface PerformanceStartResolution {
  earliestDate: string | null;
  effectiveStartDate: string | null;
}

function parseIsoDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.toISOString().slice(0, 10) !== dateString) return null;
  return parsed;
}

function daysBetween(start: string, end: string) {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
}

function maxIsoDate(...dates: Array<string | null | undefined>) {
  return (
    dates
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null
  );
}

export function isValidPerformanceStartDate(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseIsoDate(value);
}

export function resolvePerformanceStartDate(
  earliestDate: string | null,
  configuredDate: string | null | undefined,
  rangeStartDate: string | null
): PerformanceStartResolution {
  if (!earliestDate) {
    return { earliestDate: null, effectiveStartDate: null };
  }

  const validConfiguredDate = isValidPerformanceStartDate(configuredDate) ? configuredDate : null;

  return {
    earliestDate,
    effectiveStartDate: maxIsoDate(earliestDate, validConfiguredDate, rangeStartDate),
  };
}

export function computeTwrPerformance(
  marketValues: MarketValuePoint[],
  cashFlows: CashFlowPoint[]
): {
  series: NetvaluePerformanceSeriesPoint[];
  summary: NetvaluePerformanceResponse["summary"];
} {
  const points = [...marketValues]
    .filter((point) => isValidPerformanceStartDate(point.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    return {
      series: [],
      summary: { cumulativeTwr: 0, annualizedTwr: null, days: 0 },
    };
  }

  let cumulativeFactor = 1;
  const series: NetvaluePerformanceSeriesPoint[] = [
    {
      date: points[0].date,
      cumulativeTwr: 0,
      value: roundForStorage(points[0].value, "amount"),
    },
  ];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const intervalFlow = cashFlows
      .filter((flow) => flow.date > previous.date && flow.date <= current.date)
      .reduce((sum, flow) => sum + flow.amountCny, 0);

    const previousValue = previous.value;
    const periodReturn =
      Number.isFinite(previousValue) && previousValue > 0
        ? (current.value - previousValue - intervalFlow) / previousValue
        : 0;

    const safeReturn = Number.isFinite(periodReturn) ? periodReturn : 0;
    cumulativeFactor *= 1 + safeReturn;
    const cumulativeTwr = Number.isFinite(cumulativeFactor) ? cumulativeFactor - 1 : 0;

    series.push({
      date: current.date,
      cumulativeTwr: roundForStorage(cumulativeTwr, "percent"),
      value: roundForStorage(current.value, "amount"),
    });
  }

  const firstDate = series[0].date;
  const lastDate = series.at(-1)?.date ?? firstDate;
  const days = daysBetween(firstDate, lastDate);
  const cumulativeTwr = series.at(-1)?.cumulativeTwr ?? 0;
  const annualizedTwr =
    days >= 365 && 1 + cumulativeTwr > 0
      ? roundForStorage(Math.pow(1 + cumulativeTwr, 365 / days) - 1, "percent")
      : null;

  return {
    series,
    summary: {
      cumulativeTwr,
      annualizedTwr: Number.isFinite(annualizedTwr) ? annualizedTwr : null,
      days,
    },
  };
}
