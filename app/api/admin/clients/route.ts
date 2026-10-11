import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { createClient, searchClients } from "@/lib/clients";

export const dynamic = "force-dynamic";

async function requireManager() {
  const s = await getSession();
  return s && can(s.role, "admin", "receiver") ? s : null;
}

/** Поиск клиентов: имя, телефон (любой формат), госномер (кириллица/латиница), VIN. */
export async function GET(request: Request) {
  if (!(await requireManager())) return NextResponse.json({ ok: false }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ ok: true, clients: searchClients(q.slice(0, 100)) });
}

export async function POST(request: Request) {
  const s = await requireManager();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const res = createClient(
    { name: String(b?.name ?? ""), phone: String(b?.phone ?? ""), email: String(b?.email ?? ""), note: String(b?.note ?? "") },
    s.id
  );
  if ("err" in res) {
    return NextResponse.json({ ok: false, error: res.err, existingId: res.existingId }, { status: res.existingId ? 409 : 400 });
  }
  return NextResponse.json({ ok: true, client: res.client });
}
