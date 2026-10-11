import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { ROLES, createUser, deleteUser, listUsers, toPublic, updateUser, type Role } from "@/lib/crm";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const s = await getSession();
  return s && can(s.role, "admin") ? s : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, users: listUsers().map(toPublic) });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const login = String(b?.login ?? "").trim().slice(0, 60);
  const name = String(b?.name ?? "").trim().slice(0, 120);
  const password = String(b?.password ?? "");
  const role: Role = ROLES.includes(b?.role) ? b.role : "mechanic";

  if (!login || !name || password.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Логин, имя и пароль (от 4 символов) обязательны" },
      { status: 400 }
    );
  }

  const result = createUser({ login, name, password, role });
  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: 409 });
  return NextResponse.json({ ok: true, user: result.user });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  const result = updateUser(String(b?.id ?? ""), {
    name: typeof b.name === "string" ? b.name.slice(0, 120) : undefined,
    role: ROLES.includes(b.role) ? (b.role as Role) : undefined,
    active: typeof b.active === "boolean" ? b.active : undefined,
    password: typeof b.password === "string" ? b.password : undefined,
  });

  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: result.code });
  return NextResponse.json({ ok: true, user: result.user });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { searchParams } = new URL(request.url);

  const result = deleteUser(searchParams.get("id") ?? "", admin.id);
  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: 409 });
  return NextResponse.json({ ok: true });
}
