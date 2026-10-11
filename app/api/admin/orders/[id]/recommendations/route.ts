import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addRecommendation } from "@/lib/order-items";

export const dynamic = "force-dynamic";

/** Рекомендация клиенту в этом наряде (привязывается к клиенту и машине). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = addRecommendation(params.id, b ?? {}, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, recommendation: res.recommendation });
}
