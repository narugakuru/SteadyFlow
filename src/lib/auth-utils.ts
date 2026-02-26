import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      session: null,
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, userId, response: null };
}
