import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-access";
import { createLkBooking } from "@/lib/lk";

export const dynamic = "force-dynamic";

/** Запись на сервис из личного кабинета → заявка в CRM с привязкой к клиенту. */
export async function POST(request: Request) {
  const s = getClientSession();
  if (!s) return NextResponse.json({ ok: false, error: "Войдите в кабинет по ссылке" }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const res = createLkBooking(s.clientId, {
    vehicleId: str(b?.vehicleId),
    service: str(b?.service),
    message: str(b?.message),
    when: str(b?.when),
  });
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
