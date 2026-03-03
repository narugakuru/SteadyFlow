import { NextResponse } from "next/server";
import { db } from "@/db";
import { authAccounts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/auth-utils";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "user";
  plan: "free" | "pro";
  password: string | null;
  createdAt: string;
};

export async function GET() {
  const { session, userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = (await db.select().from(users)) as AdminUserRow[];
  const accountRows = await db
    .select({ userId: authAccounts.userId, provider: authAccounts.provider })
    .from(authAccounts);

  const providerMap = new Map<string, Set<string>>();
  for (const row of accountRows) {
    if (!providerMap.has(row.userId)) {
      providerMap.set(row.userId, new Set());
    }
    providerMap.get(row.userId)!.add(row.provider);
  }

  const result = allUsers.map((user) => {
    const providers = Array.from(providerMap.get(user.id) ?? []);
    const loginMethods = [...(user.password ? ["password"] : []), ...providers];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      loginMethods,
    };
  });

  return NextResponse.json(result);
}
