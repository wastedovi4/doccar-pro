import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { getStats } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!can(s?.role, "admin")) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, stats: getStats() });
}
