import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { findClientByPhone, listVehicles } from "@/lib/clients";
import { listWorkOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Клиент по телефону (склейка при приёмке): профиль, машины, число визитов. */
export async function GET(request: Request) {
  const s = await getSession();
  if (!s || !can(s.role, "admin", "receiver")) return NextResponse.json({ ok: false }, { status: 401 });
  const phone = new URL(request.url).searchParams.get("phone") ?? "";
  const client = findClientByPhone(phone);
  if (!client) return NextResponse.json({ ok: true, client: null });
  return NextResponse.json({
    ok: true,
    client,
    vehicles: listVehicles(client.id),
    orders: listWorkOrders({ clientId: client.id, scope: "all" }).length,
  });
}
