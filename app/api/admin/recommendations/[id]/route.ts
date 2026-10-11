import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteRecommendation, updateRecommendation } from "@/lib/order-items";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Правка рекомендации или её статуса (выполнена в наряде / отказ / снова открыта). */
export async function PATCH(request: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = updateRecommendation(params.id, b ?? {}, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true, recommendation: res.recommendation });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const res = deleteRecommendation(params.id, s);
  if ("err" in res) return NextResponse.json({ ok: false, error: res.err }, { status: res.code });
  return NextResponse.json({ ok: true });
}
