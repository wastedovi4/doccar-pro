import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { addVehicle } from "@/lib/clients";

export const dynamic = "force-dynamic";

/** Добавить автомобиль клиенту. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = addVehicle(params.id, b ?? {});
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: 400 });
  return NextResponse.json({ ok: true, vehicle: res.vehicle });
}
