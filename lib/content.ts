import { promises as fs } from "fs";
import path from "path";
import type { Content } from "@/lib/content-model";
import { normalizeContent } from "@/lib/content-normalize";

/**
 * Хранилище контента: data/content.json (пишется из админки). Только сервер.
 * Типы и дефолты — lib/content-model.ts, проверка/миграция — lib/content-normalize.ts.
 */

export * from "@/lib/content-model";

const DATA_FILE = path.join(process.cwd(), "data", "content.json");

/** Читает контент (файл через нормализацию). Никогда не бросает — при ошибке отдаёт дефолты. */
export async function getContent(): Promise<Content> {
  let raw: unknown = {};
  try {
    raw = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    // нет файла или битый JSON — дефолты
  }
  return normalizeContent(raw);
}

/**
 * Сохраняет контент в data/content.json атомарно (tmp + rename),
 * чтобы обрыв записи не оставил полупустой файл.
 */
export async function saveContent(content: Content): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(content, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}
