import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { read } from "@/lib/crm";

export const dynamic = "force-dynamic";

/**
 * Лёгкий фид для авто-обновления и уведомлений.
 * Приёмщик/владелец: последние запросы. Механик: свои записи.
 * Клиент сам решает, что «новое» (по времени последнего просмотра).
 */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const db = await read();
  const now = new Date().toISOString();

  const manager = can(s.role, "admin", "receiver");
  const leads = manager
    ? db.leads
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 30)
        .map((l) => ({ id: l.id, name: l.name, car: l.car, createdAt: l.createdAt, status: l.status }))
    : [];

  const myAppts = (s.role === "mechanic" ? db.appointments.filter((a) => a.mechanicId === s.id) : db.appointments)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 30)
    .map((a) => ({
      id: a.id,
      clientName: a.clientName,
      start: a.start,
      status: a.status,
      createdAt: a.createdAt,
      mechanicId: a.mechanicId,
    }));

  return NextResponse.json({
    ok: true,
    role: s.role,
    now,
    newLeads: manager ? db.leads.filter((l) => l.status === "new").length : 0,
    leads,
    appointments: myAppts,
  });
}
