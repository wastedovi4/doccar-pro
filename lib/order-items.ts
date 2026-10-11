import crypto from "crypto";
import type { DatabaseSync } from "node:sqlite";
import { attempt, db, Rejection } from "@/lib/db";
import { uid } from "@/lib/crm";
import { LOCKED_STATUSES, getWorkOrder, type Viewer } from "@/lib/orders";
import { lineAmount, parseRub } from "@/lib/format";
import type {
  LineKind,
  OrderTotals,
  RecPriority,
  RecStatus,
  Recommendation,
  WorkOrderDetail,
  WorkOrderLine,
  WorkOrderStatus,
  WorkOrderView,
} from "@/lib/crm-types";

/**
 * Состав наряда: работы и запчасти, итоги, рекомендации клиенту (живут дольше
 * наряда — переносятся на следующие визиты по машине), ставка нормо-часа,
 * подсказки названий из прошлых нарядов, ссылка для клиента (QR).
 *
 * Цены ставит менеджер (владелец/приёмщик); механик вносит позиции без цен и
 * сумм не видит. Выданный/отменённый наряд не меняется.
 */

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
const optNum = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isManager = (v: Viewer) => v.role === "admin" || v.role === "receiver";

const PRIORITIES: RecPriority[] = ["urgent", "soon", "later"];
const REC_STATUSES: RecStatus[] = ["open", "done", "declined"];

/* ---------- ставка нормо-часа ---------- */

export function getLaborRate(): number | null {
  const r = db().prepare("SELECT value FROM meta WHERE key = 'labor_rate'").get() as Row | undefined;
  const n = r ? Number(r.value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setLaborRate(raw: unknown): number | null {
  const kop = parseRub(raw);
  if (kop === null || kop === 0) db().prepare("DELETE FROM meta WHERE key = 'labor_rate'").run();
  else db().prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('labor_rate', ?)").run(String(kop));
  return getLaborRate();
}

/* ---------- маппинг ---------- */

function toLine(r: Row, showPrice: boolean): WorkOrderLine {
  return {
    id: String(r.id),
    orderId: String(r.order_id),
    kind: r.kind as LineKind,
    position: Number(r.position),
    name: String(r.name),
    article: String(r.article),
    qty: Number(r.qty),
    unit: String(r.unit),
    ...(showPrice && r.price !== null && r.price !== undefined ? { price: Number(r.price) } : {}),
    source: r.source === "client" ? "client" : "service",
    createdAt: String(r.created_at),
  };
}

function toRec(r: Row, showEstimate: boolean): Recommendation {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    vehicleId: opt(r.vehicle_id),
    orderId: opt(r.order_id),
    orderNumber: optNum(r.order_number),
    text: String(r.text),
    priority: r.priority as RecPriority,
    ...(showEstimate && r.estimate !== null && r.estimate !== undefined ? { estimate: Number(r.estimate) } : {}),
    status: r.status as RecStatus,
    resolvedOrderId: opt(r.resolved_order_id),
    createdAt: String(r.created_at),
    resolvedAt: opt(r.resolved_at),
  };
}

const REC_SELECT =
  "SELECT rc.*, w.number AS order_number FROM recommendations rc LEFT JOIN work_orders w ON w.id = rc.order_id";

/* ---------- итоги ---------- */

export function computeTotals(lines: Row[], discount: number): OrderTotals {
  let works = 0;
  let parts = 0;
  let unpriced = 0;
  for (const l of lines) {
    const price = l.price === null || l.price === undefined ? null : Number(l.price);
    if (l.source === "client") continue; // запчасть клиента не тарифицируется
    if (price === null) {
      unpriced++;
      continue;
    }
    const amount = lineAmount(Number(l.qty), price);
    if (l.kind === "work") works += amount;
    else parts += amount;
  }
  const d = Math.min(discount, works + parts);
  return { works, parts, discount: d, total: works + parts - d, unpriced };
}

/* ---------- карточка наряда целиком ---------- */

export function getWorkOrderDetail(id: string, viewer: Viewer): WorkOrderDetail | null {
  const order = getWorkOrder(id, viewer);
  if (!order) return null;
  const manager = isManager(viewer);
  const d = db();
  const lineRows = d.prepare("SELECT * FROM work_order_lines WHERE order_id = ? ORDER BY kind DESC, position").all(id) as Row[];
  const recs = (d.prepare(`${REC_SELECT} WHERE rc.order_id = ? ORDER BY rc.created_at`).all(id) as Row[]).map((r) => toRec(r, manager));
  // Перенесённые: открытые по этой машине из других нарядов + закрытые именно этим нарядом.
  const carried = order.vehicleId
    ? (
        d
          .prepare(
            `${REC_SELECT} WHERE rc.vehicle_id = ? AND (rc.order_id IS NULL OR rc.order_id != ?)
               AND (rc.status = 'open' OR rc.resolved_order_id = ?) ORDER BY rc.created_at`
          )
          .all(order.vehicleId, id, id) as Row[]
      ).map((r) => toRec(r, manager))
    : [];
  const discount = Number((d.prepare("SELECT discount FROM work_orders WHERE id = ?").get(id) as Row).discount ?? 0);
  return {
    ...order,
    lines: lineRows.map((r) => toLine(r, manager)),
    recommendations: recs,
    carried,
    ...(manager ? { totals: computeTotals(lineRows, discount) } : {}),
    locked: LOCKED_STATUSES.includes(order.status),
  };
}

/* ---------- доступ к правке состава ---------- */

/** Наряд, который этот сотрудник может менять сейчас; иначе — отказ (откат). */
function editableOrder(d: DatabaseSync, orderId: string, viewer: Viewer): Row {
  const o = d.prepare("SELECT * FROM work_orders WHERE id = ?").get(orderId) as Row | undefined;
  if (!o) throw new Rejection("Заказ-наряд не найден", 404);
  if (!isManager(viewer) && o.mechanic_id !== viewer.id) throw new Rejection("Нет доступа", 403);
  if (LOCKED_STATUSES.includes(o.status as WorkOrderStatus)) {
    throw new Rejection("Наряд выдан или отменён — сначала верните статус", 409);
  }
  return o;
}

const touchOrder = (d: DatabaseSync, orderId: string) =>
  d.prepare("UPDATE work_orders SET updated_at = ? WHERE id = ?").run(now(), orderId);

function qtyOf(v: unknown, fb: number): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 1000) / 1000 : fb;
}

