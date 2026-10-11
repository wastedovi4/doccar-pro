import crypto from "crypto";
import type { DatabaseSync } from "node:sqlite";
import { db, readLegacyJson, retireLegacyJson, setInitializer, transaction } from "@/lib/db";
import {
  APPT_STATUSES,
  LEAD_STATUSES,
  ROLES,
  type Appointment,
  type ApptStatus,
  type Lead,
  type LeadStatus,
  type PublicUser,
  type Role,
  type User,
} from "@/lib/crm-types";
import { BRAND } from "@/config/brand";

/**
 * Репозитории CRM поверх SQLite (lib/db.ts): сотрудники, заявки с сайта,
 * записи календаря. Бизнес-правила (последний админ, пересечения у механика,
 * связь запись ↔ заявка) живут здесь, роуты — только HTTP-обвязка.
 */

export * from "@/lib/crm-types";

export function uid(): string {
  return crypto.randomUUID();
}

const now = () => new Date().toISOString();
type Row = Record<string, unknown>;
const opt = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

/* ---------- пароли (scrypt) ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}

/* ---------- маппинг строк ---------- */

function toUser(r: Row): User {
  return {
    id: String(r.id),
    login: String(r.login),
    name: String(r.name),
    role: r.role as Role,
    password: String(r.password),
    active: r.active === 1,
    createdAt: String(r.created_at),
  };
}

export function toPublic(u: User): PublicUser {
  const { password: _password, ...rest } = u;
  return rest;
}

function toLead(r: Row): Lead {
  return {
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone),
    car: String(r.car),
    service: String(r.service) || undefined,
    message: String(r.message),
    status: r.status as LeadStatus,
    createdAt: String(r.created_at),
    seenAt: opt(r.seen_at),
    seenBy: opt(r.seen_by),
    processedAt: opt(r.processed_at),
    processedBy: opt(r.processed_by),
    note: opt(r.note),
    appointmentId: opt(r.appointment_id),
    clientId: opt(r.client_id),
  };
}

function toAppointment(r: Row): Appointment {
  return {
    id: String(r.id),
    leadId: opt(r.lead_id),
    clientName: String(r.client_name),
    phone: String(r.phone),
    car: String(r.car),
    service: String(r.service),
    mechanicId: opt(r.mechanic_id),
    start: String(r.start),
    durationMin: Number(r.duration_min),
    status: r.status as ApptStatus,
    note: opt(r.note),
    createdBy: opt(r.created_by),
    createdAt: String(r.created_at),
    clientId: opt(r.client_id),
    workOrderId: opt(r.wo_id),
    workOrderNumber: r.wo_number === null || r.wo_number === undefined ? undefined : Number(r.wo_number),
  };
}

/** Записи вместе с открытым по ним заказ-нарядом. */
const APPT_SELECT =
  "SELECT a.*, w.id AS wo_id, w.number AS wo_number FROM appointments a LEFT JOIN work_orders w ON w.appointment_id = a.id";

export function clampDuration(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 60;
  return Math.min(600, Math.max(15, Math.round(n)));
}

