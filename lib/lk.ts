import { db } from "@/lib/db";
import { createLead } from "@/lib/crm";
import { findClient, listVehicles } from "@/lib/clients";
import { computeTotals, getWorkOrderDetail } from "@/lib/order-items";
import { vehicleLabel } from "@/lib/format";
import type {
  Client,
  RecPriority,
  Vehicle,
  WorkOrderDetail,
  WorkOrderStatus,
} from "@/lib/crm-types";

/**
 * Данные личного кабинета клиента. Только его собственные машины, наряды,
 * рекомендации и записи; внутренние заметки сервиса не отдаются.
 */

type Row = Record<string, unknown>;
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

export type LkVehicle = Vehicle & { lastVisit?: { number: number; date: string } };
export type LkRecommendation = {
  id: string;
  text: string;
  priority: RecPriority;
  estimate?: number;
  createdAt: string;
  orderNumber?: number;
  vehicleId?: string;
  vehicleLabel: string;
};
export type LkVisit = { id: string; start: string; service: string; car: string };
export type LkOrder = {
  id: string;
  number: number;
  status: WorkOrderStatus;
  openedAt: string;
  closedAt?: string;
  vehicleLabel: string;
  complaint: string;
  total?: number; // только выданные — сумма к оплате
};

export type LkDashboard = {
  client: Pick<Client, "id" | "name" | "phone" | "email">;
  vehicles: LkVehicle[];
  recommendations: LkRecommendation[];
  upcoming: LkVisit[];
  orders: LkOrder[];
};

export function getLkDashboard(clientId: string): LkDashboard | null {
  const client = findClient(clientId);
  if (!client) return null;
  const d = db();
  const vehicles = listVehicles(clientId);
  const label = (vid?: string) => vehicleLabel(vehicles.find((v) => v.id === vid)) || "";

  const orderRows = d
    .prepare("SELECT id, number, status, opened_at, closed_at, vehicle_id, complaint, discount FROM work_orders WHERE client_id = ? ORDER BY number DESC")
    .all(clientId) as Row[];
  const ids = orderRows.map((o) => String(o.id));
  const lines = ids.length
    ? (d.prepare(`SELECT order_id, kind, qty, price, source FROM work_order_lines WHERE order_id IN (${ids.map(() => "?").join(",")})`).all(...ids) as Row[])
    : [];

  const orders: LkOrder[] = orderRows.map((o) => ({
    id: String(o.id),
    number: Number(o.number),
    status: o.status as WorkOrderStatus,
    openedAt: String(o.opened_at),
    closedAt: opt(o.closed_at),
    vehicleLabel: label(opt(o.vehicle_id)),
    complaint: String(o.complaint),
    ...(o.status === "closed"
      ? { total: computeTotals(lines.filter((l) => l.order_id === o.id), Number(o.discount ?? 0)).total }
      : {}),
  }));

  const lkVehicles: LkVehicle[] = vehicles.map((v) => {
    const last = orderRows.find((o) => o.vehicle_id === v.id && o.status !== "cancelled");
    return { ...v, ...(last ? { lastVisit: { number: Number(last.number), date: String(last.opened_at) } } : {}) };
  });

  const recommendations: LkRecommendation[] = (
    d
      .prepare(
        `SELECT rc.*, w.number AS order_number FROM recommendations rc LEFT JOIN work_orders w ON w.id = rc.order_id
          WHERE rc.client_id = ? AND rc.status = 'open'
          ORDER BY CASE rc.priority WHEN 'urgent' THEN 0 WHEN 'soon' THEN 1 ELSE 2 END, rc.created_at DESC`
      )
      .all(clientId) as Row[]
  ).map((r) => ({
    id: String(r.id),
    text: String(r.text),
    priority: r.priority as RecPriority,
    ...(r.estimate !== null && r.estimate !== undefined ? { estimate: Number(r.estimate) } : {}),
    createdAt: String(r.created_at),
    orderNumber: r.order_number === null || r.order_number === undefined ? undefined : Number(r.order_number),
    vehicleId: opt(r.vehicle_id),
    vehicleLabel: label(opt(r.vehicle_id)),
  }));

  const upcoming: LkVisit[] = (
    d
      .prepare(
        "SELECT id, start, service, car FROM appointments WHERE client_id = ? AND status = 'scheduled' AND start_ms >= ? ORDER BY start_ms"
      )
      .all(clientId, Date.now() - 60 * 60 * 1000) as Row[]
  ).map((a) => ({ id: String(a.id), start: String(a.start), service: String(a.service), car: String(a.car) }));

  return {
    client: { id: client.id, name: client.name, phone: client.phone, email: client.email },
    vehicles: lkVehicles,
    recommendations,
    upcoming,
    orders,
  };
}

/** Наряд клиента для просмотра в кабинете (только свой; без внутренней заметки). */
export function getLkOrder(clientId: string, orderId: string): WorkOrderDetail | null {
  const detail = getWorkOrderDetail(orderId, { id: "lk", role: "admin" });
  if (!detail || detail.clientId !== clientId) return null;
  return { ...detail, note: "", publicToken: undefined };
}

/** Запись из кабинета: заявка в CRM с привязкой к клиенту (имя и телефон — из профиля). */
export function createLkBooking(
  clientId: string,
  input: { vehicleId?: string; service?: string; message?: string; when?: string }
): { ok: true } | { err: string } {
  const client = findClient(clientId);
  if (!client) return { err: "Клиент не найден" };
  const vehicle = input.vehicleId ? listVehicles(clientId).find((v) => v.id === input.vehicleId) : undefined;
  const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const message = [clip(input.message, 1500), input.when ? `Удобное время: ${clip(input.when, 120)}` : ""]
    .filter(Boolean)
    .join("\n");
  createLead({
    name: client.name,
    phone: client.phone,
    car: vehicle ? vehicleLabel(vehicle) : "",
    service: clip(input.service, 120),
    message,
    clientId,
  });
  return { ok: true };
}
