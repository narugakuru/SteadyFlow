import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";

const ROLE_VALUES = new Set(["admin", "user"]);
const PLAN_VALUES = new Set(["free", "pro"]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role, plan } = body as { role?: string; plan?: string };

  if (role !== undefined && !ROLE_VALUES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (plan !== undefined && !PLAN_VALUES.has(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (role !== undefined && id === userId) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (role !== undefined) updateData.role = role;
  if (plan !== undefined) updateData.plan = plan;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    image: updated.image,
    role: updated.role,
    plan: updated.plan,
    createdAt: updated.createdAt,
  });
}
