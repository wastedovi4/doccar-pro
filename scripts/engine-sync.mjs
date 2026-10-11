#!/usr/bin/env node
/**
 * Синхронизация движка doccar в другой сайт на том же движке (например, lenkrad).
 *
 *   node scripts/engine-sync.mjs <сайт>            — проверка (по умолчанию), ничего не меняет
 *   node scripts/engine-sync.mjs <сайт> --apply    — взять движок из HEAD этого репо
 *       --prune   при первом переносе удалить в зонах движка файлы, которых в движке нет
 *       --force   перезаписать файлы движка, изменённые на сайте (локальные правки потеряются)
 *
 * Движок берётся из ЗАКОММИЧЕННОГО состояния (git HEAD), не из рабочего дерева:
 * в сайт уходит ровно то, что есть в истории doccar. На сайте пишется
 * engine.lock.json — коммит движка и хэши файлов; по нему проверка видит и
 * правки движка на стороне сайта (запрещены — править только в doccar), и
 * обновления движка. Граница и контракт бренда — docs/ENGINE.md.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = "engine.lock.json";

/** Каталоги, целиком принадлежащие движку. */
const ENGINE_DIRS = ["lib/", "app/api/", "app/admin/", "app/lk/", "app/r/", "components/admin/", "components/lk/"];
/** Отдельные файлы движка. */
const ENGINE_FILES = [
  "app/robots.ts",
  "app/sitemap.ts",
  "components/OrderDocument.tsx",
  "components/PrintBar.tsx",
  "components/JsonLd.tsx",
  "scripts/gen-env.mjs",
  "Dockerfile",
  ".dockerignore",
  "next.config.mjs",
  "postcss.config.mjs",
  "tsconfig.json",
  "docs/ENGINE.md",
];
const isEngine = (p) => ENGINE_FILES.includes(p) || ENGINE_DIRS.some((d) => p.startsWith(d));

/* ---------- аргументы ---------- */
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const APPLY = args.includes("--apply");
const PRUNE = args.includes("--prune");
const FORCE = args.includes("--force");
if (!target) {
  console.error("Использование: node scripts/engine-sync.mjs <каталог сайта> [--apply [--prune] [--force]]");
  process.exit(2);
}
const T = path.resolve(target);
if (T === UPSTREAM) {
  console.error("Каталог сайта совпадает с репозиторием движка.");
  process.exit(2);
}
if (!fs.existsSync(path.join(T, "package.json"))) {
  console.error(`Нет package.json в ${T} — это не сайт.`);
  process.exit(2);
}

/* ---------- движок из git HEAD ---------- */
const git = (...a) => execFileSync("git", ["-C", UPSTREAM, ...a], { encoding: "buffer", maxBuffer: 64 << 20 });
const commit = git("rev-parse", "HEAD").toString().trim();
const dirtyEngine = git("status", "--porcelain")
  .toString()
  .split("\n")
  .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
  .filter((p) => p && isEngine(p));
const upstreamFiles = git("ls-tree", "-r", "--name-only", "HEAD")
  .toString()
  .split("\n")
  .filter((p) => p && isEngine(p));
// Перевод строк не считаем отличием (autocrlf на Windows).
const norm = (buf) => Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const sha = (buf) => createHash("sha256").update(norm(buf)).digest("hex");
const upstream = new Map(upstreamFiles.map((p) => [p, norm(git("show", `HEAD:${p}`))]));

