import { NextResponse } from "next/server";
import { CLIENT_COOKIE } from "@/lib/client-access";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
