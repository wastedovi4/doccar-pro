import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createToken, COOKIE_NAME, cookieOptions } from "@/lib/auth";
import { findUserByLogin, verifyPassword } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let login = "";
  let password = "";
  try {
    const body = await request.json();
    login = String(body?.login ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const user = findUserByLogin(login);
  if (!user || !user.active || !verifyPassword(password, user.password)) {
    return NextResponse.json(
      { ok: false, error: "Неверный логин или пароль" },
      { status: 401 }
    );
  }

  cookies().set(COOKIE_NAME, createToken(user.id, user.role), cookieOptions);
  return NextResponse.json({ ok: true, role: user.role });
}
