import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { read } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!can(s?.role, "admin")) return NextResponse.json({ ok: false }, { status: 401 });

  const db = await read();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const leadStatus = { new: 0, seen: 0, processed: 0, archived: 0 };
  for (const l of db.leads) leadStatus[l.status]++;

  const apptStatus = { scheduled: 0, in_progress: 0, done: 0, cancelled: 0 };
  for (const a of db.appointments) apptStatus[a.status]++;

  // Заявки по дням за последние 7 дней (включая сегодня)
  const byDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    const count = db.leads.filter((l) => l.createdAt.slice(0, 10) === key).length;
    byDay.push({ date: key, count });
  }

  // Загрузка механиков
  const mechs = db.users.filter((u) => u.role === "mechanic");
  const perMechanic = mechs.map((m) => {
    const list = db.appointments.filter((a) => a.mechanicId === m.id);
    return {
      id: m.id,
      name: m.name,
      total: list.length,
      done: list.filter((a) => a.status === "done").length,
      active: list.filter((a) => a.status === "scheduled" || a.status === "in_progress").length,
    };
  });

  const upcoming = db.appointments.filter(
    (a) => a.status === "scheduled" && new Date(a.start).getTime() >= now
  ).length;

  const totalLeads = db.leads.length;
  const conversion = totalLeads ? Math.round((leadStatus.processed / totalLeads) * 100) : 0;

  return NextResponse.json({
    ok: true,
    stats: {
      totalLeads,
      newLeads: leadStatus.new,
      leadStatus,
      apptStatus,
      byDay,
      perMechanic,
      upcoming,
      doneTotal: apptStatus.done,
      conversion,
      staffCount: db.users.filter((u) => u.active).length,
    },
  });
}
