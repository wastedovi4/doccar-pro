import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensurePublicToken, revokePublicToken } from "@/lib/order-items";
import { publicOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Ссылка на онлайн-отчёт для клиента (создаётся при первом запросе). */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s || (s.role !== "admin" && s.role !== "receiver")) return NextResponse.json({ ok: false }, { status: 401 });
  const token = ensurePublicToken(params.id, s);
  if (!token) return NextResponse.json({ ok: false, error: "Заказ-наряд не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, url: `${await publicOrigin()}/r/${token}` });
}

/** Отозвать ссылку — старый QR перестанет открываться. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  if (!revokePublicToken(params.id, s)) return NextResponse.json({ ok: false }, { status: 403 });
  return NextResponse.json({ ok: true });
}
