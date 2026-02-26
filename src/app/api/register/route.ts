import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { assetClasses, settings, users } from "@/db/schema";

const DEFAULT_ASSET_CLASSES = [
  { name: "股票基金", targetPct: 40 },
  { name: "黄金", targetPct: 20 },
  { name: "债券", targetPct: 25 },
  { name: "现金", targetPct: 15 },
];

const DEFAULT_SETTINGS = [
  { key: "warning_threshold", value: "5" },
  { key: "danger_threshold", value: "15" },
];

async function seedUserData(userId: string) {
  const existingClasses = await db.select().from(assetClasses).where(eq(assetClasses.userId, userId));
  if (existingClasses.length === 0) {
    await db.insert(assetClasses).values(
      DEFAULT_ASSET_CLASSES.map((item) => ({
        ...item,
        userId,
      }))
    );
  }

  for (const setting of DEFAULT_SETTINGS) {
    const existingSetting = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, setting.key)));

    if (existingSetting.length === 0) {
      await db.insert(settings).values({
        userId,
        key: setting.key,
        value: setting.value,
      });
    }
  }
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码为必填" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const isFirstUser = Number(count) === 0;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      email,
      password: hashedPassword,
      role: isFirstUser ? "admin" : "user",
      plan: "free",
    });

    const [createdUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (createdUser) {
      await seedUserData(createdUser.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败，请稍后再试" }, { status: 500 });
  }
}
