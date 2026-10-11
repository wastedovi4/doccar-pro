import { NextResponse } from "next/server";
import { CLIENT_COOKIE, clientCookieOptions, enterWithToken } from "@/lib/client-access";
import { publicOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

/** Вход по персональной ссылке: секрет → кука сессии → кабинет (секрет из адреса уходит). */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const session = enterWithToken(params.token);
  // За Caddy request.url — http://…; адрес для браузера — из X-Forwarded-*.
  const res = NextResponse.redirect(`${await publicOrigin()}${session ? "/lk" : "/lk?e=link"}`, 303);
  if (session) res.cookies.set(CLIENT_COOKIE, session, clientCookieOptions);
  res.headers.set("Referrer-Policy", "no-referrer"); // секрет не уйдёт в Referer
  res.headers.set("Cache-Control", "no-store");
  return res;
}
