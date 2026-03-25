import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { disciplineNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth/auth-utils";

const MAX_TITLE_LEN = 120;
const MAX_QUOTE_LEN = 280;
const MAX_PLAN_LEN = 2000;
const MAX_CONTENT_LEN = 20000;
const DEFAULT_COMPAT_QUOTE = "市场先生每天给你报价，但你不必每天都交易。";

type UpdateNotePayload = {
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

function parseId(rawId: string): number | null {
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validatePayload(
  payload: UpdateNotePayload
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

async function checkOwnership(noteId: number, userId: string) {
  const [note] = await db
    .select({ id: disciplineNotes.id, quote: disciplineNotes.quote })
    .from(disciplineNotes)
    .where(and(eq(disciplineNotes.id, noteId), eq(disciplineNotes.userId, userId)))
    .limit(1);
  return note;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const noteId = parseId(id);
  if (!noteId) {
    return NextResponse.json({ error: "无效的 note id" }, { status: 400 });
  }

  const [note] = await db
    .select()
    .from(disciplineNotes)
    .where(and(eq(disciplineNotes.id, noteId), eq(disciplineNotes.userId, userId)))
    .limit(1);

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const noteId = parseId(id);
  if (!noteId) {
    return NextResponse.json({ error: "无效的 note id" }, { status: 400 });
  }

  const ownedNote = await checkOwnership(noteId, userId);
  if (!ownedNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  let body: UpdateNotePayload;
  try {
    body = (await request.json()) as UpdateNotePayload;
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const [result] = await db
    .update(disciplineNotes)
    .set({
      ...validated.data,
      quote: validated.data.quote ?? ownedNote.quote ?? DEFAULT_COMPAT_QUOTE,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(disciplineNotes.id, noteId), eq(disciplineNotes.userId, userId)))
    .returning();

  return NextResponse.json(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const noteId = parseId(id);
  if (!noteId) {
    return NextResponse.json({ error: "无效的 note id" }, { status: 400 });
  }

  const ownedNote = await checkOwnership(noteId, userId);
  if (!ownedNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  await db
    .delete(disciplineNotes)
    .where(and(eq(disciplineNotes.id, noteId), eq(disciplineNotes.userId, userId)));

  return NextResponse.json({ success: true });
}
