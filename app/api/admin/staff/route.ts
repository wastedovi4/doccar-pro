import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { read } from "@/lib/crm";

export const dynamic = "force-dynamic";

/** Лёгкий справочник сотрудников (id, имя, роль) для календаря и фильтров. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const db = await read();
  const staff = db.users
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, name: u.name, role: u.role }));
  return NextResponse.json({ ok: true, staff });
}
