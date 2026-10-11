import crypto from "crypto";
import { cookies } from "next/headers";
import { findUserById, type PublicUser, type Role, toPublic } from "@/lib/crm";

/**
 * Сессии на подписанной httpOnly-куке. Токен несёт userId + роль + срок.
 * Пользователи и пароли — в CRM-сторе (lib/crm.ts). Первый админ засевается
 * из ADMIN_LOGIN/ADMIN_PASSWORD при пустой базе.
 */

export const COOKIE_NAME = "dc_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 дней
const SECRET = process.env.ADMIN_SECRET || "dev-insecure-secret-change-me";

type Payload = { uid: string; role: Role; exp: number };

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

export function createToken(uid: string, role: Role): string {
  const payload: Payload = { uid, role, exp: Date.now() + MAX_AGE * 1000 };
  const body = b64(payload);
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (!payload?.uid || !payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Текущая сессия: валидная кука + существующий активный пользователь. */
export async function getSession(): Promise<PublicUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = findUserById(payload.uid);
  if (!user || !user.active) return null;
  return toPublic(user);
}

export function can(role: Role | undefined, ...allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
