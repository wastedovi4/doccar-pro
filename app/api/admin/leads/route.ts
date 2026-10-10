import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { tx, read, type LeadStatus } from "@/lib/crm";

export const dynamic = "force-dynamic";

const VALID: LeadStatus[] = ["new", "seen", "processed", "archived"];

export async function GET() {
  const s = await getSession();
  if (!can(s?.role, "admin", "receiver")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = await read();
  return NextResponse.json({ ok: true, leads: db.leads });
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
  const id = String(body?.id ?? "");
  const now = new Date().toISOString();

  const lead = await tx((db) => {
    const l = db.leads.find((x) => x.id === id);
    if (!l) return null;
    if (body.seen && !l.seenAt) {
      l.seenAt = now;
      l.seenBy = s.id;
      if (l.status === "new") l.status = "seen";
    }
    if (body.processed) {
      l.processedAt = now;
      l.processedBy = s.id;
      l.status = "processed";
    }
    if (typeof body.note === "string") l.note = body.note;
    if (typeof body.status === "string" && VALID.includes(body.status)) {
      l.status = body.status;
    }
    if (typeof body.appointmentId === "string") l.appointmentId = body.appointmentId;
    return l;
  });

  if (!lead) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}
