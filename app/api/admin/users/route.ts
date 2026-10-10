import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { tx, read, uid, hashPassword, toPublic, type Role } from "@/lib/crm";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["admin", "receiver", "mechanic"];

async function requireAdmin() {
  const s = await getSession();
  return s && can(s.role, "admin") ? s : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  const db = await read();
  return NextResponse.json({ ok: true, users: db.users.map(toPublic) });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const login = String(b?.login ?? "").trim();
  const name = String(b?.name ?? "").trim();
  const password = String(b?.password ?? "");
  const role: Role = ROLES.includes(b?.role) ? b.role : "mechanic";

  if (!login || !name || password.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Логин, имя и пароль (от 4 символов) обязательны" },
      { status: 400 }
    );
  }

  const result = await tx((db) => {
    if (db.users.some((u) => u.login.toLowerCase() === login.toLowerCase())) {
      return { err: "Логин уже занят" };
    }
    const user = {
      id: uid(),
      login,
      name,
      role,
      password: hashPassword(password),
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return { user: toPublic(user) };
  });

  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: 409 });
  return NextResponse.json({ ok: true, user: result.user });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  let b: any;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const id = String(b?.id ?? "");

  const result = await tx((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return { err: "Не найден", code: 404 as const };

    const activeAdmins = db.users.filter((x) => x.role === "admin" && x.active);
    const isLastAdmin = u.role === "admin" && activeAdmins.length <= 1;

    if (typeof b.name === "string" && b.name.trim()) u.name = b.name.trim();
    if (typeof b.role === "string" && ROLES.includes(b.role)) {
      if (isLastAdmin && b.role !== "admin") {
        return { err: "Нельзя снять роль у последнего админа", code: 409 as const };
      }
      u.role = b.role;
    }
    if (typeof b.active === "boolean") {
      if (isLastAdmin && !b.active) {
        return { err: "Нельзя отключить последнего админа", code: 409 as const };
      }
      u.active = b.active;
    }
    if (typeof b.password === "string" && b.password.length >= 4) {
      u.password = hashPassword(b.password);
    }
    return { user: toPublic(u) };
  });

  if ("err" in result) {
    return NextResponse.json({ ok: false, error: result.err }, { status: result.code });
  }
  return NextResponse.json({ ok: true, user: result.user });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  if (id === admin.id) {
    return NextResponse.json({ ok: false, error: "Нельзя удалить себя" }, { status: 409 });
  }

  const result = await tx((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return { err: "Не найден" };
    if (u.role === "admin" && db.users.filter((x) => x.role === "admin" && x.active).length <= 1) {
      return { err: "Нельзя удалить последнего админа" };
    }
    db.users = db.users.filter((x) => x.id !== id);
    return { ok: true };
  });

  if ("err" in result) return NextResponse.json({ ok: false, error: result.err }, { status: 409 });
  return NextResponse.json({ ok: true });
}
