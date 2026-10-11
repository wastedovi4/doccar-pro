import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { accessInfo, issueAccess, revokeAccess } from "@/lib/client-access";
import { publicOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function requireManager() {
  const s = await getSession();
  return s && can(s.role, "admin", "receiver") ? s : null;
}

/** Состояние доступа клиента в личный кабинет. */
export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, access: accessInfo(params.id) });
}

/** Выдать новую персональную ссылку (прежние ссылки и сессии гаснут). Ссылка показывается один раз. */
export async function POST(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  const token = issueAccess(params.id);
  if (!token) return NextResponse.json({ ok: false, error: "Клиент не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, url: `${await publicOrigin()}/lk/enter/${token}`, access: accessInfo(params.id) });
}

/** Отозвать доступ. */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  revokeAccess(params.id);
  return NextResponse.json({ ok: true, access: accessInfo(params.id) });
}
