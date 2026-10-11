import type { DatabaseSync } from "node:sqlite";
import { attempt, db, Rejection } from "@/lib/db";
import { uid, findAppointment, findUserById, listAppointments } from "@/lib/crm";
import {
  addVehicle,
  createClient,
  findClient,
  listVehicles,
  mileageOf,
  touchVehicleMileage,
} from "@/lib/clients";
import { normalizePhone, parseRub, plateKey } from "@/lib/format";
import {
  WO_MECHANIC_STATUSES,
  WO_STATUSES,
  type Appointment,
  type Client,
  type Role,
  type Vehicle,
  type WorkOrderStatus,
  type WorkOrderView,
} from "@/lib/crm-types";

/**
 * Заказ-наряды: приёмка автомобиля («Клиент приехал» из записи или без неё),
 * список, карточка, смена статусов. Механик видит только свои наряды и без
 * телефона клиента.
 */

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
const optNum = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export type Viewer = { id: string; role: Role };
const isManager = (v: Viewer) => v.role === "admin" || v.role === "receiver";

const WO_SELECT = `
  SELECT w.*, c.name AS c_name, c.phone AS c_phone,
         v.make AS v_make, v.model AS v_model, v.year AS v_year, v.plate AS v_plate, v.vin AS v_vin,
         u.name AS m_name
    FROM work_orders w
    JOIN clients c ON c.id = w.client_id
    LEFT JOIN vehicles v ON v.id = w.vehicle_id
    LEFT JOIN users u ON u.id = w.mechanic_id`;

function toView(r: Row, viewer?: Viewer): WorkOrderView {
  const showPhone = !viewer || isManager(viewer);
  return {
    id: String(r.id),
    number: Number(r.number),
    clientId: String(r.client_id),
    vehicleId: opt(r.vehicle_id),
    appointmentId: opt(r.appointment_id),
    mechanicId: opt(r.mechanic_id),
    status: r.status as WorkOrderStatus,
    complaint: String(r.complaint),
    mileage: optNum(r.mileage),
    note: String(r.note),
    openedAt: String(r.opened_at),
    closedAt: opt(r.closed_at),
    createdBy: opt(r.created_by),
    updatedAt: String(r.updated_at),
    client: { id: String(r.client_id), name: String(r.c_name), ...(showPhone ? { phone: String(r.c_phone) } : {}) },
    vehicle: r.vehicle_id
      ? {
          id: String(r.vehicle_id),
          make: String(r.v_make ?? ""),
          model: String(r.v_model ?? ""),
          year: optNum(r.v_year),
          plate: String(r.v_plate ?? ""),
          vin: String(r.v_vin ?? ""),
        }
      : undefined,
    mechanicName: opt(r.m_name),
    report: String(r.report ?? ""),
    ...(showPhone ? { discount: Number(r.discount ?? 0), publicToken: opt(r.public_token) } : {}),
  };
}

export const LOCKED_STATUSES: WorkOrderStatus[] = ["closed", "cancelled"];

export type OrderScope = "active" | "closed" | "all";

export function listWorkOrders(filter: { scope?: OrderScope; clientId?: string; viewer?: Viewer } = {}): WorkOrderView[] {
  const where: string[] = [];
  const params: string[] = [];
  if (filter.scope === "active") where.push("w.status IN ('open', 'in_progress', 'ready')");
  if (filter.scope === "closed") where.push("w.status IN ('closed', 'cancelled')");
  if (filter.clientId) {
    where.push("w.client_id = ?");
    params.push(filter.clientId);
  }
  if (filter.viewer && !isManager(filter.viewer)) {
    where.push("w.mechanic_id = ?");
    params.push(filter.viewer.id);
  }
  const sql = `${WO_SELECT}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY w.number DESC LIMIT 300`;
  return (db().prepare(sql).all(...params) as Row[]).map((r) => toView(r, filter.viewer));
}

/** Наряд для просмотра; механику — только свой. */
export function getWorkOrder(id: string, viewer: Viewer): WorkOrderView | null {
  const r = db().prepare(`${WO_SELECT} WHERE w.id = ?`).get(id) as Row | undefined;
  if (!r) return null;
  if (!isManager(viewer) && r.mechanic_id !== viewer.id) return null;
  return toView(r, viewer);
}

export function countActiveWorkOrders(viewer: Viewer): number {
  const sql = "SELECT COUNT(*) AS n FROM work_orders WHERE status IN ('open', 'in_progress', 'ready')";
  const r = isManager(viewer)
    ? db().prepare(sql).get()
    : db().prepare(`${sql} AND mechanic_id = ?`).get(viewer.id);
  return Number((r as Row).n);
}

