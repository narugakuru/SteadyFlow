/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, gte, like, sql } from "drizzle-orm";

import { netvalue } from "@/db/schema";
import {
  aggregateNetvalueChartPoints,
  buildNetvalueRecord,
  clampNetvaluePage,
  clampNetvaluePageSize,
  DEFAULT_NETVALUE_PAGE_SIZE,
  getNetvalueChartGrain,
  getNetvalueChartStartDate,
  slimNetvalueDataJsonString,
} from "@/lib/services/netvalue-history-helpers";
import type {
  NetvalueChartRange,
  NetvalueChartResponse,
  NetvalueListResponse,
  NetvalueRecord,
} from "@/lib/utils/types";

export interface NetvalueListQuery {
  page?: number;
  pageSize?: number;
}

export async function getAllNetvalueRecords(
  dbClient: any,
  userId: string
): Promise<NetvalueRecord[]> {
  const rows = await dbClient
    .select({
      id: netvalue.id,
      date: netvalue.date,
      totalAssetCny: netvalue.totalAssetCny,
      dataJson: netvalue.dataJson,
    })
    .from(netvalue)
    .where(eq(netvalue.userId, userId))
    .orderBy(desc(netvalue.date));

  return rows.map(buildNetvalueRecord);
}

export async function getNetvalueListPage(
  dbClient: any,
  userId: string,
  query: NetvalueListQuery = {}
): Promise<NetvalueListResponse> {
  const page = clampNetvaluePage(query.page ?? 1);
  const pageSize = clampNetvaluePageSize(query.pageSize ?? DEFAULT_NETVALUE_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  const [countRows, rows] = await Promise.all([
    dbClient
      .select({ count: sql<number>`count(*)` })
      .from(netvalue)
      .where(eq(netvalue.userId, userId)),
    dbClient
      .select({
        id: netvalue.id,
        date: netvalue.date,
        totalAssetCny: netvalue.totalAssetCny,
        dataJson: netvalue.dataJson,
      })
      .from(netvalue)
      .where(eq(netvalue.userId, userId))
      .orderBy(desc(netvalue.date))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const records = rows.map(buildNetvalueRecord);

  return {
    page,
    pageSize,
    total,
    hasMore: offset + records.length < total,
    records,
  };
}

export async function getNetvalueChart(
  dbClient: any,
  userId: string,
  range: NetvalueChartRange,
  now = new Date()
): Promise<NetvalueChartResponse> {
  const grain = getNetvalueChartGrain(range);
  const fromDate = getNetvalueChartStartDate(range, now);

  const rows = await dbClient
    .select({
      id: netvalue.id,
      date: netvalue.date,
      totalAssetCny: netvalue.totalAssetCny,
      dataJson: netvalue.dataJson,
    })
    .from(netvalue)
    .where(
      fromDate
        ? and(eq(netvalue.userId, userId), gte(netvalue.date, fromDate))
        : eq(netvalue.userId, userId)
    )
    .orderBy(asc(netvalue.date));

  const normalizedRows = rows.map(buildNetvalueRecord);

  return {
    range,
    grain,
    points: aggregateNetvalueChartPoints(normalizedRows, grain),
  };
}

export async function backfillSlimNetvalueDataJson(dbClient: any, batchSize = 200) {
  let totalUpdated = 0;

  while (true) {
    const rows = await dbClient
      .select({
        id: netvalue.id,
        dataJson: netvalue.dataJson,
      })
      .from(netvalue)
      .where(like(netvalue.dataJson, '%"accounts"%'))
      .orderBy(asc(netvalue.id))
      .limit(batchSize);

    if (rows.length === 0) {
      return totalUpdated;
    }

    for (const row of rows) {
      const nextDataJson = slimNetvalueDataJsonString(row.dataJson);
      if (!nextDataJson) continue;

      await dbClient
        .update(netvalue)
        .set({ dataJson: nextDataJson })
        .where(eq(netvalue.id, row.id));
      totalUpdated += 1;
    }
  }
}
