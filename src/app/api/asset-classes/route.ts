import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = db.select().from(assetClasses).all();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body as { name: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.name, name.trim()))
    .get();

  if (existing) {
    return NextResponse.json({ error: "该类别已存在" }, { status: 400 });
  }

  const result = db
    .insert(assetClasses)
    .values({ name: name.trim(), targetPct: 0 })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { classes } = body as {
    classes: { id: number; targetPct: number }[];
  };

  if (!classes || !Array.isArray(classes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate total = 100%
  const total = classes.reduce((sum, c) => sum + c.targetPct, 0);
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json(
      { error: "目标占比总和必须为 100%" },
      { status: 400 }
    );
  }

  for (const cls of classes) {
    db.update(assetClasses)
      .set({ targetPct: cls.targetPct })
      .where(eq(assetClasses.id, cls.id))
      .run();
  }

  const updated = db.select().from(assetClasses).all();
  return NextResponse.json(updated);
}