/* ---------- работы и запчасти ---------- */

export type LineInput = {
  kind?: unknown;
  name?: unknown;
  article?: unknown;
  qty?: unknown;
  unit?: unknown;
  price?: unknown; // рубли; только менеджер
  source?: unknown;
};

export function addLine(orderId: string, input: LineInput, viewer: Viewer) {
  return attempt((d) => {
    editableOrder(d, orderId, viewer);
    const kind: LineKind = input.kind === "part" ? "part" : "work";
    const name = clip(input.name, 200);
    if (!name) throw new Rejection("Укажите наименование", 400);
    const source = kind === "part" && input.source === "client" ? "client" : "service";
    // Цена: менеджер — как ввёл; работа без цены — по ставке нормо-часа; механик цен не ставит.
    let price = isManager(viewer) ? parseRub(input.price) : null;
    if (price === null && kind === "work") price = getLaborRate();
    if (source === "client") price = null;
    const position = Number(
      (d.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM work_order_lines WHERE order_id = ? AND kind = ?").get(orderId, kind) as Row).n
    );
    const id = uid();
    d.prepare(
      `INSERT INTO work_order_lines (id, order_id, kind, position, name, article, qty, unit, price, source, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      orderId,
      kind,
      position,
      name,
      clip(input.article, 80),
      qtyOf(input.qty, 1),
      clip(input.unit, 12) || (kind === "work" ? "н/ч" : "шт"),
      price,
      source,
      viewer.id,
      now()
    );
    touchOrder(d, orderId);
    return { line: toLine(d.prepare("SELECT * FROM work_order_lines WHERE id = ?").get(id) as Row, isManager(viewer)) };
  });
}

export function updateLine(orderId: string, lineId: string, input: LineInput, viewer: Viewer) {
  return attempt((d) => {
    editableOrder(d, orderId, viewer);
    const l = d.prepare("SELECT * FROM work_order_lines WHERE id = ? AND order_id = ?").get(lineId, orderId) as Row | undefined;
    if (!l) throw new Rejection("Позиция не найдена", 404);
    const name = input.name !== undefined ? clip(input.name, 200) : String(l.name);
    if (!name) throw new Rejection("Наименование не может быть пустым", 400);
    const source = l.kind === "part" && input.source !== undefined ? (input.source === "client" ? "client" : "service") : String(l.source);
    let price = l.price === null || l.price === undefined ? null : Number(l.price);
    if (isManager(viewer) && input.price !== undefined) price = parseRub(input.price);
    if (source === "client") price = null;
    d.prepare("UPDATE work_order_lines SET name = ?, article = ?, qty = ?, unit = ?, price = ?, source = ? WHERE id = ?").run(
      name,
      input.article !== undefined ? clip(input.article, 80) : String(l.article),
      input.qty !== undefined ? qtyOf(input.qty, Number(l.qty)) : Number(l.qty),
      input.unit !== undefined ? clip(input.unit, 12) : String(l.unit),
      price,
      source,
      lineId
    );
    touchOrder(d, orderId);
    return { line: toLine(d.prepare("SELECT * FROM work_order_lines WHERE id = ?").get(lineId) as Row, isManager(viewer)) };
  });
}

export function deleteLine(orderId: string, lineId: string, viewer: Viewer) {
  return attempt((d) => {
    editableOrder(d, orderId, viewer);
    const res = d.prepare("DELETE FROM work_order_lines WHERE id = ? AND order_id = ?").run(lineId, orderId);
    if (!res.changes) throw new Rejection("Позиция не найдена", 404);
    touchOrder(d, orderId);
    return { ok: true as const };
  });
}

/** Подсказки названий из прошлых нарядов — с последними артикулом, единицей и (менеджеру) ценой. */
export function suggestLines(kind: LineKind, q: string, viewer: Viewer) {
  const text = q.trim().toLowerCase();
  if (text.length < 2) return [];
  const rows = db()
    .prepare(
      `SELECT name, article, unit, price, MAX(created_at) AS last
         FROM work_order_lines WHERE kind = ? GROUP BY lower(name) ORDER BY last DESC LIMIT 200`
    )
    .all(kind) as Row[];
  return rows
    .filter((r) => String(r.name).toLowerCase().includes(text))
    .slice(0, 8)
    .map((r) => ({
      name: String(r.name),
      article: String(r.article),
      unit: String(r.unit),
      ...(isManager(viewer) && r.price !== null ? { price: Number(r.price) } : {}),
    }));
}

/* ---------- рекомендации ---------- */

export type RecInput = { text?: unknown; priority?: unknown; estimate?: unknown };

export function addRecommendation(orderId: string, input: RecInput, viewer: Viewer) {
  return attempt((d) => {
    const o = editableOrder(d, orderId, viewer);
    const text = clip(input.text, 1000);
    if (!text) throw new Rejection("Опишите рекомендацию", 400);
    const priority = PRIORITIES.includes(input.priority as RecPriority) ? (input.priority as RecPriority) : "soon";
    const id = uid();
    d.prepare(
      `INSERT INTO recommendations (id, client_id, vehicle_id, order_id, text, priority, estimate, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
    ).run(
      id,
      String(o.client_id),
      opt(o.vehicle_id) ?? null,
      orderId,
      text,
      priority,
      isManager(viewer) ? parseRub(input.estimate) : null,
      viewer.id,
      now()
    );
    touchOrder(d, orderId);
    return { recommendation: toRec(d.prepare(`${REC_SELECT} WHERE rc.id = ?`).get(id) as Row, isManager(viewer)) };
  });
}

/**
 * Правка рекомендации. Текст/приоритет/оценка — пока наряд, где она выдана, не
 * закрыт. Статус (выполнена в наряде X / отказ / снова открыта) — в любом
 * открытом наряде этого клиента или менеджером напрямую.
 */
export function updateRecommendation(
  recId: string,
  input: RecInput & { status?: unknown; resolvedOrderId?: unknown },
  viewer: Viewer
) {
  return attempt((d) => {
    const r = d.prepare("SELECT * FROM recommendations WHERE id = ?").get(recId) as Row | undefined;
    if (!r) throw new Rejection("Рекомендация не найдена", 404);
    const manager = isManager(viewer);

    if (input.status !== undefined) {
      const st = input.status as RecStatus;
      if (!REC_STATUSES.includes(st)) throw new Rejection("Неизвестный статус", 400);
      let resolvedOrder: string | null = null;
      if (st === "done" && typeof input.resolvedOrderId === "string" && input.resolvedOrderId) {
        const o = editableOrder(d, input.resolvedOrderId, viewer);
        if (o.client_id !== r.client_id) throw new Rejection("Наряд другого клиента", 400);
        resolvedOrder = input.resolvedOrderId;
      } else if (!manager) {
        throw new Rejection("Механик отмечает выполнение только в своём наряде", 403);
      }
      d.prepare("UPDATE recommendations SET status = ?, resolved_order_id = ?, resolved_at = ? WHERE id = ?").run(
        st,
        st === "open" ? null : resolvedOrder,
        st === "open" ? null : now(),
        recId
      );
    }

    if (input.text !== undefined || input.priority !== undefined || input.estimate !== undefined) {
      if (r.order_id) editableOrder(d, String(r.order_id), viewer);
      else if (!manager) throw new Rejection("Нет доступа", 403);
      const text = input.text !== undefined ? clip(input.text, 1000) : String(r.text);
      if (!text) throw new Rejection("Текст не может быть пустым", 400);
      const priority =
        input.priority !== undefined && PRIORITIES.includes(input.priority as RecPriority) ? input.priority : r.priority;
      const estimate = manager && input.estimate !== undefined ? parseRub(input.estimate) : (r.estimate as number | null);
      d.prepare("UPDATE recommendations SET text = ?, priority = ?, estimate = ? WHERE id = ?").run(text, String(priority), estimate, recId);
    }
    return { recommendation: toRec(d.prepare(`${REC_SELECT} WHERE rc.id = ?`).get(recId) as Row, manager) };
  });
}

export function deleteRecommendation(recId: string, viewer: Viewer) {
  return attempt((d) => {
    const r = d.prepare("SELECT * FROM recommendations WHERE id = ?").get(recId) as Row | undefined;
    if (!r) throw new Rejection("Рекомендация не найдена", 404);
    if (r.order_id) editableOrder(d, String(r.order_id), viewer);
    else if (!isManager(viewer)) throw new Rejection("Нет доступа", 403);
    d.prepare("DELETE FROM recommendations WHERE id = ?").run(recId);
    return { ok: true as const };
  });
}

/** Открытые рекомендации клиента — для его карточки. */
export function listOpenRecommendations(clientId: string): Recommendation[] {
  return (
    db().prepare(`${REC_SELECT} WHERE rc.client_id = ? AND rc.status = 'open' ORDER BY rc.created_at DESC`).all(clientId) as Row[]
  ).map((r) => toRec(r, true));
}

/* ---------- ссылка для клиента и публичный отчёт ---------- */

/** Секретная ссылка на онлайн-отчёт (для QR на распечатке). Создаётся при первом запросе. */
export function ensurePublicToken(orderId: string, viewer: Viewer): string | null {
  const o = getWorkOrder(orderId, viewer);
  if (!o) return null;
  const d = db();
  const cur = d.prepare("SELECT public_token FROM work_orders WHERE id = ?").get(orderId) as Row;
  if (cur.public_token) return String(cur.public_token);
  const token = crypto.randomBytes(16).toString("base64url");
  d.prepare("UPDATE work_orders SET public_token = ? WHERE id = ?").run(token, orderId);
  return token;
}

/** Отозвать ссылку (старый QR перестаёт открываться). Только менеджер. */
export function revokePublicToken(orderId: string, viewer: Viewer): boolean {
  if (!isManager(viewer)) return false;
  return db().prepare("UPDATE work_orders SET public_token = NULL WHERE id = ?").run(orderId).changes > 0;
}

/**
 * Отчёт по секретной ссылке: состав, итоги, отчёт механика, рекомендации.
 * Без внутренней заметки; телефон клиента маскируется.
 */
export function getPublicReport(token: string): (WorkOrderDetail & { maskedPhone: string }) | null {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const r = db().prepare("SELECT id FROM work_orders WHERE public_token = ?").get(token) as Row | undefined;
  if (!r) return null;
  const detail = getWorkOrderDetail(String(r.id), { id: "public", role: "admin" });
  if (!detail) return null;
  const phone = detail.client.phone ?? "";
  const digits = phone.replace(/\D/g, "");
  const maskedPhone = digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "";
  const clean: WorkOrderView = { ...detail, note: "", client: { id: detail.client.id, name: detail.client.name } };
  return { ...detail, ...clean, publicToken: undefined, maskedPhone };
}
