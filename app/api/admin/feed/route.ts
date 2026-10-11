import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFeed } from "@/lib/crm";

export const dynamic = "force-dynamic";

/**
 * Лёгкий фид для авто-обновления и уведомлений.
 * Приёмщик/владелец: последние запросы. Механик: свои записи.
 * Клиент сам решает, что «новое» (по времени последнего просмотра).
 */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, role: s.role, now: new Date().toISOString(), ...getFeed(s) });
}
