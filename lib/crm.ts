import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Лёгкая CRM на файловом сторе (data/crm.json). Без внешних зависимостей.
 * Рассчитана на небольшой объём (один автосервис): чтение-модификация-запись
 * с сериализацией через in-process очередь (Next в проде — один Node-процесс).
 */

export type Role = "admin" | "receiver" | "mechanic";

export type User = {
  id: string;
  login: string;
  name: string;
  role: Role;
  password: string; // "salt:hashHex"
  active: boolean;
  createdAt: string;
};
export type PublicUser = Omit<User, "password">;

export type LeadStatus = "new" | "seen" | "processed" | "archived";
export type Lead = {
  id: string;
  name: string;
  phone: string;
  car: string;
  service?: string; // услуга, выбранная в форме записи
  message: string;
  status: LeadStatus;
  createdAt: string;
  seenAt?: string;
  seenBy?: string; // userId
  processedAt?: string;
  processedBy?: string; // userId
  note?: string;
  appointmentId?: string;
};

export type ApptStatus = "scheduled" | "in_progress" | "done" | "cancelled";
export type Appointment = {
  id: string;
  leadId?: string;
  clientName: string;
  phone: string;
  car: string;
  service: string;
  mechanicId?: string;
  start: string; // ISO datetime
  durationMin: number;
  status: ApptStatus;
  note?: string;
  createdBy: string; // userId
  createdAt: string;
};

export type DB = {
  users: User[];
  leads: Lead[];
  appointments: Appointment[];
};

const DATA_FILE = path.join(process.cwd(), "data", "crm.json");

export function uid(): string {
  return crypto.randomUUID();
}

/* ---------- пароли (scrypt) ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(test, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ---------- запись с сериализацией ---------- */

let writeChain: Promise<unknown> = Promise.resolve();

async function readRaw(): Promise<DB> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    return {
      users: Array.isArray(db.users) ? db.users : [],
      leads: Array.isArray(db.leads) ? db.leads : [],
      appointments: Array.isArray(db.appointments) ? db.appointments : [],
    };
  } catch {
    return { users: [], leads: [], appointments: [] };
  }
}

async function writeRaw(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Атомарная транзакция: читает БД, применяет mutator, пишет результат. */
export function tx<T>(mutator: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await ensureSeeded(await readRaw());
    const result = await mutator(db);
    await writeRaw(db);
    return result;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => {});
  return p;
}

/** Чтение без записи (сидинг выполняется отдельно при первой транзакции). */
export async function read(): Promise<DB> {
  const db = await readRaw();
  // Если пусто — засидим админа и сохраним.
  if (db.users.length === 0) {
    return tx((d) => d);
  }
  return db;
}

/* ---------- сидинг первого админа ---------- */

async function ensureSeeded(db: DB): Promise<DB> {
  if (db.users.length === 0) {
    const login = process.env.ADMIN_LOGIN || "doccar";
    const password = process.env.ADMIN_PASSWORD || "doccar-admin";
    db.users.push({
      id: uid(),
      login,
      name: "Владелец",
      role: "admin",
      password: hashPassword(password),
      active: true,
      createdAt: new Date().toISOString(),
    });
  }
  return db;
}

/* ---------- утилиты ---------- */

export function toPublic(u: User): PublicUser {
  const { password, ...rest } = u;
  return rest;
}

export async function findUserByLogin(login: string): Promise<User | undefined> {
  const db = await read();
  return db.users.find((u) => u.login.toLowerCase() === login.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await read();
  return db.users.find((u) => u.id === id);
}