/** ISO-время → мс; невалидное — null. */
function startMs(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/* ---------- сотрудники ---------- */

export function listUsers(): User[] {
  return (db().prepare("SELECT * FROM users ORDER BY created_at").all() as Row[]).map(toUser);
}

export function findUserById(id: string): User | undefined {
  const r = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
  return r ? toUser(r) : undefined;
}

export function findUserByLogin(login: string): User | undefined {
  const r = db().prepare("SELECT * FROM users WHERE login = ? COLLATE NOCASE").get(login) as Row | undefined;
  return r ? toUser(r) : undefined;
}

export function listStaff(): Pick<User, "id" | "name" | "role">[] {
  return db().prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY name").all() as Pick<
    User,
    "id" | "name" | "role"
  >[];
}

function activeAdminCount(d: DatabaseSync): number {
  return Number((d.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get() as Row).n);
}

export function createUser(input: {
  login: string;
  name: string;
  password: string;
  role: Role;
}): { user: PublicUser } | { err: string } {
  return transaction((d) => {
    if (findUserByLogin(input.login)) return { err: "Логин уже занят" };
    const user: User = {
      id: uid(),
      login: input.login,
      name: input.name,
      role: input.role,
      password: hashPassword(input.password),
      active: true,
      createdAt: now(),
    };
    d.prepare(
      "INSERT INTO users (id, login, name, role, password, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
    ).run(user.id, user.login, user.name, user.role, user.password, user.createdAt);
    return { user: toPublic(user) };
  });
}

export function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean; password?: string }
): { user: PublicUser } | { err: string; code: 404 | 409 } {
  return transaction((d) => {
    const u = findUserById(id);
    if (!u) return { err: "Не найден", code: 404 as const };
    const isLastAdmin = u.role === "admin" && u.active && activeAdminCount(d) <= 1;

    if (patch.role && patch.role !== "admin" && isLastAdmin) {
      return { err: "Нельзя снять роль у последнего админа", code: 409 as const };
    }
    if (patch.active === false && isLastAdmin) {
      return { err: "Нельзя отключить последнего админа", code: 409 as const };
    }
    const next: User = {
      ...u,
      name: patch.name?.trim() || u.name,
      role: patch.role && ROLES.includes(patch.role) ? patch.role : u.role,
      active: typeof patch.active === "boolean" ? patch.active : u.active,
      password: patch.password && patch.password.length >= 4 ? hashPassword(patch.password) : u.password,
    };
    d.prepare("UPDATE users SET name = ?, role = ?, active = ?, password = ? WHERE id = ?").run(
      next.name,
      next.role,
      next.active ? 1 : 0,
      next.password,
      id
    );
    return { user: toPublic(next) };
  });
}

export function deleteUser(id: string, actorId: string): { ok: true } | { err: string } {
  if (id === actorId) return { err: "Нельзя удалить себя" };
  return transaction((d) => {
    const u = findUserById(id);
    if (!u) return { err: "Не найден" };
    if (u.role === "admin" && u.active && activeAdminCount(d) <= 1) return { err: "Нельзя удалить последнего админа" };
    // Ссылки на сотрудника в заявках и записях обнуляются (ON DELETE SET NULL).
    d.prepare("DELETE FROM users WHERE id = ?").run(id);
    return { ok: true as const };
  });
}

/* ---------- заявки с сайта ---------- */

export function createLead(input: {
  name: string;
  phone: string;
  car: string;
  service: string;
  message: string;
  clientId?: string; // заявка из личного кабинета
}): Lead {
  const { clientId, ...fields } = input;
  const lead: Lead = { id: uid(), ...fields, service: input.service || undefined, status: "new", createdAt: now(), clientId };
  db()
    .prepare(
      "INSERT INTO leads (id, name, phone, car, service, message, status, created_at, client_id) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)"
    )
    .run(lead.id, lead.name, lead.phone, lead.car, input.service, lead.message, lead.createdAt, clientId ?? null);
  return lead;
}

export function listLeads(limit?: number): Lead[] {
  const sql = "SELECT * FROM leads ORDER BY created_at DESC" + (limit ? " LIMIT ?" : "");
  const stmt = db().prepare(sql);
  return ((limit ? stmt.all(limit) : stmt.all()) as Row[]).map(toLead);
}

export function countNewLeads(): number {
  return Number((db().prepare("SELECT COUNT(*) AS n FROM leads WHERE status = 'new'").get() as Row).n);
}

export function updateLead(
  id: string,
  patch: { seen?: boolean; processed?: boolean; note?: string; status?: string; appointmentId?: string },
  actorId: string
): Lead | null {
  return transaction((d) => {
    const r = d.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Row | undefined;
    if (!r) return null;
    const l = toLead(r);
    const t = now();
    if (patch.seen && !l.seenAt) {
      l.seenAt = t;
      l.seenBy = actorId;
      if (l.status === "new") l.status = "seen";
    }
    if (patch.processed) {
      l.processedAt = t;
      l.processedBy = actorId;
      l.status = "processed";
    }
    if (typeof patch.note === "string") l.note = patch.note;
    if (typeof patch.status === "string" && LEAD_STATUSES.includes(patch.status as LeadStatus)) {
      l.status = patch.status as LeadStatus;
    }
    if (typeof patch.appointmentId === "string") l.appointmentId = patch.appointmentId || undefined;
    d.prepare(
      `UPDATE leads SET status = ?, seen_at = ?, seen_by = ?, processed_at = ?, processed_by = ?,
         note = ?, appointment_id = ? WHERE id = ?`
    ).run(
      l.status,
      l.seenAt ?? null,
      l.seenBy ?? null,
      l.processedAt ?? null,
      l.processedBy ?? null,
      l.note ?? null,
      l.appointmentId ?? null,
      id
    );
    return l;
  });
}

