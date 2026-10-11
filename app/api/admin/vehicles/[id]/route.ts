import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { deleteVehicle, updateVehicle } from "@/lib/clients";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function requireManager() {
  const s = await getSession();
  return s && can(s.role, "admin", "receiver") ? s : null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = updateVehicle(params.id, b ?? {});
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: 400 });
  return NextResponse.json({ ok: true, vehicle: res.vehicle });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  const res = deleteVehicle(params.id);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: 409 });
  return NextResponse.json({ ok: true });
}