function nextNumber(d: DatabaseSync): number {
  return Number((d.prepare("SELECT COALESCE(MAX(number), 0) + 1 AS n FROM work_orders").get() as Row).n);
}

/* ---------- приёмка ---------- */

export type IntakeInput = {
  appointmentId?: string;
  client: { id?: string; name?: string; phone?: string; email?: string };
  vehicle?: { id?: string; make?: string; model?: string; year?: unknown; plate?: string; vin?: string } | null;
  mileage?: unknown;
  complaint?: string;
  mechanicId?: string;
};

/**
 * «Клиент приехал»: найти или завести клиента (склейка по телефону), выбрать
 * или добавить машину, открыть заказ-наряд. Запись переходит «в работу» и
 * привязывается к клиенту, как и заявка, из которой она создана. Всё — одной
 * транзакцией.
 */
export function intake(
  input: IntakeInput,
  actorId: string
): { order: WorkOrderView; clientCreated: boolean } | { err: string; code: number } {
  return attempt((d) => {
    // Запись
    let appt: Appointment | undefined;
    if (input.appointmentId) {
      appt = findAppointment(input.appointmentId);
      if (!appt) throw new Rejection("Запись не найдена", 404);
      if (appt.workOrderId) throw new Rejection(`По записи уже открыт заказ-наряд`, 409);
      if (appt.status === "cancelled") throw new Rejection("Запись отменена", 409);
    }

    // Клиент: явно выбранный → по телефону → новый
    let client: Client | undefined;
    let clientCreated = false;
    if (input.client.id) {
      client = findClient(input.client.id);
      if (!client) throw new Rejection("Клиент не найден", 404);
    } else {
      const norm = normalizePhone(input.client.phone ?? "");
      const ex = norm ? (d.prepare("SELECT id FROM clients WHERE phone_norm = ?").get(norm) as Row | undefined) : undefined;
      if (ex) client = findClient(String(ex.id));
      else {
        const res = createClient({ name: input.client.name ?? "", phone: input.client.phone ?? "", email: input.client.email }, actorId);
        if ("err" in res) throw new Rejection(res.err, 400);
        client = res.client;
        clientCreated = true;
      }
    }

    // Автомобиль: выбранный (только машина этого клиента) → такой же госномер у клиента → новый
    const mileage = mileageOf(input.mileage) ?? undefined;
    let vehicle: Vehicle | undefined;
    if (input.vehicle?.id) {
      vehicle = listVehicles(client!.id).find((v) => v.id === input.vehicle!.id);
      if (!vehicle) throw new Rejection("Автомобиль не принадлежит клиенту", 400);
    } else if (input.vehicle && (input.vehicle.make || input.vehicle.model || input.vehicle.plate || input.vehicle.vin)) {
      const key = plateKey(input.vehicle.plate ?? "");
      vehicle = key ? listVehicles(client!.id).find((v) => v.plate === key) : undefined;
      if (!vehicle) {
        const res = addVehicle(client!.id, { ...input.vehicle, mileage });
        if ("err" in res) throw new Rejection(res.err, 400);
        vehicle = res.vehicle;
      }
    }
    if (vehicle) touchVehicleMileage(d, vehicle.id, mileage);

    // Механик: из формы, иначе из записи
    const mechCandidate = input.mechanicId ?? appt?.mechanicId;
    const mechanicId = mechCandidate && findUserById(mechCandidate) ? mechCandidate : undefined;

    const t = now();
    const id = uid();
    const complaint = clip(input.complaint ?? [appt?.service, appt?.note].filter(Boolean).join(". "), 4000);
    d.prepare(
      `INSERT INTO work_orders (id, number, client_id, vehicle_id, appointment_id, mechanic_id, status, complaint,
         mileage, note, opened_at, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, '', ?, ?, ?)`
    ).run(id, nextNumber(d), client!.id, vehicle?.id ?? null, appt?.id ?? null, mechanicId ?? null, complaint, mileage ?? null, t, actorId, t);

    if (appt) {
      d.prepare("UPDATE appointments SET status = 'in_progress', client_id = ? WHERE id = ?").run(client!.id, appt.id);
      if (appt.leadId) d.prepare("UPDATE leads SET client_id = ? WHERE id = ?").run(client!.id, appt.leadId);
    }
    d.prepare("UPDATE clients SET updated_at = ? WHERE id = ?").run(t, client!.id);

    return { order: toView(d.prepare(`${WO_SELECT} WHERE w.id = ?`).get(id) as Row), clientCreated };
  });
}

/* ---------- изменения ---------- */