/**
 * Удалить заявку (спам, тест). Заявку, из которой создана запись, удалить нельзя —
 * это история визита, её архивируют.
 */
export function deleteLead(id: string): "ok" | "not_found" | "has_appointment" {
  return transaction((d) => {
    const r = d.prepare("SELECT appointment_id FROM leads WHERE id = ?").get(id) as Row | undefined;
    if (!r) return "not_found";
    const linked = r.appointment_id || d.prepare("SELECT 1 FROM appointments WHERE lead_id = ? LIMIT 1").get(id);
    if (linked) return "has_appointment";
    d.prepare("DELETE FROM leads WHERE id = ?").run(id);
    return "ok";
  });
}

/* ---------- записи календаря ---------- */

export function listAppointments(filter: { mechanicId?: string; clientId?: string } = {}): Appointment[] {
  const rows = filter.mechanicId
    ? db().prepare(`${APPT_SELECT} WHERE a.mechanic_id = ? ORDER BY a.start_ms`).all(filter.mechanicId)
    : filter.clientId
      ? db().prepare(`${APPT_SELECT} WHERE a.client_id = ? ORDER BY a.start_ms DESC`).all(filter.clientId)
      : db().prepare(`${APPT_SELECT} ORDER BY a.start_ms`).all();
  return (rows as Row[]).map(toAppointment);
}

export function findAppointment(id: string): Appointment | undefined {
  const r = db().prepare(`${APPT_SELECT} WHERE a.id = ?`).get(id) as Row | undefined;
  return r ? toAppointment(r) : undefined;
}

/** Пересечение по времени у того же механика (без учёта отменённых). */
function findConflict(
  d: DatabaseSync,
  mechanicId: string | undefined,
  start: string,
  durationMin: number,
  excludeId = ""
): Appointment | null {
  if (!mechanicId) return null;
  const a = startMs(start);
  if (a === null) return null;
  const r = d
    .prepare(
      `SELECT * FROM appointments
        WHERE mechanic_id = ? AND status != 'cancelled' AND id != ?
          AND start_ms < ? AND start_ms + duration_min * 60000 > ?
        ORDER BY start_ms LIMIT 1`
    )
    .get(mechanicId, excludeId, a + durationMin * 60000, a) as Row | undefined;
  return r ? toAppointment(r) : null;
}

export type ApptInput = {
  leadId?: string;
  clientName: string;
  phone: string;
  car: string;
  service: string;
  mechanicId?: string;
  start: string;
  durationMin: number;
  status: ApptStatus;
  note: string;
};

