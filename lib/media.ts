import { promises as fs } from "fs";
import path from "path";

/** Загруженные фото хранятся в data/uploads (том Docker → переживают деплой). */
export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024; // 6 МБ

/** Префикс публичного URL загруженного файла. */
export const MEDIA_PREFIX = "/api/media/";

const EXT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Тип картинки по сигнатуре файла (не доверяем MIME от браузера). */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "png";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString("latin1"))) return "gif";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "webp";
  return null;
}

export function contentTypeForId(id: string): string {
  const ext = id.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPE[ext] ?? "application/octet-stream";
}

/** Безопасный id: только буквы/цифры/дефис + одно расширение. Защита от path traversal. */
export function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(id);
}

/** Встроенные картинки из public/images (стартовые заглушки). */
const BUILTIN_RE = /^\/images\/[a-z0-9-]+\.(jpg|jpeg|png|webp|gif|svg)$/;

/**
 * Нормализует URL картинки из контента: допускаются только встроенные
 * `/images/*` и загруженные `/api/media/<id>`. Всё прочее (внешние ссылки,
 * javascript:, обход путей) превращается в "" — «без фото».
 */
export function safeImageUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (BUILTIN_RE.test(s)) return s;
  if (s.startsWith(MEDIA_PREFIX) && isSafeId(s.slice(MEDIA_PREFIX.length))) return s;
  return "";
}

/** Файлы загрузок, которые не старше grace-периода, не трогаем (загрузили, но ещё не сохранили). */
const GC_GRACE_MS = 60 * 60 * 1000;

/**
 * Удаляет из data/uploads файлы, на которые больше не ссылается контент
 * (замена/удаление фото в админке). Свежие загрузки не трогаются.
 */
export async function collectUnusedUploads(referenced: string[]): Promise<number> {
  const keep = new Set(
    referenced.filter((u) => u.startsWith(MEDIA_PREFIX)).map((u) => u.slice(MEDIA_PREFIX.length))
  );
  let names: string[];
  try {
    names = await fs.readdir(UPLOADS_DIR);
  } catch {
    return 0;
  }
  const now = Date.now();
  let removed = 0;
  for (const name of names) {
    if (!isSafeId(name) || keep.has(name)) continue;
    const file = path.join(UPLOADS_DIR, name);
    try {
      const st = await fs.stat(file);
      if (now - st.mtimeMs < GC_GRACE_MS) continue;
      await fs.rm(file, { force: true });
      removed++;
    } catch {
      // гонка с параллельным удалением — не критично
    }
  }
  return removed;
}
