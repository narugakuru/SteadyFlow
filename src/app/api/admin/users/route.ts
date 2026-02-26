import { NextResponse } from "next/server";
import { db } from "@/db";
import { authAccounts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-utils";

export async function GET() {
  const { session, userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.select().from(users);
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

  const result = allUsers.map((user: any) => {
    const providers = Array.from(providerMap.get(user.id) ?? []);
    const loginMethods = [
      ...(user.password ? ["password"] : []),
      ...providers,
    ];

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
