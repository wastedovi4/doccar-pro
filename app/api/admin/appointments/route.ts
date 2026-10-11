import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import {
  APPT_STATUSES,
  clampDuration,
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
  type Appointment,
  type ApptStatus,
} from "@/lib/crm";

export const dynamic = "force-dynamic";

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

function conflictMsg(c: Appointment): string {
  const d = new Date(c.start);
  const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `У механика уже есть запись в это время: ${t} — ${c.clientName}${c.service ? ` (${c.service})` : ""}.`;
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  // Механик видит только свои записи; админ/приёмщик — все.
  const appointments = listAppointments(s.role === "mechanic" ? { mechanicId: s.id } : {});
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

  const result = createAppointment(
    {
      leadId: b.leadId ? String(b.leadId) : undefined,
      clientName: str(b.clientName, 200),
      phone: str(b.phone, 40),
      car: str(b.car, 200),
      service: str(b.service),
      mechanicId: b.mechanicId ? String(b.mechanicId) : undefined,
      start: String(b.start),
      durationMin: clampDuration(b.durationMin),
      status: APPT_STATUSES.includes(b.status) ? (b.status as ApptStatus) : "scheduled",
      note: str(b.note, 2000),
    },
    s.id,
    b.force === true
  );

  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: 400 });
  if ("conflict" in result) {
    return NextResponse.json({ ok: false, conflict: true, error: conflictMsg(result.conflict) }, { status: 409 });
  }
  return NextResponse.json({ ok: true, appointment: result.appt });
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

  const result = updateAppointment(
    String(b?.id ?? ""),
    {
      clientName: typeof b.clientName === "string" ? str(b.clientName, 200) : undefined,
      phone: typeof b.phone === "string" ? str(b.phone, 40) : undefined,
      car: typeof b.car === "string" ? str(b.car, 200) : undefined,
      service: typeof b.service === "string" ? str(b.service) : undefined,
      note: typeof b.note === "string" ? str(b.note, 2000) : undefined,
      mechanicIdSet: b.mechanicId !== undefined,
      mechanicId: b.mechanicId ? String(b.mechanicId) : undefined,
      start: typeof b.start === "string" ? b.start : undefined,
      durationMin: b.durationMin !== undefined ? clampDuration(b.durationMin) : undefined,
      status: typeof b.status === "string" ? (b.status as ApptStatus) : undefined,
    },
    { id: s.id, role: s.role },
    b.force === true
  );

  if ("err" in result) return NextResponse.json({ ok: false }, { status: result.err });
  if ("conflict" in result) {
    return NextResponse.json({ ok: false, conflict: true, error: conflictMsg(result.conflict) }, { status: 409 });
  }
  return NextResponse.json({ ok: true, appointment: result.appt });
}

export async function DELETE(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  deleteAppointment(searchParams.get("id") ?? "");
  return NextResponse.json({ ok: true });
}
