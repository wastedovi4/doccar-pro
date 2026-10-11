import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addLine } from "@/lib/order-items";

export const dynamic = "force-dynamic";

/** Добавить работу или запчасть в наряд. Цену ставит только менеджер. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = addLine(params.id, b ?? {}, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, line: res.line });
}
