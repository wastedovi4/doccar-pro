import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { suggestLines } from "@/lib/order-items";

export const dynamic = "force-dynamic";

/** Подсказки названий работ/запчастей из прошлых нарядов. */
export async function GET(request: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const kind = sp.get("kind") === "part" ? "part" : "work";
  return NextResponse.json({ ok: true, items: suggestLines(kind, (sp.get("q") ?? "").slice(0, 100), s) });
}
