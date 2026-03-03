export const DEFAULT_NETVALUE_TIMEZONE = "Asia/Shanghai";

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeNetvalueTimeZone(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_NETVALUE_TIMEZONE;
  }
  const trimmed = raw.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) {
    return DEFAULT_NETVALUE_TIMEZONE;
  }
  return trimmed;
}

export function getDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTimePartsInTimeZone(
  date: Date,
  timeZone: string
): {
  hour: number;
  minute: number;
  date: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}