/* ---------- сайт ---------- */
const lockPath = path.join(T, LOCK);
const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, "utf8")) : null;
const readT = (p) => {
  const f = path.join(T, p);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
};
function walk(dir, out = []) {
  const abs = path.join(T, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}${e.name}`;
    if (e.isDirectory()) walk(`${rel}/`, out);
    else out.push(rel);
  }
  return out;
}
const targetEngineFiles = new Set([...ENGINE_DIRS.flatMap((d) => walk(d)), ...ENGINE_FILES.filter((f) => readT(f))]);

/* ---------- сравнение ---------- */
const locked = lock?.files ?? {};
const drift = []; // правки движка на стороне сайта
const changed = []; // движок обновился
const added = []; // новые файлы движка
const removed = []; // убраны из движка (были в lock)
const orphans = []; // в зонах движка, но не из движка и не из lock

for (const [p, buf] of upstream) {
  const cur = readT(p);
  if (p in locked) {
    if (cur && sha(cur) !== locked[p]) drift.push(p);
    if (!cur) drift.push(`${p} (удалён на сайте)`);
    if (sha(buf) !== locked[p]) changed.push(p);
  } else if (!cur) added.push(p);
  else if (sha(cur) !== sha(buf)) (lock ? drift : changed).push(lock ? `${p} (не из движка)` : p);
}
for (const p of Object.keys(locked)) if (!upstream.has(p)) removed.push(p);
for (const p of targetEngineFiles) if (!upstream.has(p) && !(p in locked)) orphans.push(p);

/* ---------- контракт бренда ---------- */
const problems = [];
const need = (p) => {
  const b = readT(p);
  if (!b) problems.push(`нет файла бренда ${p}`);
  return b ? b.toString("utf8") : "";
};
const exportsOf = (src, names, file) => {
  for (const n of names)
    if (!new RegExp(`export\\s+(const|function|async function|type|class)\\s+${n}\\b`).test(src))
      problems.push(`${file}: нет export ${n}`);
};
const blockTypes = (() => {
  const src = upstream.get("lib/content-model.ts")?.toString("utf8") ?? "";
  const m = /export const BLOCK_TYPES = \[([\s\S]*?)\]/.exec(src);
  return m ? [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]) : [];
})();

const brandTs = need("config/brand.ts");
if (brandTs) {
  exportsOf(brandTs, ["BRAND"], "config/brand.ts");
  for (const k of ["id", "crmTitle", "defaultAdminLogin", "defaultAdminPassword", "placeholders", "siteUrl", "email", "street", "geo"])
    if (!new RegExp(`\\b${k}\\s*:`).test(brandTs)) problems.push(`config/brand.ts: нет поля ${k}`);
}
const defaults = need("config/content-defaults.ts");
if (defaults) exportsOf(defaults, ["DEFAULT_CONTENT", "DEFAULT_BLOCKS"], "config/content-defaults.ts");
const logo = need("components/Logo.tsx");
if (logo) {
  exportsOf(logo, ["Logo", "LogoMark", "Wordmark"], "components/Logo.tsx");
  if (!/["']tile["']/.test(logo)) problems.push(`components/Logo.tsx: LogoMark не поддерживает tone="tile" (знак для печати на белом)`);
}
const view = need("components/blocks/index.tsx");
if (view) {
  exportsOf(view, ["BlockView"], "components/blocks/index.tsx");
  for (const t of blockTypes)
    if (!new RegExp(`case\\s+"${t}"`).test(view)) problems.push(`components/blocks/index.tsx: нет отрисовки раздела "${t}"`);
}
const css = need("app/globals.css");
for (const c of ["container-x", "eyebrow", "rule", "btn", "btn-primary", "btn-ghost", "btn-outline-light", "card", "panel", "theme-dark", "theme-light"])
  if (css && !new RegExp(`\\.${c}\\b`).test(css)) problems.push(`app/globals.css: нет класса .${c}`);
for (const v of ["--accent", "--accent-hover", "--on-accent"])
  if (css && !css.includes(v)) problems.push(`app/globals.css: нет переменной ${v}`);
const tw = need("tailwind.config.ts");
if (tw) {
  for (const tok of ["accent", "on-accent", "night", "coal", "steel", "frost", "graphite", "muted", "mist", "line"])
    if (!new RegExp(`["']?${tok}["']?\\s*:`).test(tw)) problems.push(`tailwind.config.ts: нет цвета ${tok}`);
  // Движок пользуется стандартными палитрами Tailwind — бренд не должен их затенять.
  const from = tw.indexOf("colors:");
  const to = tw.indexOf("fontFamily", from);
  const colors = from < 0 ? "" : tw.slice(from, to > from ? to : undefined);
  for (const p of ["slate", "gray", "zinc", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "pink", "rose"])
    if (new RegExp(`(^|\\n)\\s*["']?${p}["']?\\s*:`).test(colors)) problems.push(`tailwind.config.ts: цвет "${p}" затеняет палитру Tailwind (${p}-50…900) — переименуйте`);
  if (!/display\s*:/.test(tw)) problems.push("tailwind.config.ts: нет fontFamily.display");
  for (const g of ["./app/", "./components/", "./lib/"])
    if (!tw.includes(`"${g}**`)) problems.push(`tailwind.config.ts: content не включает ${g}** (классы движка не попадут в CSS)`);
}
for (const f of ["public/og-image.png", "public/icon-512.png"]) if (!readT(f)) problems.push(`нет ${f} (JSON-LD и соцсети)`);
// Зависимости: как у движка (та же сборка).
const upPkg = JSON.parse(fs.readFileSync(path.join(UPSTREAM, "package.json"), "utf8"));
const tPkg = JSON.parse(readT("package.json").toString("utf8"));
for (const sec of ["dependencies", "devDependencies"])
  for (const [dep, ver] of Object.entries(upPkg[sec] ?? {}))
    if ((tPkg[sec] ?? {})[dep] !== ver) problems.push(`package.json ${sec}.${dep}: нужно "${ver}", сейчас ${JSON.stringify((tPkg[sec] ?? {})[dep] ?? null)}`);
if (tPkg.engines?.node !== upPkg.engines?.node) problems.push(`package.json engines.node: нужно "${upPkg.engines?.node}"`);

/* ---------- отчёт ---------- */
const list = (title, items) => items.length && console.log(`\n${title} (${items.length}):\n${items.map((x) => `  ${x}`).join("\n")}`);
console.log(`Движок: ${UPSTREAM} @ ${commit.slice(0, 7)}`);
console.log(`Сайт:   ${T}${lock ? ` (движок @ ${String(lock.commit).slice(0, 7)} от ${lock.syncedAt})` : " (движок ещё не переносился)"}`);
if (dirtyEngine.length) list("⚠ В doccar есть незакоммиченные правки движка — в сайт они НЕ попадут", dirtyEngine);
list("✗ Правки движка на стороне сайта (запрещено — переносите в doccar)", drift);
list(lock ? "↻ Обновилось в движке" : "↻ Отличается от движка", changed);
list("+ Новые файлы движка", added);
list("− Убраны из движка (удалятся при --apply)", removed);
list(`? В зонах движка, но не из движка${PRUNE ? " (удалятся)" : " (удалить: --prune)"}`, orphans);
list("✗ Контракт бренда (docs/ENGINE.md)", problems);

if (!APPLY) {
  const behind = changed.length + added.length + removed.length;
  console.log(
    `\n${drift.length || problems.length || orphans.length ? "ЕСТЬ ПРОБЛЕМЫ" : behind ? "Движок можно обновить: --apply" : "Движок актуален, контракт соблюдён"}`,
  );
  process.exit(drift.length || problems.length || orphans.length ? 1 : 0);
}

/* ---------- применение ---------- */
if (drift.length && !FORCE) {
  console.error("\nОтказ: на сайте изменены файлы движка. Перенесите правки в doccar (или --force, если они не нужны).");
  process.exit(1);
}
if (orphans.length && !PRUNE) {
  console.error("\nОтказ: в зонах движка есть файлы не из движка — они будут конфликтовать (например lib/icons.ts рядом с lib/icons.tsx).");
  console.error("Проверьте список и запустите с --prune (файлы останутся в истории git сайта).");
  process.exit(1);
}
for (const p of [...removed, ...(PRUNE ? orphans : [])]) {
  const f = path.join(T, p);
  if (fs.existsSync(f)) fs.rmSync(f);
}
const files = {};
for (const [p, buf] of upstream) {
  const f = path.join(T, p);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buf);
  files[p] = sha(buf);
}
// Пустые каталоги после удаления — убрать.
for (const d of ENGINE_DIRS) {
  const prune = (abs) => {
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(abs, e.name));
    if (abs !== path.join(T, d) && fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
  };
  prune(path.join(T, d));
}
fs.writeFileSync(
  lockPath,
  JSON.stringify(
    { upstream: "github.com/wastedovi4/doccar-pro", commit, syncedAt: new Date().toISOString(), files },
    null,
    2,
  ) + "\n",
);
console.log(`\nГотово: ${Object.keys(files).length} файлов движка @ ${commit.slice(0, 7)}, ${LOCK} записан.`);
if (problems.length) console.log("Контракт бренда ещё не соблюдён — см. список выше; сборка до этого не пройдёт.");
