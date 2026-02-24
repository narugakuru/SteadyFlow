import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = db.select().from(assetClasses).all();
  return NextResponse.json(rows);
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
