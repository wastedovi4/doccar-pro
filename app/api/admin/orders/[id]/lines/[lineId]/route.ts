import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteLine, updateLine } from "@/lib/order-items";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string; lineId: string } };

export async function PATCH(request: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = updateLine(params.id, params.lineId, b ?? {}, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, line: res.line });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const res = deleteLine(params.id, params.lineId, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true });
}
