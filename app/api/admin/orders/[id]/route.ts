import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkOrder, updateWorkOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const order = getWorkOrder(params.id, s);
  if (!order) return NextResponse.json({ ok: false, error: "Заказ-наряд не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = updateWorkOrder(
    params.id,
    {
      status: typeof b?.status === "string" ? b.status : undefined,
      mechanicId: b?.mechanicId === null || typeof b?.mechanicId === "string" ? b.mechanicId : undefined,
      vehicleId: b?.vehicleId === null || typeof b?.vehicleId === "string" ? b.vehicleId : undefined,
      complaint: typeof b?.complaint === "string" ? b.complaint : undefined,
      mileage: b?.mileage,
      note: typeof b?.note === "string" ? b.note : undefined,
    },
    s
  );
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, order: res.order });
}
