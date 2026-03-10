import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth-utils";
import {
  buildPortfolioDecisionSnapshot,
  buildPortfolioSnapshot,
} from "@/lib/services/portfolio-snapshot-service";

type ExportDetail = "full" | "decision";

function normalizeDetail(raw: string | null): ExportDetail {
  if (raw === "decision") return "decision";
  return "full";
}

function buildDownloadFilename(isoString: string, detail: ExportDetail) {
  const prefix = detail === "decision" ? "portfolio-decision-export" : "portfolio-export";
  return `${prefix}-${isoString.replace(/[:]/g, "-")}.json`;
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  if (format && format !== "json") {
    return NextResponse.json({ error: "仅支持 json 导出格式" }, { status: 400 });
  }

  const detail = normalizeDetail(searchParams.get("detail"));
  const snapshot =
    detail === "decision"
      ? await buildPortfolioDecisionSnapshot(userId)
      : await buildPortfolioSnapshot(userId);
  if (searchParams.get("download") !== "1") {
    return NextResponse.json(snapshot);
  }

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildDownloadFilename(
        snapshot.meta.generatedAt,
        detail
      )}"`,
    },
  });
}
