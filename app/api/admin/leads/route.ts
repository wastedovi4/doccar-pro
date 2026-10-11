import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { deleteLead, listLeads, updateLead } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!can(s?.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, leads: listLeads() });
}

export async function PATCH(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  const lead = updateLead(
    String(body?.id ?? ""),
    {
      seen: body?.seen === true,
      processed: body?.processed === true,
      note: typeof body?.note === "string" ? body.note.slice(0, 2000) : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      appointmentId: typeof body?.appointmentId === "string" ? body.appointmentId : undefined,
    },
    s.id
  );

  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

/** Удалить заявку (спам, тест) — только владелец. Заявку с записью — только в архив. */
export async function DELETE(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const res = deleteLead(id);
  if (res === "not_found") return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (res === "has_appointment") {
    return NextResponse.json(
      { ok: false, error: "Из заявки создана запись — её можно только отправить в архив" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
