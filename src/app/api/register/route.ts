import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { seedUserData } from "@/lib/user-seed";

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
