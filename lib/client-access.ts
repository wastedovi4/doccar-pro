import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import "@/lib/crm"; // регистрирует инициализацию базы

/**
 * Доступ клиента в личный кабинет.
 *
 * — Приёмщик выдаёт персональную ссылку /lk/enter/<секрет>. В базе — только
 *   sha256 секрета: утечка базы не даёт входов (показать ссылку повторно нельзя,
 *   выдаётся новая).
 * — Вход по ссылке ставит подписанную httpOnly-куку {клиент, версия доступа, срок};
 *   секрет из адресной строки уходит.
 * — Выдача новой ссылки или отзыв поднимают версию: прежние ссылки и сессии гаснут.
 */

export const CLIENT_COOKIE = "dc_client";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 дней
const SECRET = process.env.ADMIN_SECRET || "dev-insecure-secret-change-me";

type Row = Record<string, unknown>;
type Payload = { cid: string; v: number; exp: number };

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
// Отдельное назначение ключа: подпись куки клиента не совместима с кукой сотрудника.
const sign = (body: string) => crypto.createHmac("sha256", SECRET).update(`client-session|${body}`).digest("hex");

/** Выдать новую ссылку (прежние перестают работать). Возвращает секрет — показывается один раз. */
export function issueAccess(clientId: string): string | null {
  const token = crypto.randomBytes(32).toString("base64url");
  const res = db()
    .prepare(
      "UPDATE clients SET access_hash = ?, access_version = access_version + 1, access_issued_at = ? WHERE id = ?"
    )
    .run(hash(token), new Date().toISOString(), clientId);
  return res.changes ? token : null;
}

/** Отозвать доступ: ссылка и все открытые сессии клиента гаснут. */
export function revokeAccess(clientId: string): boolean {
  return (
    db()
      .prepare("UPDATE clients SET access_hash = NULL, access_version = access_version + 1, access_issued_at = NULL WHERE id = ?")
      .run(clientId).changes > 0
  );
}

export function accessInfo(clientId: string): { active: boolean; issuedAt?: string; lastSeenAt?: string } {
  const r = db().prepare("SELECT access_hash, access_issued_at, last_seen_at FROM clients WHERE id = ?").get(clientId) as Row | undefined;
  if (!r) return { active: false };
  return {
    active: !!r.access_hash,
    issuedAt: r.access_issued_at ? String(r.access_issued_at) : undefined,
    lastSeenAt: r.last_seen_at ? String(r.last_seen_at) : undefined,
  };
}

/** Секрет из ссылки → токен сессии для куки; неверный секрет — null. */
export function enterWithToken(token: string): string | null {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const r = db().prepare("SELECT id, access_version FROM clients WHERE access_hash = ?").get(hash(token)) as Row | undefined;
  if (!r) return null;
  const body = Buffer.from(
    JSON.stringify({ cid: String(r.id), v: Number(r.access_version), exp: Date.now() + MAX_AGE * 1000 } satisfies Payload)
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export const clientCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Текущий клиент кабинета: подпись куки, срок, существующий клиент с той же
 * версией доступа и действующей ссылкой. Иначе — null.
 */
export function getClientSession(): { clientId: string } | null {
  const raw = cookies().get(CLIENT_COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let p: Payload;
  try {
    p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!p?.cid || !p.exp || p.exp < Date.now()) return null;
  const r = db().prepare("SELECT access_version, access_hash, last_seen_at FROM clients WHERE id = ?").get(p.cid) as Row | undefined;
  if (!r || !r.access_hash || Number(r.access_version) !== p.v) return null;
  // Отметка «был в кабинете» — не чаще раза в час, чтобы не писать на каждый запрос.
  const last = r.last_seen_at ? Date.parse(String(r.last_seen_at)) : 0;
  if (Date.now() - last > 60 * 60 * 1000) {
    db().prepare("UPDATE clients SET last_seen_at = ? WHERE id = ?").run(new Date().toISOString(), p.cid);
  }
  return { clientId: p.cid };
}
