import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth-utils";

export async function GET() {
  const { session, userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.select().from(users);
  const total = allUsers.length;
  const today = new Date().toISOString().slice(0, 10);

  const roles = { admin: 0, user: 0 } as Record<string, number>;
  const plans = { free: 0, pro: 0 } as Record<string, number>;
  let newToday = 0;

  for (const user of allUsers) {
    if (user.createdAt?.slice(0, 10) === today) {
      newToday += 1;
    }
    roles[user.role] = (roles[user.role] ?? 0) + 1;
    plans[user.plan] = (plans[user.plan] ?? 0) + 1;
  }

  return NextResponse.json({
    total,
    newToday,
    roles,
    plans,
  });
}
