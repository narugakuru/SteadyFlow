import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function requireUser(): Promise<
  | { session: null; userId: null; response: NextResponse }
  | { session: Session; userId: string; response: undefined }
> {
  const session = (await auth()) as Session | null;
  const userId = session?.user?.id;

  if (!userId) {
    return {
      session: null,
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Guard against stale JWT sessions after DB reset/switch.
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return {
      session: null,
      userId: null,
      response: NextResponse.json({ error: "登录态失效：用户不存在，请重新登录" }, { status: 401 }),
    };
  }

  return { session, userId, response: undefined };
}
