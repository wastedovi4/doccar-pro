import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { deleteClient, updateClient } from "@/lib/clients";
import { getClientCard } from "@/lib/orders";
import { listOpenRecommendations } from "@/lib/order-items";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function requireManager() {
  const s = await getSession();
  return s && can(s.role, "admin", "receiver") ? s : null;
}

/** Карточка клиента: профиль, машины, заказ-наряды, записи. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  const card = getClientCard(params.id);
  if (!card) return NextResponse.json({ ok: false, error: "Клиент не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, ...card, recommendations: listOpenRecommendations(params.id) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const pick = (k: string) => (typeof b?.[k] === "string" ? b[k] : undefined);
  const res = updateClient(params.id, { name: pick("name"), phone: pick("phone"), email: pick("email"), note: pick("note") });
  if ("err" in res) {
    return NextResponse.json({ ok: false, error: res.err, existingId: res.existingId }, { status: res.code });
  }
  return NextResponse.json({ ok: true, client: res.client });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  const res = deleteClient(params.id);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: 409 });
  return NextResponse.json({ ok: true });
}
