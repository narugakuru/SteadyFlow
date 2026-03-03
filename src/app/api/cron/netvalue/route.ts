import { NextResponse } from "next/server";
import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { recordTodayNetvalue } from "@/lib/services/netvalue-service";
import {
  syncHoldingPricesForUser,
  type QuoteSyncStatus,
} from "@/lib/services/holding-price-sync-service";
import { normalizeNetvalueTimeZone } from "@/lib/utils/timezone";

const CURSOR_KEY = "cron.netvalue.cursor";
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_BUDGET_MS = 50_000;
const DEFAULT_SAFE_REMAINING_MS = 6_000;

interface CronUserResult {
  userId: string;
  quoteSyncStatus: QuoteSyncStatus;
  quoteFailureSummary: string | null;
  quoteStats: {
    updated: number;
    failed: number;
    skipped: number;
    total: number;
  };
  netvalue: {
    status: "ok" | "failed";
    date: string | null;
    error?: string;
  };
}

function getCronSecretFromRequest(request: Request): string {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length);
  }
  return request.headers.get("x-cron-secret") ?? "";
}

function parsePositiveInt(raw: string | undefined, fallback: number, min = 1) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function getBatchSize() {
  return parsePositiveInt(process.env.CRON_NETVALUE_BATCH_SIZE, DEFAULT_BATCH_SIZE);
}

function getTimeBudgetMs() {
  return parsePositiveInt(process.env.CRON_NETVALUE_TIME_BUDGET_MS, DEFAULT_BUDGET_MS, 1_000);
}

function getSafeRemainingMs() {
  return parsePositiveInt(
    process.env.CRON_NETVALUE_SAFE_REMAINING_MS,
    DEFAULT_SAFE_REMAINING_MS,
    500
  );
}

function getErrorMessage(error: unknown, fallback = "Unknown error") {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return fallback;
}

function shouldStopForBudget(deadlineMs: number, safeRemainingMs: number) {
  return deadlineMs - Date.now() <= safeRemainingMs;
}

