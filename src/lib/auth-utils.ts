import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";

export async function requireUser():
  Promise<
    | { session: null; userId: null; response: NextResponse }
    | { session: Session; userId: string; response: undefined }
  > {
  const session = await auth() as Session | null;
  const userId = session?.user?.id;

  if (!userId) {
    return {
      session: null,
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, userId, response: undefined };
}
