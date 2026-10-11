import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { getLaborRate, setLaborRate } from "@/lib/order-items";

export const dynamic = "force-dynamic";

/** Настройки CRM: стоимость нормо-часа (копейки). Читают менеджеры, меняет владелец. */
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, laborRate: getLaborRate() });
}

export async function PUT(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin")) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, laborRate: setLaborRate(b?.laborRate) });
}
