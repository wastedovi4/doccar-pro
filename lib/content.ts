import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CONTENT, type Content, type Geo } from "@/lib/content-model";

/**
 * Хранилище контента: data/content.json (пишется из админки) поверх
 * DEFAULT_CONTENT. Только сервер. Типы и дефолты — в lib/content-model.ts.
 */

export * from "@/lib/content-model";

const DATA_FILE = path.join(process.cwd(), "data", "content.json");

function validGeo(g: unknown): g is Geo {
  const x = g as Geo;
  return (
    !!x &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng) &&
    Math.abs(x.lat) <= 90 &&
    Math.abs(x.lng) <= 180
  );
}

/** Глубокий merge: значения из файла поверх дефолтов (для новых/отсутствующих полей). */
function merge(base: Content, override: Partial<Content>): Content {
  const b = override.business;
  return {
    business: {
      ...base.business,
      ...(b ?? {}),
      geo: validGeo(b?.geo) ? b!.geo : base.business.geo,
    },
    hero: { ...base.hero, ...(override.hero ?? {}) },
    services: override.services ?? base.services,
    about: {
      title: override.about?.title ?? base.about.title,
      text: override.about?.text ?? base.about.text,
      features: override.about?.features ?? base.about.features,
    },
    gallery: override.gallery ?? base.gallery,
    cta: { ...base.cta, ...(override.cta ?? {}) },
    seo: { ...base.seo, ...(override.seo ?? {}) },
    sections: { ...base.sections, ...(override.sections ?? {}) },
    workHours: {
      start: override.workHours?.start ?? base.workHours.start,
      end: override.workHours?.end ?? base.workHours.end,
      days:
        Array.isArray(override.workHours?.days) && override.workHours!.days.length === 7
          ? override.workHours!.days.map(Boolean)
          : base.workHours.days,
      enforce:
        typeof override.workHours?.enforce === "boolean"
          ? override.workHours!.enforce
          : base.workHours.enforce,
    },
  };
}

/** Читает контент (файл поверх дефолтов). Никогда не бросает — при ошибке отдаёт дефолты. */
export async function getContent(): Promise<Content> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Content>;
    return merge(DEFAULT_CONTENT, parsed);
  } catch {
    return DEFAULT_CONTENT;
  }
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
