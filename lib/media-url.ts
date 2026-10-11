/**
 * Чистые хелперы URL загруженных картинок (без Node API) — можно
 * импортировать в нормализации контента и в клиентском коде.
 */

/** Префикс публичного URL загруженного файла. */
export const MEDIA_PREFIX = "/api/media/";

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
