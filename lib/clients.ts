import type { DatabaseSync } from "node:sqlite";
import { db, transaction } from "@/lib/db";
import { uid } from "@/lib/crm"; // crm регистрирует инициализацию базы
import { normalizePhone, normalizeVin, plateKey, vehicleLabel } from "@/lib/format";
import type { Client, ClientListItem, Vehicle } from "@/lib/crm-types";

/**
 * Клиенты и их автомобили. Ключ склейки клиента — нормализованный телефон
 * (уникальный индекс): два профиля с одним номером невозможны.
 */

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
const optNum = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function toClient(r: Row): Client {
  return {
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone),
    phoneNorm: opt(r.phone_norm),
    email: String(r.email),
    note: String(r.note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function toVehicle(r: Row): Vehicle {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    make: String(r.make),
    model: String(r.model),
    year: optNum(r.year),
    plate: String(r.plate),
    vin: String(r.vin),
    mileage: optNum(r.mileage),
    note: String(r.note),
    createdAt: String(r.created_at),
  };
}

/** Строка поиска: имя, e-mail, телефон, госномера и VIN — в нижнем регистре. */
function refreshSearch(d: DatabaseSync, clientId: string) {
  const c = d.prepare("SELECT name, phone, phone_norm, email FROM clients WHERE id = ?").get(clientId) as Row | undefined;
  if (!c) return;
  const vs = d.prepare("SELECT make, model, plate, vin FROM vehicles WHERE client_id = ?").all(clientId) as Row[];
  const parts = [c.name, c.email, c.phone, c.phone_norm, ...vs.flatMap((v) => [v.make, v.model, v.plate, v.vin])];
  d.prepare("UPDATE clients SET search = ? WHERE id = ?").run(
    parts.filter(Boolean).map(String).join(" ").toLowerCase(),
    clientId
  );
}

/* ---------- клиенты ---------- */

export function searchClients(q: string, limit = 50): ClientListItem[] {
  const d = db();
  const text = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  let rows: Row[];
  if (!text) {
    rows = d.prepare("SELECT * FROM clients ORDER BY updated_at DESC LIMIT ?").all(limit) as Row[];
  } else {
    // Текст как есть, госномер в каноническом виде (кириллица → латиница), телефон цифрами.
    const like = (s: string) => `%${s.replace(/[%_]/g, "")}%`;
    const variants = [like(text), like(plateKey(q).toLowerCase())];
    if (digits.length >= 3) variants.push(like(normalizePhone(digits) ?? digits), like(digits));
    rows = d
      .prepare(`SELECT * FROM clients WHERE ${variants.map(() => "search LIKE ?").join(" OR ")} ORDER BY updated_at DESC LIMIT ?`)
      .all(...variants, limit) as Row[];
  }
  if (!rows.length) return [];
  const ids = rows.map((r) => String(r.id));
  const ph = ids.map(() => "?").join(",");
  const vehicles = d.prepare(`SELECT * FROM vehicles WHERE client_id IN (${ph}) ORDER BY created_at`).all(...ids) as Row[];
  const orders = d
    .prepare(`SELECT client_id, COUNT(*) AS n, MAX(opened_at) AS last FROM work_orders WHERE client_id IN (${ph}) GROUP BY client_id`)
    .all(...ids) as Row[];
  return rows.map((r) => {
    const o = orders.find((x) => x.client_id === r.id);
    return {
      ...toClient(r),
      vehicles: vehicles
        .filter((v) => v.client_id === r.id)
        .map((v) => vehicleLabel({ make: String(v.make), model: String(v.model), plate: String(v.plate) })),
      orders: o ? Number(o.n) : 0,
      lastVisit: o ? opt(o.last) : undefined,
    };
  });
}

export function findClient(id: string): Client | undefined {
  const r = db().prepare("SELECT * FROM clients WHERE id = ?").get(id) as Row | undefined;
  return r ? toClient(r) : undefined;
}

export function findClientByPhone(phone: string): Client | undefined {
  const norm = normalizePhone(phone);
  if (!norm) return undefined;
  const r = db().prepare("SELECT * FROM clients WHERE phone_norm = ?").get(norm) as Row | undefined;
  return r ? toClient(r) : undefined;
}

export function listVehicles(clientId: string): Vehicle[] {
  return (db().prepare("SELECT * FROM vehicles WHERE client_id = ? ORDER BY created_at").all(clientId) as Row[]).map(toVehicle);
}

export type ClientInput = { name: string; phone: string; email?: string; note?: string };

/** Создать клиента. Номер уже есть у другого — ошибка со ссылкой на существующий профиль. */
export function createClient(
  input: ClientInput,
  actorId?: string
): { client: Client } | { err: string; existingId?: string } {
  const name = clip(input.name, 120);
  if (!name) return { err: "Укажите имя клиента" };
  return transaction((d) => {
    const phoneNorm = normalizePhone(input.phone);
    if (phoneNorm) {
      const ex = d.prepare("SELECT id FROM clients WHERE phone_norm = ?").get(phoneNorm) as Row | undefined;
      if (ex) return { err: "Клиент с таким телефоном уже есть", existingId: String(ex.id) };
    }
    const t = now();
    const client: Client = {
      id: uid(),
      name,
      phone: clip(input.phone, 40),
      phoneNorm: phoneNorm ?? undefined,
      email: clip(input.email, 120),
      note: clip(input.note, 2000),
      createdAt: t,
      updatedAt: t,
    };
    d.prepare(
      `INSERT INTO clients (id, name, phone, phone_norm, email, note, created_at, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(client.id, client.name, client.phone, phoneNorm, client.email, client.note, t, actorId ?? null, t);
    refreshSearch(d, client.id);
    return { client };
  });
}

export function updateClient(
  id: string,
  patch: Partial<ClientInput>
): { client: Client } | { err: string; code: 404 | 409 | 400; existingId?: string } {
  return transaction((d) => {
    const c = findClient(id);
    if (!c) return { err: "Клиент не найден", code: 404 as const };
    const next: Client = { ...c, updatedAt: now() };
    if (patch.name !== undefined) {
      next.name = clip(patch.name, 120);
      if (!next.name) return { err: "Имя не может быть пустым", code: 400 as const };
    }
    if (patch.phone !== undefined) {
      next.phone = clip(patch.phone, 40);
      next.phoneNorm = normalizePhone(next.phone) ?? undefined;
      if (next.phoneNorm) {
        const ex = d.prepare("SELECT id FROM clients WHERE phone_norm = ? AND id != ?").get(next.phoneNorm, id) as Row | undefined;
        if (ex) return { err: "Этот телефон уже у другого клиента", code: 409 as const, existingId: String(ex.id) };
      }
    }
    if (patch.email !== undefined) next.email = clip(patch.email, 120);
    if (patch.note !== undefined) next.note = clip(patch.note, 2000);
    d.prepare("UPDATE clients SET name = ?, phone = ?, phone_norm = ?, email = ?, note = ?, updated_at = ? WHERE id = ?").run(
      next.name,
      next.phone,
      next.phoneNorm ?? null,
      next.email,
      next.note,
      next.updatedAt,
      id
    );
    refreshSearch(d, id);
    return { client: next };
  });
}

/** Удалить можно только клиента без заказ-нарядов (документы не теряем). */
export function deleteClient(id: string): { ok: true } | { err: string } {
  return transaction((d) => {
    const n = Number((d.prepare("SELECT COUNT(*) AS n FROM work_orders WHERE client_id = ?").get(id) as Row).n);
    if (n > 0) return { err: `У клиента ${n} заказ-нарядов — удалить нельзя` };
    d.prepare("DELETE FROM clients WHERE id = ?").run(id); // машины удаляются каскадом
    return { ok: true as const };
  });
}

/* ---------- автомобили ---------- */

export type VehicleInput = { make?: string; model?: string; year?: unknown; plate?: string; vin?: string; mileage?: unknown; note?: string };

const yearOf = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
};
const mileageOf = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/\s/g, ""));
  return v !== "" && v !== null && v !== undefined && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export function addVehicle(clientId: string, input: VehicleInput): { vehicle: Vehicle } | { err: string } {
  return transaction((d) => {
    if (!findClient(clientId)) return { err: "Клиент не найден" };
    const v: Vehicle = {
      id: uid(),
      clientId,
      make: clip(input.make, 60),
      model: clip(input.model, 80),
      year: yearOf(input.year) ?? undefined,
      plate: plateKey(clip(input.plate, 20)),
      vin: normalizeVin(clip(input.vin, 30)),
      mileage: mileageOf(input.mileage) ?? undefined,
      note: clip(input.note, 1000),
      createdAt: now(),
    };
    if (!v.make && !v.model && !v.plate && !v.vin) return { err: "Укажите марку/модель, госномер или VIN" };
    d.prepare(
      `INSERT INTO vehicles (id, client_id, make, model, year, plate, vin, mileage, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(v.id, clientId, v.make, v.model, v.year ?? null, v.plate, v.vin, v.mileage ?? null, v.note, v.createdAt);
    d.prepare("UPDATE clients SET updated_at = ? WHERE id = ?").run(now(), clientId);
    refreshSearch(d, clientId);
    return { vehicle: v };
  });
}

export function updateVehicle(id: string, input: VehicleInput): { vehicle: Vehicle } | { err: string } {
  return transaction((d) => {
    const r = d.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as Row | undefined;
    if (!r) return { err: "Автомобиль не найден" };
    const v = toVehicle(r);
    if (input.make !== undefined) v.make = clip(input.make, 60);
    if (input.model !== undefined) v.model = clip(input.model, 80);
    if (input.year !== undefined) v.year = yearOf(input.year) ?? undefined;
    if (input.plate !== undefined) v.plate = plateKey(clip(input.plate, 20));
    if (input.vin !== undefined) v.vin = normalizeVin(clip(input.vin, 30));
    if (input.mileage !== undefined) v.mileage = mileageOf(input.mileage) ?? undefined;
    if (input.note !== undefined) v.note = clip(input.note, 1000);
    d.prepare("UPDATE vehicles SET make = ?, model = ?, year = ?, plate = ?, vin = ?, mileage = ?, note = ? WHERE id = ?").run(
      v.make,
      v.model,
      v.year ?? null,
      v.plate,
      v.vin,
      v.mileage ?? null,
      v.note,
      id
    );
    refreshSearch(d, v.clientId);
    return { vehicle: v };
  });
}

export function deleteVehicle(id: string): { ok: true } | { err: string } {
  return transaction((d) => {
    const r = d.prepare("SELECT client_id FROM vehicles WHERE id = ?").get(id) as Row | undefined;
    if (!r) return { err: "Автомобиль не найден" };
    const n = Number((d.prepare("SELECT COUNT(*) AS n FROM work_orders WHERE vehicle_id = ?").get(id) as Row).n);
    if (n > 0) return { err: `По автомобилю ${n} заказ-нарядов — удалить нельзя` };
    d.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    refreshSearch(d, String(r.client_id));
    return { ok: true as const };
  });
}

/** Внутреннее: обновить пробег машины последним известным значением. */
export function touchVehicleMileage(d: DatabaseSync, vehicleId: string, mileage: number | undefined) {
  if (mileage === undefined) return;
  d.prepare("UPDATE vehicles SET mileage = ? WHERE id = ?").run(mileage, vehicleId);
}

export { refreshSearch as refreshClientSearch, mileageOf, yearOf };
