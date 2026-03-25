import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { disciplineNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth/auth-utils";

const MAX_TITLE_LEN = 120;
const MAX_QUOTE_LEN = 280;
const MAX_PLAN_LEN = 2000;
const MAX_CONTENT_LEN = 20000;
const DEFAULT_COMPAT_QUOTE = "市场先生每天给你报价，但你不必每天都交易。";

type CreateNotePayload = {
  title?: unknown;
  quote?: unknown;
  plan?: unknown;
  content?: unknown;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalQuote(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function validatePayload(
  payload: CreateNotePayload
):
  | { ok: true; data: { title: string; quote: string | null; plan: string; content: string } }
  | { ok: false; error: string } {
  const title = normalizeText(payload.title);
  const quote = normalizeOptionalQuote(payload.quote);
  const plan = normalizeText(payload.plan);
  const content = normalizeText(payload.content);

  if (!title || !plan || !content) {
    return { ok: false, error: "title/plan/content 为必填项" };
  }
  if (title.length > MAX_TITLE_LEN) {
    return { ok: false, error: `title 不能超过 ${MAX_TITLE_LEN} 字符` };
  }
  if (quote && quote.length > MAX_QUOTE_LEN) {
    return { ok: false, error: `quote 不能超过 ${MAX_QUOTE_LEN} 字符` };
  }
  if (plan.length > MAX_PLAN_LEN) {
    return { ok: false, error: `plan 不能超过 ${MAX_PLAN_LEN} 字符` };
  }
  if (content.length > MAX_CONTENT_LEN) {
    return { ok: false, error: `content 不能超过 ${MAX_CONTENT_LEN} 字符` };
  }

  return { ok: true, data: { title, quote, plan, content } };
}

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db
    .select()
    .from(disciplineNotes)
    .where(eq(disciplineNotes.userId, userId))
    .orderBy(desc(disciplineNotes.updatedAt), desc(disciplineNotes.id));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  let body: CreateNotePayload;
  try {
    body = (await request.json()) as CreateNotePayload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const [result] = await db
    .insert(disciplineNotes)
    .values({
      userId,
      ...validated.data,
      quote: validated.data.quote ?? DEFAULT_COMPAT_QUOTE,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
