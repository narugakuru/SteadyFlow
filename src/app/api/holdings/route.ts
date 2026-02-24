import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings } from "@/db/schema";

export async function GET() {
  const rows = db.select().from(holdings).all();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, name, marketValue, assetClass } = body;

  if (!accountId || !name || marketValue == null || !assetClass) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = db
    .insert(holdings)
    .values({ accountId, name, marketValue, assetClass })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
