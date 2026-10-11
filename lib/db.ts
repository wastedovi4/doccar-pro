import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite-хранилище CRM: data/crm.db (встроенный node:sqlite, без нативных модулей).
 *
 * — Схема версионируется через PRAGMA user_version: миграции из MIGRATIONS
 *   применяются по порядку при открытии, каждая — в своей транзакции.
 * — Next в проде — один Node-процесс, API node:sqlite синхронный: транзакции
 *   не перемежаются. WAL + busy_timeout — на случай второго процесса (dev).
 * — При первом открытии данные из старого data/crm.json импортируются один раз,
 *   файл переименовывается в crm.json.imported (остаётся как копия).
 *
 * Напрямую из роутов не импортировать — только через lib/crm.ts: он регистрирует
 * инициализатор (импорт, первый админ) до первого обращения к базе.
 */

export const DATA_DIR = path.join(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "crm.db");
const LEGACY_JSON = path.join(DATA_DIR, "crm.json");

/* ---------- схема ---------- */

const MIGRATIONS: string[] = [
  // v1: сотрудники, заявки с сайта, записи календаря
  `
  CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    login       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('admin', 'receiver', 'mechanic')),
    password    TEXT NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at  TEXT NOT NULL
  );

  CREATE TABLE leads (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,
    car             TEXT NOT NULL DEFAULT '',
    service         TEXT NOT NULL DEFAULT '',
    message         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL CHECK (status IN ('new', 'seen', 'processed', 'archived')),
    created_at      TEXT NOT NULL,
    seen_at         TEXT,
    seen_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
    processed_at    TEXT,
    processed_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
    note            TEXT,
    appointment_id  TEXT REFERENCES appointments(id) ON DELETE SET NULL
  );
  CREATE INDEX leads_created ON leads (created_at DESC);
  CREATE INDEX leads_status ON leads (status);

  CREATE TABLE appointments (
    id            TEXT PRIMARY KEY,
    lead_id       TEXT REFERENCES leads(id) ON DELETE SET NULL,
    client_name   TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    car           TEXT NOT NULL DEFAULT '',
    service       TEXT NOT NULL DEFAULT '',
    mechanic_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
    start         TEXT NOT NULL,
    start_ms      INTEGER NOT NULL,
    duration_min  INTEGER NOT NULL CHECK (duration_min BETWEEN 15 AND 600),
    status        TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'done', 'cancelled')),
    note          TEXT,
    created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX appt_start ON appointments (start_ms);
  CREATE INDEX appt_mechanic_start ON appointments (mechanic_id, start_ms);

  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

function migrate(d: DatabaseSync) {
  const current = Number((d.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
  if (current > SCHEMA_VERSION) {
    throw new Error(`crm.db новее приложения (схема ${current} > ${SCHEMA_VERSION}) — обновите код`);
  }
  for (let v = current; v < SCHEMA_VERSION; v++) {
    d.exec("BEGIN IMMEDIATE");
    try {
      d.exec(MIGRATIONS[v]);
      d.exec(`PRAGMA user_version = ${v + 1}`);
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  }
}

/* ---------- подключение ---------- */

// Одно соединение на процесс; globalThis переживает hot-reload в dev.
const g = globalThis as unknown as { __crmDb?: DatabaseSync };

function openAt(file: string): DatabaseSync {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  migrate(d);
  return d;
}

let onFirstOpen: ((d: DatabaseSync) => void) | null = null;

/** Хук первичной инициализации (импорт crm.json, первый админ) — задаёт lib/crm.ts. */
export function setInitializer(fn: (d: DatabaseSync) => void) {
  onFirstOpen = fn;
}

export function db(): DatabaseSync {
  if (!g.__crmDb) {
    const d = openAt(DB_FILE);
    // Сначала сохранить: инициализатор сам работает через db()/transaction().
    g.__crmDb = d;
    try {
      onFirstOpen?.(d);
    } catch (e) {
      closeDb();
      throw e;
    }
  }
  return g.__crmDb;
}

export function closeDb() {
  if (g.__crmDb) {
    g.__crmDb.close();
    g.__crmDb = undefined;
  }
}

/* ---------- транзакции ---------- */

let depth = 0;

/**
 * Атомарный блок. Вложенные вызовы — через SAVEPOINT, так что репозитории
 * можно комбинировать в одной транзакции.
 */
export function transaction<T>(fn: (d: DatabaseSync) => T): T {
  const d = db();
  const sp = `sp${depth}`;
  d.exec(depth === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${sp}`);
  depth++;
  try {
    const result = fn(d);
    depth--;
    d.exec(depth === 0 ? "COMMIT" : `RELEASE ${sp}`);
    return result;
  } catch (e) {
    depth--;
    d.exec(depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
    throw e;
  }
}

/* ---------- старый crm.json ---------- */

/** Прочитать data/crm.json, если он есть и ещё не импортирован. */
export function readLegacyJson(): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(LEGACY_JSON, "utf8"));
  } catch {
    return null;
  }
}

/** После успешного импорта — убрать crm.json с дороги, оставив копию. */
export function retireLegacyJson() {
  if (fs.existsSync(LEGACY_JSON)) fs.renameSync(LEGACY_JSON, `${LEGACY_JSON}.imported`);
}

/* ---------- бэкап / восстановление ---------- */

const tmpFile = (tag: string) => path.join(os.tmpdir(), `crm-${tag}-${crypto.randomUUID()}.db`);
const sqlPath = (p: string) => p.replace(/\\/g, "/").replace(/'/g, "''");

/** Консистентный снимок базы (VACUUM INTO) — для бэкапа. */
export function snapshot(): Buffer {
  const tmp = tmpFile("snap");
  try {
    db().exec(`VACUUM INTO '${sqlPath(tmp)}'`);
    return fs.readFileSync(tmp);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Сохранить текущую базу рядом с собой перед заменой (на случай отката). */
export function keepCopyBeforeRestore(): string {
  const dest = path.join(DATA_DIR, `crm.db.before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  db().exec(`VACUUM INTO '${sqlPath(dest)}'`);
  return dest;
}

/**
 * Проверить присланный файл базы: целостность, наличие таблиц, версия схемы
 * не новее кода. Возвращает текст ошибки или null.
 */
export function validateDbFile(buf: Buffer): string | null {
  const tmp = tmpFile("check");
  fs.writeFileSync(tmp, buf);
  try {
    const d = new DatabaseSync(tmp, { readOnly: true });
    try {
      const ok = (d.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
      if (ok !== "ok") return "База в архиве повреждена";
      const version = Number((d.prepare("PRAGMA user_version").get() as { user_version: number }).user_version);
      if (version > SCHEMA_VERSION) return "База в архиве от более новой версии сайта";
      const tables = (d.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
        (t) => t.name
      );
      for (const t of ["users", "leads", "appointments"]) if (!tables.includes(t)) return "В архиве не база CRM";
      return null;
    } finally {
      d.close();
    }
  } catch {
    return "Не удалось открыть базу из архива";
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Заменить базу присланным (уже проверенным) файлом и переоткрыть с миграциями. */
export function replaceDbFile(buf: Buffer) {
  const incoming = `${DB_FILE}.incoming`;
  fs.writeFileSync(incoming, buf);
  closeDb();
  for (const suffix of ["-wal", "-shm"]) fs.rmSync(DB_FILE + suffix, { force: true });
  fs.renameSync(incoming, DB_FILE);
  db();
}