async function readCursorState(userIds: string[]) {
  const [row] = await db
    .select({
      id: settings.id,
      userId: settings.userId,
      value: settings.value,
    })
    .from(settings)
    .where(eq(settings.key, CURSOR_KEY))
    .orderBy(asc(settings.id))
    .limit(1);

  const ownerUserId = row && userIds.includes(row.userId) ? row.userId : userIds[0];

  const parsedCursor = Number.parseInt(row?.value ?? "0", 10);
  const normalizedCursor = Number.isFinite(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;
  const cursor = userIds.length > 0 ? normalizedCursor % userIds.length : 0;

  return { ownerUserId, cursor };
}

async function saveCursorState(ownerUserId: string, cursor: number) {
  const cursorValue = String(Math.max(0, cursor));
  const [existing] = await db
    .select({ id: settings.id })
    .from(settings)
    .where(and(eq(settings.userId, ownerUserId), eq(settings.key, CURSOR_KEY)))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({ value: cursorValue })
      .where(and(eq(settings.userId, ownerUserId), eq(settings.key, CURSOR_KEY)));
  } else {
    await db.insert(settings).values({
      userId: ownerUserId,
      key: CURSOR_KEY,
      value: cursorValue,
    });
  }

  await db
    .delete(settings)
    .where(and(eq(settings.key, CURSOR_KEY), ne(settings.userId, ownerUserId)));
}

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const requestSecret = getCronSecretFromRequest(request);
  if (!requestSecret || requestSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const now = new Date();
  const allUsers = await db.select({ id: users.id }).from(users).orderBy(asc(users.id));
  if (allUsers.length === 0) {
    return NextResponse.json({
      scannedUsers: 0,
      triggeredUsers: 0,
      succeeded: 0,
      failed: 0,
      processedUsers: 0,
      remainingUsers: 0,
      batchSize: getBatchSize(),
      budgetMs: getTimeBudgetMs(),
      safeRemainingMs: getSafeRemainingMs(),
      cursor: { start: 0, next: 0, reset: true },
      quoteTotals: { updated: 0, failed: 0, skipped: 0 },
      mode: "daily-once-per-user",
      executedAt: now.toISOString(),
      userResults: [] as CronUserResult[],
    });
  }

  const userIds = allUsers.map((user: { id: string }) => user.id);
  const timezoneRows = await db
    .select({
      userId: settings.userId,
      value: settings.value,
    })
    .from(settings)
    .where(and(eq(settings.key, "netvalue.timezone"), inArray(settings.userId, userIds)));
  const timeZoneMap = new Map<string, string>(
    timezoneRows.map((row: { userId: string; value: string }) => [
      row.userId,
      normalizeNetvalueTimeZone(row.value),
    ])
  );

  const { ownerUserId, cursor: startCursor } = await readCursorState(userIds);
  const batchSize = getBatchSize();
  const budgetMs = getTimeBudgetMs();
  const safeRemainingMs = getSafeRemainingMs();
  const deadlineMs = Date.now() + budgetMs;

  let triggeredUsers = 0;
  let succeeded = 0;
  let failed = 0;
  let processedUsers = 0;
  let stoppedByBudget = false;
  const quoteTotals = {
    updated: 0,
    failed: 0,
    skipped: 0,
  };
  const quoteStatusTotals: Record<QuoteSyncStatus, number> = {
    ok: 0,
    partial: 0,
    failed: 0,
  };
  const userResults: CronUserResult[] = [];
  const triggeredDates: Record<string, string> = {};

  for (let batchStart = startCursor; batchStart < allUsers.length; batchStart += batchSize) {
    if (shouldStopForBudget(deadlineMs, safeRemainingMs)) {
      stoppedByBudget = true;
      break;
    }

    const batchEnd = Math.min(batchStart + batchSize, allUsers.length);
    for (let index = batchStart; index < batchEnd; index += 1) {
      if (shouldStopForBudget(deadlineMs, safeRemainingMs)) {
        stoppedByBudget = true;
        break;
      }

      const user = allUsers[index] as { id: string };
      const timeZone = timeZoneMap.get(user.id) ?? normalizeNetvalueTimeZone(undefined);
      triggeredUsers += 1;
      processedUsers += 1;

      let quoteSyncStatus: QuoteSyncStatus = "failed";
      let quoteFailureSummary: string | null = null;
      const quoteStats = {
        updated: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      };

      try {
        const quoteResult = await syncHoldingPricesForUser(user.id);
        quoteSyncStatus = quoteResult.quoteSyncStatus;
        quoteFailureSummary = quoteResult.quoteFailureSummary;
        quoteStats.updated = quoteResult.stats.updated;
        quoteStats.failed = quoteResult.stats.failed;
        quoteStats.skipped = quoteResult.stats.skipped;
        quoteStats.total = quoteResult.stats.total;
      } catch (error) {
        quoteSyncStatus = "failed";
        quoteFailureSummary = `报价同步异常: ${getErrorMessage(error, "未获取到异常详情")}`;
      }

      quoteTotals.updated += quoteStats.updated;
      quoteTotals.failed += quoteStats.failed;
      quoteTotals.skipped += quoteStats.skipped;
      quoteStatusTotals[quoteSyncStatus] += 1;

      try {
        const netvalueResult = await recordTodayNetvalue(user.id, { timeZone, now });
        triggeredDates[user.id] = netvalueResult.date;
        succeeded += 1;

        userResults.push({
          userId: user.id,
          quoteSyncStatus,
          quoteFailureSummary,
          quoteStats,
          netvalue: {
            status: "ok",
            date: netvalueResult.date,
          },
        });
      } catch (error) {
        failed += 1;
        const message = getErrorMessage(error);
        console.error(`[cron/netvalue] failed for user ${user.id}`, error);

        userResults.push({
          userId: user.id,
          quoteSyncStatus,
          quoteFailureSummary,
          quoteStats,
          netvalue: {
            status: "failed",
            date: null,
            error: message,
          },
        });
      }
    }

    if (stoppedByBudget) break;
  }

  const rawNextCursor = startCursor + processedUsers;
  const cursorReset = rawNextCursor >= allUsers.length;
  const nextCursor = cursorReset ? 0 : rawNextCursor;
  const remainingUsers = Math.max(allUsers.length - rawNextCursor, 0);
  await saveCursorState(ownerUserId, nextCursor);

  return NextResponse.json({
    scannedUsers: allUsers.length,
    triggeredUsers,
    succeeded,
    failed,
    processedUsers,
    remainingUsers,
    batchSize,
    budgetMs,
    safeRemainingMs,
    stoppedByBudget,
    cursor: {
      ownerUserId,
      start: startCursor,
      next: nextCursor,
      reset: cursorReset,
    },
    quoteTotals,
    quoteStatusTotals,
    mode: "daily-once-per-user",
    triggeredDates,
    executedAt: now.toISOString(),
    userResults,
  });
}