export type OrderPatch = {
  status?: string;
  mechanicId?: string | null;
  vehicleId?: string | null;
  complaint?: string;
  mileage?: unknown;
  note?: string;
  report?: string;
  discount?: unknown; // рубли (строка/число) — в копейки
};

/**
 * Менеджер (владелец/приёмщик) меняет всё. Механик — только статус своего
 * наряда и только «в работе» / «готов». «Выдан» закрывает связанную запись.
 */
export function updateWorkOrder(
  id: string,
  patch: OrderPatch,
  viewer: Viewer
): { order: WorkOrderView } | { err: string; code: number } {
  return attempt((d) => {
    const r = d.prepare("SELECT * FROM work_orders WHERE id = ?").get(id) as Row | undefined;
    if (!r) throw new Rejection("Заказ-наряд не найден", 404);
    const manager = isManager(viewer);
    if (!manager && r.mechanic_id !== viewer.id) throw new Rejection("Нет доступа", 403);

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const set = (col: string, v: string | number | null) => {
      sets.push(`${col} = ?`);
      vals.push(v);
    };

    // Выданный/отменённый наряд — документ: правки только после возврата статуса.
    const wasLocked = LOCKED_STATUSES.includes(r.status as WorkOrderStatus);
    const reopening = patch.status !== undefined && !LOCKED_STATUSES.includes(patch.status as WorkOrderStatus);
    const editsContent = (["mechanicId", "vehicleId", "complaint", "mileage", "note", "report", "discount"] as const).some(
      (k) => patch[k] !== undefined
    );
    if (wasLocked && !reopening && editsContent) {
      throw new Rejection("Наряд выдан или отменён — сначала верните статус", 409);
    }

    if (patch.status !== undefined) {
      const st = patch.status as WorkOrderStatus;
      if (!WO_STATUSES.includes(st)) throw new Rejection("Неизвестный статус", 400);
      if (!manager && !WO_MECHANIC_STATUSES.includes(st)) throw new Rejection("Механик не может ставить этот статус", 403);
      if (st !== r.status) {
        if (st === "closed") {
          const unpriced = Number(
            (d.prepare("SELECT COUNT(*) AS n FROM work_order_lines WHERE order_id = ? AND source = 'service' AND price IS NULL").get(id) as Row).n
          );
          if (unpriced) throw new Rejection(`Не у всех позиций есть цена (${unpriced}) — выдать нельзя`, 409);
        }
        set("status", st);
        set("closed_at", st === "closed" ? now() : null);
        if (st === "closed" && r.appointment_id) {
          d.prepare("UPDATE appointments SET status = 'done' WHERE id = ? AND status != 'cancelled'").run(String(r.appointment_id));
        }
      }
    }

    if (patch.report !== undefined) set("report", clip(patch.report, 8000));

    if (manager) {
      if (patch.discount !== undefined) set("discount", parseRub(patch.discount) ?? 0);
      if (patch.mechanicId !== undefined) {
        const m = patch.mechanicId && findUserById(patch.mechanicId) ? patch.mechanicId : null;
        set("mechanic_id", m);
      }
      if (patch.vehicleId !== undefined) {
        if (patch.vehicleId) {
          const ok = d.prepare("SELECT 1 FROM vehicles WHERE id = ? AND client_id = ?").get(patch.vehicleId, String(r.client_id));
          if (!ok) throw new Rejection("Автомобиль не принадлежит клиенту", 400);
        }
        set("vehicle_id", patch.vehicleId || null);
      }
      if (patch.complaint !== undefined) set("complaint", clip(patch.complaint, 4000));
      if (patch.note !== undefined) set("note", clip(patch.note, 4000));
      if (patch.mileage !== undefined) {
        const km = mileageOf(patch.mileage);
        set("mileage", km);
        const vid = patch.vehicleId !== undefined ? patch.vehicleId : opt(r.vehicle_id);
        if (vid && km !== null) touchVehicleMileage(d, vid, km);
      }
    }

    if (sets.length) {
      set("updated_at", now());
      d.prepare(`UPDATE work_orders SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    }
    return { order: toView(d.prepare(`${WO_SELECT} WHERE w.id = ?`).get(id) as Row, viewer) };
  });
}

/* ---------- карточка клиента ---------- */

/** Профиль, машины, заказ-наряды и записи клиента — для его карточки. */
export function getClientCard(
  id: string
): { client: Client; vehicles: Vehicle[]; orders: WorkOrderView[]; appointments: Appointment[] } | null {
  const client = findClient(id);
  if (!client) return null;
  return {
    client,
    vehicles: listVehicles(id),
    orders: listWorkOrders({ clientId: id, scope: "all" }),
    appointments: listAppointments({ clientId: id }),
  };
}
