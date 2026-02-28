import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetClasses } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { roundForStorage } from "@/lib/format";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId))
    .orderBy(asc(assetClasses.sortOrder), asc(assetClasses.id));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(assetClasses)
    .where(and(eq(assetClasses.userId, userId), eq(assetClasses.name, name.trim())));

  if (existing) {
    return NextResponse.json({ error: "该类别已存在" }, { status: 400 });
  }

  const [lastClass] = await db
    .select({ sortOrder: assetClasses.sortOrder })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId))
    .orderBy(desc(assetClasses.sortOrder), desc(assetClasses.id))
    .limit(1);
  const nextSortOrder = (lastClass?.sortOrder ?? 0) + 1;

  const [result] = await db
    .insert(assetClasses)
    .values({ userId, name: name.trim(), targetPct: 0, sortOrder: nextSortOrder })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { classes } = body as {
    classes: { id: number; targetPct: number; sortOrder?: number }[];
  };

  if (!classes || !Array.isArray(classes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate total = 100%
  const normalizedClasses = classes.map((c) => ({
    ...c,
    targetPct: roundForStorage(c.targetPct, "percent"),
  }));
  const total = normalizedClasses.reduce((sum, c) => sum + c.targetPct, 0);
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "目标占比总和必须为 100%" }, { status: 400 });
  }

  for (const cls of normalizedClasses) {
    await db
      .update(assetClasses)
      .set({
        targetPct: cls.targetPct,
        ...(typeof cls.sortOrder === "number" ? { sortOrder: cls.sortOrder } : {}),
      })
      .where(and(eq(assetClasses.id, cls.id), eq(assetClasses.userId, userId)));
  }

  const updated = await db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId))
    .orderBy(asc(assetClasses.sortOrder), asc(assetClasses.id));
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { id } = body as { id: number };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const [result] = await db
    .delete(assetClasses)
    .where(and(eq(assetClasses.id, Number(id)), eq(assetClasses.userId, userId)))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Asset class not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
