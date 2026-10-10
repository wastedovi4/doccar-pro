import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { tx, read, uid, type Appointment, type ApptStatus } from "@/lib/crm";

export const dynamic = "force-dynamic";

const STATUSES: ApptStatus[] = ["scheduled", "in_progress", "done", "cancelled"];

function clampDuration(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 60;
  return Math.min(600, Math.max(15, Math.round(n)));
}

/** Пересечение по времени у того же механика (без учёта отменённых). */
function conflictsFor(
  list: Appointment[],
  mechanicId: string | undefined,
  start: string,
  durationMin: number,
  excludeId?: string
): Appointment | null {
  if (!mechanicId) return null;
  const aStart = new Date(start).getTime();
  const aEnd = aStart + durationMin * 60000;
  for (const x of list) {
    if (x.id === excludeId) continue;
    if (x.mechanicId !== mechanicId) continue;
    if (x.status === "cancelled") continue;
    const bStart = new Date(x.start).getTime();
    const bEnd = bStart + x.durationMin * 60000;
    if (aStart < bEnd && bStart < aEnd) return x;
  }
  return null;
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const db = await read();
  // Механик видит только свои записи; админ/приёмщик — все.
  const appointments =
    s.role === "mechanic" ? db.appointments.filter((a) => a.mechanicId === s.id) : db.appointments;
  return NextResponse.json({ ok: true, appointments });
}

export async function POST(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  if (!b?.start || !b?.clientName) {
    return NextResponse.json({ ok: false, error: "Нужны клиент и время" }, { status: 400 });
  }

  const appt: Appointment = {
    id: uid(),
    leadId: b.leadId ? String(b.leadId) : undefined,
    clientName: String(b.clientName).trim(),
    phone: String(b.phone ?? "").trim(),
    car: String(b.car ?? "").trim(),
    service: String(b.service ?? "").trim(),
    mechanicId: b.mechanicId ? String(b.mechanicId) : undefined,
    start: String(b.start),
    durationMin: clampDuration(b.durationMin),
    status: STATUSES.includes(b.status) ? b.status : "scheduled",
    note: String(b.note ?? "").trim(),
    createdBy: s.id,
    createdAt: new Date().toISOString(),
  };

  const outcome = await tx<{ conflict?: Appointment; appt?: Appointment }>((db) => {
    if (!b.force) {
      const c = conflictsFor(db.appointments, appt.mechanicId, appt.start, appt.durationMin);
      if (c) return { conflict: c };
    }
    db.appointments.push(appt);
    // Если запись создана из запроса — связать и пометить обработанным.
    if (appt.leadId) {
      const lead = db.leads.find((l) => l.id === appt.leadId);
      if (lead) {
        lead.appointmentId = appt.id;
        lead.status = "processed";
        if (!lead.processedAt) {
          lead.processedAt = appt.createdAt;
          lead.processedBy = s.id;
        }
      }
    }
    return { appt };
  });

  if (outcome.conflict) {
    return NextResponse.json(
      { ok: false, conflict: true, error: conflictMsg(outcome.conflict) },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, appointment: outcome.appt });
}

function conflictMsg(c: Appointment): string {
  const d = new Date(c.start);
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `У механика уже есть запись в это время: ${t} — ${c.clientName}${c.service ? ` (${c.service})` : ""}.`;
}

export async function PATCH(request: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const id = String(b?.id ?? "");

  const result = await tx<{ err?: number; conflict?: Appointment; appt?: Appointment }>((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) return { err: 404 };
    const isOwnerMech = s.role === "mechanic" && a.mechanicId === s.id;
    const isManager = can(s.role, "admin", "receiver");
    if (!isManager && !isOwnerMech) return { err: 403 };

    if (isManager) {
      // Проверка пересечения по прогнозируемым значениям (до мутации).
      const nextMech = b.mechanicId !== undefined ? (b.mechanicId ? String(b.mechanicId) : undefined) : a.mechanicId;
      const nextStart = typeof b.start === "string" ? b.start : a.start;
      const nextDur = b.durationMin !== undefined ? clampDuration(b.durationMin) : a.durationMin;
      const timeChanged = b.mechanicId !== undefined || typeof b.start === "string" || b.durationMin !== undefined;
      if (!b.force && timeChanged) {
        const c = conflictsFor(db.appointments, nextMech, nextStart, nextDur, a.id);
        if (c) return { conflict: c };
      }

      if (typeof b.clientName === "string") a.clientName = b.clientName.trim();
      if (typeof b.phone === "string") a.phone = b.phone.trim();
      if (typeof b.car === "string") a.car = b.car.trim();
      if (typeof b.service === "string") a.service = b.service.trim();
      if (typeof b.note === "string") a.note = b.note.trim();
      if (b.mechanicId !== undefined) a.mechanicId = b.mechanicId ? String(b.mechanicId) : undefined;
      if (typeof b.start === "string") a.start = b.start;
      if (b.durationMin !== undefined) a.durationMin = clampDuration(b.durationMin);
    }
    // Механик может менять только статус своей записи.
    if (typeof b.status === "string" && STATUSES.includes(b.status)) a.status = b.status;
    return { appt: a };
  });

  if (result.err) {
    return NextResponse.json({ ok: false }, { status: result.err });
  }
  if (result.conflict) {
    return NextResponse.json(
      { ok: false, conflict: true, error: conflictMsg(result.conflict) },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, appointment: result.appt });
}

export async function DELETE(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  await tx((db) => {
    db.appointments = db.appointments.filter((a) => a.id !== id);
    const lead = db.leads.find((l) => l.appointmentId === id);
    if (lead) lead.appointmentId = undefined;
  });
  return NextResponse.json({ ok: true });
}