export function createAppointment(
  input: ApptInput,
  actorId: string,
  force: boolean
): { appt: Appointment } | { conflict: Appointment } | { err: string } {
  const ms = startMs(input.start);
  if (ms === null) return { err: "Некорректное время" };
  return transaction((d) => {
    if (!force) {
      const c = findConflict(d, input.mechanicId, input.start, input.durationMin);
      if (c) return { conflict: c };
    }
    const lead = input.leadId ? (d.prepare("SELECT * FROM leads WHERE id = ?").get(input.leadId) as Row | undefined) : undefined;
    const mechanicOk = input.mechanicId ? !!findUserById(input.mechanicId) : false;
    const appt: Appointment = {
      id: uid(),
      ...input,
      leadId: lead ? input.leadId : undefined,
      mechanicId: mechanicOk ? input.mechanicId : undefined,
      createdBy: actorId,
      createdAt: now(),
    };
    d.prepare(
      `INSERT INTO appointments (id, lead_id, client_name, phone, car, service, mechanic_id, start, start_ms,
         duration_min, status, note, created_by, created_at, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      appt.id,
      appt.leadId ?? null,
      appt.clientName,
      appt.phone,
      appt.car,
      appt.service,
      appt.mechanicId ?? null,
      appt.start,
      ms,
      appt.durationMin,
      appt.status,
      appt.note ?? null,
      actorId,
      appt.createdAt,
      // Заявка из личного кабинета уже знает клиента — запись наследует его.
      lead?.client_id ? String(lead.client_id) : null
    );
    // Запись из заявки — связать и пометить заявку обработанной.
    if (lead) {
      d.prepare(
        `UPDATE leads SET appointment_id = ?, status = 'processed',
           processed_at = COALESCE(processed_at, ?), processed_by = COALESCE(processed_by, ?)
         WHERE id = ?`
      ).run(appt.id, appt.createdAt, actorId, input.leadId!);
    }
    return { appt };
  });
}

export function updateAppointment(
  id: string,
  patch: Partial<Omit<ApptInput, "leadId">> & { mechanicIdSet?: boolean },
  actor: { id: string; role: Role },
  force: boolean
): { appt: Appointment } | { conflict: Appointment } | { err: 400 | 403 | 404 } {
  return transaction((d) => {
    const a = findAppointment(id);
    if (!a) return { err: 404 as const };
    const isManager = actor.role === "admin" || actor.role === "receiver";
    const isOwnerMech = actor.role === "mechanic" && a.mechanicId === actor.id;
    if (!isManager && !isOwnerMech) return { err: 403 as const };

    const next: Appointment = { ...a };
    if (isManager) {
      if (patch.mechanicIdSet) next.mechanicId = patch.mechanicId && findUserById(patch.mechanicId) ? patch.mechanicId : undefined;
      if (typeof patch.start === "string") next.start = patch.start;
      if (patch.durationMin !== undefined) next.durationMin = clampDuration(patch.durationMin);
      const timeChanged = patch.mechanicIdSet || typeof patch.start === "string" || patch.durationMin !== undefined;
      if (startMs(next.start) === null) return { err: 400 as const };
      if (!force && timeChanged) {
        const c = findConflict(d, next.mechanicId, next.start, next.durationMin, a.id);
        if (c) return { conflict: c };
      }
      if (typeof patch.clientName === "string") next.clientName = patch.clientName.trim();
      if (typeof patch.phone === "string") next.phone = patch.phone.trim();
      if (typeof patch.car === "string") next.car = patch.car.trim();
      if (typeof patch.service === "string") next.service = patch.service.trim();
      if (typeof patch.note === "string") next.note = patch.note.trim();
    }
    // Механик может менять только статус своей записи.
    if (patch.status && APPT_STATUSES.includes(patch.status)) next.status = patch.status;

    d.prepare(
      `UPDATE appointments SET client_name = ?, phone = ?, car = ?, service = ?, mechanic_id = ?, start = ?,
         start_ms = ?, duration_min = ?, status = ?, note = ? WHERE id = ?`
    ).run(
      next.clientName,
      next.phone,
      next.car,
      next.service,
      next.mechanicId ?? null,
      next.start,
      startMs(next.start)!,
      next.durationMin,
      next.status,
      next.note ?? null,
      id
    );
    return { appt: next };
  });
}

export function deleteAppointment(id: string) {
  // Заявка, из которой создана запись, теряет ссылку (ON DELETE SET NULL).
  db().prepare("DELETE FROM appointments WHERE id = ?").run(id);
}

/* ---------- сводки ---------- */

export function getStats() {
  const d = db();
  const count = (sql: string, ...p: (string | number)[]) => Number((d.prepare(sql).get(...p) as Row).n);

  const leadStatus = { new: 0, seen: 0, processed: 0, archived: 0 };
  for (const r of d.prepare("SELECT status, COUNT(*) AS n FROM leads GROUP BY status").all() as Row[]) {
    leadStatus[r.status as LeadStatus] = Number(r.n);
  }
  const apptStatus = { scheduled: 0, in_progress: 0, done: 0, cancelled: 0 };
  for (const r of d.prepare("SELECT status, COUNT(*) AS n FROM appointments GROUP BY status").all() as Row[]) {
    apptStatus[r.status as ApptStatus] = Number(r.n);
  }

  // Заявки по дням за последние 7 дней (включая сегодня), дни по UTC — как раньше.
  const dayMs = 24 * 60 * 60 * 1000;
  const byDay = Array.from({ length: 7 }, (_, k) => {
    const key = new Date(Date.now() - (6 - k) * dayMs).toISOString().slice(0, 10);
    return { date: key, count: count("SELECT COUNT(*) AS n FROM leads WHERE substr(created_at, 1, 10) = ?", key) };
  });

  const perMechanic = (
    d
      .prepare(
        `SELECT u.id, u.name,
                COUNT(a.id) AS total,
                SUM(a.status = 'done') AS done,
                SUM(a.status IN ('scheduled', 'in_progress')) AS active
           FROM users u LEFT JOIN appointments a ON a.mechanic_id = u.id
          WHERE u.role = 'mechanic'
          GROUP BY u.id ORDER BY u.name`
      )
      .all() as Row[]
  ).map((r) => ({ id: String(r.id), name: String(r.name), total: Number(r.total), done: Number(r.done ?? 0), active: Number(r.active ?? 0) }));

  const totalLeads = Object.values(leadStatus).reduce((s, n) => s + n, 0);
  return {
    totalLeads,
    newLeads: leadStatus.new,
    leadStatus,
    apptStatus,
    byDay,
    perMechanic,
    upcoming: count("SELECT COUNT(*) AS n FROM appointments WHERE status = 'scheduled' AND start_ms >= ?", Date.now()),
    doneTotal: apptStatus.done,
    conversion: totalLeads ? Math.round((leadStatus.processed / totalLeads) * 100) : 0,
    staffCount: count("SELECT COUNT(*) AS n FROM users WHERE active = 1"),
  };
}

/** Последние заявки и записи — для авто-обновления и уведомлений. */
export function getFeed(user: { id: string; role: Role }) {
  const manager = user.role === "admin" || user.role === "receiver";
  const d = db();
  const leads = manager
    ? (d.prepare("SELECT id, name, car, created_at, status FROM leads ORDER BY created_at DESC LIMIT 30").all() as Row[]).map(
        (r) => ({ id: String(r.id), name: String(r.name), car: String(r.car), createdAt: String(r.created_at), status: String(r.status) })
      )
    : [];
  const apptRows = (
    user.role === "mechanic"
      ? d.prepare("SELECT * FROM appointments WHERE mechanic_id = ? ORDER BY created_at DESC LIMIT 30").all(user.id)
      : d.prepare("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 30").all()
  ) as Row[];
  return {
    newLeads: manager ? countNewLeads() : 0,
    leads,
    appointments: apptRows.map(toAppointment).map((a) => ({
      id: a.id,
      clientName: a.clientName,
      start: a.start,
      status: a.status,
      createdAt: a.createdAt,
      mechanicId: a.mechanicId,
    })),
  };
}

/** Записи на сегодня (локальная дата сервера по ISO-префиксу — как раньше). */
export function countTodayAppointments(mechanicId?: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const sql = `SELECT COUNT(*) AS n FROM appointments WHERE substr(start, 1, 10) = ? AND status != 'cancelled'${
    mechanicId ? " AND mechanic_id = ?" : ""
  }`;
  const p: string[] = mechanicId ? [today, mechanicId] : [today];
  return Number((db().prepare(sql).get(...p) as Row).n);
}

/* ---------- импорт старого формата (crm.json) ---------- */

type LegacyDb = { users?: unknown[]; leads?: unknown[]; appointments?: unknown[] };

/**
 * Перенос данных из формата data/crm.json в базу. replace=true — сначала
 * очистить таблицы (восстановление из старого бэкапа). Ссылки на отсутствующих
 * сотрудников/заявки/записи обнуляются, дубликаты id пропускаются.
 */
export function importLegacy(data: LegacyDb, opts: { replace?: boolean } = {}): { users: number; leads: number; appointments: number } {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Row[]) : []);
  const s = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
  return transaction((d) => {
    if (opts.replace) d.exec("DELETE FROM appointments; DELETE FROM leads; DELETE FROM users;");
    const userIds = new Set<string>();
    const insUser = d.prepare(
      "INSERT OR IGNORE INTO users (id, login, name, role, password, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const u of arr(data.users)) {
      const id = s(u.id);
      if (!id || !s(u.login) || !s(u.password)) continue;
      const role = ROLES.includes(u.role as Role) ? (u.role as Role) : "mechanic";
      if (insUser.run(id, s(u.login), s(u.name, s(u.login)), role, s(u.password), u.active === false ? 0 : 1, s(u.createdAt, now())).changes)
        userIds.add(id);
    }
    const userRef = (v: unknown) => (typeof v === "string" && userIds.has(v) ? v : null);

    const leadIds = new Set<string>();
    const insLead = d.prepare(
      `INSERT OR IGNORE INTO leads (id, name, phone, car, service, message, status, created_at, seen_at, seen_by,
         processed_at, processed_by, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const l of arr(data.leads)) {
      const id = s(l.id);
      if (!id) continue;
      const status = LEAD_STATUSES.includes(l.status as LeadStatus) ? (l.status as LeadStatus) : "new";
      if (
        insLead.run(id, s(l.name, "—"), s(l.phone), s(l.car), s(l.service), s(l.message), status, s(l.createdAt, now()),
          opt(l.seenAt) ?? null, userRef(l.seenBy), opt(l.processedAt) ?? null, userRef(l.processedBy), opt(l.note) ?? null).changes
      )
        leadIds.add(id);
    }

    let appts = 0;
    const insAppt = d.prepare(
      `INSERT OR IGNORE INTO appointments (id, lead_id, client_name, phone, car, service, mechanic_id, start, start_ms,
         duration_min, status, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const linkLead = d.prepare("UPDATE leads SET appointment_id = ? WHERE id = ?");
    for (const a of arr(data.appointments)) {
      const id = s(a.id);
      const ms = startMs(s(a.start));
      if (!id || ms === null) continue;
      const leadId = typeof a.leadId === "string" && leadIds.has(a.leadId) ? a.leadId : null;
      const status = APPT_STATUSES.includes(a.status as ApptStatus) ? (a.status as ApptStatus) : "scheduled";
      if (
        insAppt.run(id, leadId, s(a.clientName, "—"), s(a.phone), s(a.car), s(a.service), userRef(a.mechanicId), s(a.start), ms,
          clampDuration(a.durationMin), status, opt(a.note) ?? null, userRef(a.createdBy), s(a.createdAt, now())).changes
      ) {
        appts++;
        if (leadId) linkLead.run(id, leadId);
      }
    }
    // Обратные ссылки заявка → запись из старого формата (если запись существует).
    for (const l of arr(data.leads)) {
      if (typeof l.appointmentId === "string" && leadIds.has(s(l.id))) {
        const exists = d.prepare("SELECT 1 FROM appointments WHERE id = ?").get(l.appointmentId);
        if (exists) linkLead.run(l.appointmentId, s(l.id));
      }
    }
    return { users: userIds.size, leads: leadIds.size, appointments: appts };
  });
}

/* ---------- первичная инициализация ---------- */

// При первом открытии базы: перенос из старого crm.json (один раз) + первый админ.
setInitializer((d) => {
  const imported = d.prepare("SELECT value FROM meta WHERE key = 'legacy_json_imported'").get();
  if (!imported) {
    const legacy = readLegacyJson() as LegacyDb | null;
    if (legacy) {
      const n = importLegacy(legacy);
      console.log(`[crm] импорт из crm.json: сотрудников ${n.users}, заявок ${n.leads}, записей ${n.appointments}`);
    }
    d.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_json_imported', ?)").run(now());
    if (legacy) retireLegacyJson();
  }
  const users = Number((d.prepare("SELECT COUNT(*) AS n FROM users").get() as Row).n);
  if (users === 0) {
    d.prepare(
      "INSERT INTO users (id, login, name, role, password, active, created_at) VALUES (?, ?, 'Владелец', 'admin', ?, 1, ?)"
    ).run(uid(), process.env.ADMIN_LOGIN || BRAND.defaultAdminLogin, hashPassword(process.env.ADMIN_PASSWORD || BRAND.defaultAdminPassword), now());
  }
});

/* ---------- бэкап / восстановление (реализация — lib/db.ts) ---------- */

export { snapshot, validateDbFile, replaceDbFile, keepCopyBeforeRestore, SCHEMA_VERSION } from "@/lib/db";
