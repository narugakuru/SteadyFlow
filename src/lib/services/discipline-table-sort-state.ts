export type DisciplineDetailSortKey = "amount" | "pnl";
export type DisciplineDetailSortDirection = "desc" | "asc";
export type DisciplineDetailSortState = {
  key: DisciplineDetailSortKey;
  direction: DisciplineDetailSortDirection;
} | null;

const DISCIPLINE_DETAIL_SORT_STORAGE_KEY = "steadyflow.dashboard.discipline-detail-sort";

function isDisciplineDetailSortKey(value: unknown): value is DisciplineDetailSortKey {
  return value === "amount" || value === "pnl";
}

function isDisciplineDetailSortDirection(value: unknown): value is DisciplineDetailSortDirection {
  return value === "desc" || value === "asc";
}

export function readDisciplineDetailSortState(): DisciplineDetailSortState {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(DISCIPLINE_DETAIL_SORT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as {
      key?: unknown;
      direction?: unknown;
    };

    if (
      !isDisciplineDetailSortKey(parsed.key) ||
      !isDisciplineDetailSortDirection(parsed.direction)
    ) {
      return null;
    }

    return {
      key: parsed.key,
      direction: parsed.direction,
    };
  } catch {
    return null;
  }
}

export function writeDisciplineDetailSortState(state: DisciplineDetailSortState) {
  if (typeof window === "undefined") return;

  try {
    if (!state) {
      window.localStorage.removeItem(DISCIPLINE_DETAIL_SORT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(DISCIPLINE_DETAIL_SORT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write failures and keep in-memory state only.
  }
}

export function getNextDisciplineDetailSortState(
  previous: DisciplineDetailSortState,
  key: DisciplineDetailSortKey
): DisciplineDetailSortState {
  if (!previous || previous.key !== key) {
    return { key, direction: "desc" };
  }

  if (previous.direction === "desc") {
    return { key, direction: "asc" };
  }

  return null;
}
