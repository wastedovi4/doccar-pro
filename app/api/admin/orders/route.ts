import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { intake, listWorkOrders, type OrderScope } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Список заказ-нарядов: active | closed | all. Механик — только свои. */
export async function GET(request: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const scope = (new URL(request.url).searchParams.get("scope") ?? "active") as OrderScope;
  const orders = listWorkOrders({ scope: ["active", "closed", "all"].includes(scope) ? scope : "active", viewer: s });
  return NextResponse.json({ ok: true, orders });
}

/** Приёмка: «Клиент приехал» (по записи или без неё) → заказ-наряд. */
export async function POST(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const res = intake(
    {
      appointmentId: str(b?.appointmentId),
      client: { id: str(b?.client?.id), name: str(b?.client?.name), phone: str(b?.client?.phone), email: str(b?.client?.email) },
      vehicle: b?.vehicle
        ? {
            id: str(b.vehicle.id),
            make: str(b.vehicle.make),
            model: str(b.vehicle.model),
            year: b.vehicle.year,
            plate: str(b.vehicle.plate),
            vin: str(b.vehicle.vin),
          }
        : null,
      mileage: b?.mileage,
      complaint: str(b?.complaint),
      mechanicId: str(b?.mechanicId),
    },
    s.id
  );
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, order: res.order, clientCreated: res.clientCreated });
}
