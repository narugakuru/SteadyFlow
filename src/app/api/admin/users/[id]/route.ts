import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";

type Role = "admin" | "user";
type Plan = "free" | "pro";

const ROLE_VALUES = new Set<Role>(["admin", "user"]);
const PLAN_VALUES = new Set<Plan>(["free", "pro"]);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { role?: unknown; plan?: unknown };
  const role = typeof body.role === "string" ? body.role : undefined;
  const plan = typeof body.plan === "string" ? body.plan : undefined;

  if (role !== undefined && !ROLE_VALUES.has(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (plan !== undefined && !PLAN_VALUES.has(plan as Plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (role !== undefined && id === userId) {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  const updateData: Partial<{ role: Role; plan: Plan }> = {};
  if (role !== undefined) updateData.role = role as Role;
  if (plan !== undefined) updateData.plan = plan as Plan;

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
