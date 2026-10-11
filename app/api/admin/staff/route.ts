import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listStaff } from "@/lib/crm";

export const dynamic = "force-dynamic";

/** Лёгкий справочник сотрудников (id, имя, роль) для календаря и фильтров. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, staff: listStaff() });
}
