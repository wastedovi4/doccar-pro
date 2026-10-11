/**
 * Нормализация контента: любой вход (файл data/content.json, тело PUT из
 * админки, контент старого формата) → валидный Content. Отсутствующее и
 * невалидное заменяется значениями по умолчанию. Единственная точка проверки:
 * через неё проходят и чтение файла, и сохранение из админки.
 *
 * Чистый модуль (без Node API).
 */
import {
  BLOCK_META,
  BLOCK_TYPES,
  DEFAULT_BLOCKS,
  DEFAULT_CONTENT,
  RESERVED_ANCHORS,
  blockId,
  type Block,
  type BlockType,
  type Content,
  type Tone,
} from "@/lib/content-model";
import { ICONS } from "@/lib/icons";
import { MEDIA_PREFIX, safeImageUrl } from "@/lib/media-url";

/* ---------- примитивы ---------- */

const MAX_TEXT = 5000;
const MAX_BLOCKS = 40;
const MAX_ITEMS = 60;

type Dict = Record<string, unknown>;
const obj = (v: unknown): Dict => (v && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {});
const str = (v: unknown, fb = "") => (typeof v === "string" ? v.slice(0, MAX_TEXT) : fb);
const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
const icon = (v: unknown, fb: string) => (typeof v === "string" && v in ICONS ? v : fb);
const list = <T>(v: unknown, map: (x: Dict) => T): T[] =>
  Array.isArray(v) ? v.slice(0, MAX_ITEMS).map((x) => map(obj(x))) : [];
const num = (v: unknown, fb: number, lim: number) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : fb;
};
const clampHour = (v: unknown, fb: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fb;
};
// Только https:// — домен идёт в canonical/OG/sitemap.
const httpsUrl = (v: unknown, fb: string) => {
  const x = str(v, fb).trim().replace(/\/+$/, "");
  try {
    return new URL(x).protocol === "https:" ? x : fb;
  } catch {
    return fb;
  }
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const slug = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

/* ---------- разделы ---------- */

const services = (x: Dict) => ({
  icon: icon(x.icon, "wrench"),
  title: str(x.title),
  // старый формат lenkrad: пункты списком
  text: str(x.text) || (Array.isArray(x.points) ? x.points.map(String).join(", ").slice(0, MAX_TEXT) : ""),
  image: safeImageUrl(x.image),
});
const photo = (x: Dict) => ({ src: safeImageUrl(x.src), alt: str(x.alt) });

/** Поля конкретного типа (без общих полей раздела). */
function blockData(type: BlockType, b: Dict) {
  switch (type) {
    case "services":
      return { title: str(b.title), items: list(b.items, services) };
    case "features":
      return {
        title: str(b.title),
        text: str(b.text),
        items: list(b.items, (x) => ({ icon: icon(x.icon, "badge"), text: str(x.text) })),
      };
    case "gallery":
      return { title: str(b.title), photos: list(b.photos, photo).filter((p) => p.src) };
    case "text":
      return {
        title: str(b.title),
        text: str(b.text),
        image: safeImageUrl(b.image),
        imageSide: b.imageSide === "left" ? ("left" as const) : ("right" as const),
      };
    case "cards":
      return {
        title: str(b.title),
        text: str(b.text),
        numbered: bool(b.numbered, false),
        items: list(b.items, (x) => ({ icon: icon(x.icon, "check"), title: str(x.title), text: str(x.text) })),
      };
    case "faq":
      return { title: str(b.title), items: list(b.items, (x) => ({ q: str(x.q), a: str(x.a) })) };
    case "prices":
      return {
        title: str(b.title),
        text: str(b.text),
        items: list(b.items, (x) => ({ name: str(x.name), price: str(x.price), note: str(x.note) })),
      };
    case "cta":
      return { title: str(b.title), text: str(b.text), button: str(b.button) || "Записаться на сервис" };
    case "reviews":
      return {
        title: str(b.title),
        items: list(b.items, (x) => ({ name: str(x.name), meta: str(x.meta), text: str(x.text) })),
      };
  }
}

function normalizeBlocks(input: unknown[]): Block[] {
  const ids = new Set<string>();
  const anchors = new Set<string>(RESERVED_ANCHORS);
  const out: Block[] = [];

  for (const raw of input.slice(0, MAX_BLOCKS)) {
    const b = obj(raw);
    const type = b.type as BlockType;
    if (!BLOCK_TYPES.includes(type)) continue; // неизвестный тип — отбрасываем

    let id = slug(b.id);
    if (!SLUG_RE.test(id) || ids.has(id)) id = blockId();
    ids.add(id);

    // Якорь: валидный и уникальный; конфликт — добавляем суффикс.
    let anchor = slug(b.anchor);
    if (!SLUG_RE.test(anchor)) anchor = `${type}-${id.slice(0, 4)}`;
    for (let n = 2, baseAnchor = anchor; anchors.has(anchor); n++) anchor = `${baseAnchor}-${n}`;
    anchors.add(anchor);

    const tone: Tone = b.tone === "raised" || b.tone === "default" ? b.tone : BLOCK_META[type].tone;

    out.push({
      id,
      type,
      visible: bool(b.visible, true),
      anchor,
      menuLabel: str(b.menuLabel).slice(0, 40),
      tone,
      ...blockData(type, b),
    } as Block);
  }
  return out;
}

/** Контент старого формата (фиксированные services/about/gallery + флажки sections) → разделы. */
function legacyBlocks(input: Dict): unknown[] | null {
  const hasLegacy = "services" in input || "about" in input || "gallery" in input || "sections" in input;
  if (!hasLegacy) return null;
  const sections = obj(input.sections);
  const [svc, about, gallery] = DEFAULT_BLOCKS;
  const about0 = obj(input.about);
  return [
    {
      ...svc,
      visible: bool(sections.services, true),
      items: Array.isArray(input.services) ? input.services : (svc as Dict).items,
    },
    {
      ...about,
      visible: bool(sections.about, true),
      title: "title" in about0 ? about0.title : (about as Dict).title,
      text: "text" in about0 ? about0.text : (about as Dict).text,
      items: Array.isArray(about0.features) ? about0.features : (about as Dict).items,
    },
    {
      ...gallery,
      visible: bool(sections.gallery, true),
      photos: Array.isArray(input.gallery) ? input.gallery : (gallery as Dict).photos,
    },
  ];
}

/* ---------- контент целиком ---------- */

export function normalizeContent(raw: unknown): Content {
  const input = obj(raw);
  const d = DEFAULT_CONTENT;
  const b = obj(input.business);
  const geo = obj(b.geo);
  const h = obj(input.hero);
  const cta = obj(input.cta);
  const seo = obj(input.seo);
  const wh = obj(input.workHours);

  const blocksInput = Array.isArray(input.blocks) ? input.blocks : (legacyBlocks(input) ?? d.blocks);

  return {
    business: {
      name: str(b.name, d.business.name),
      phone: str(b.phone, d.business.phone).replace(/[^\d+]/g, ""),
      phoneDisplay: str(b.phoneDisplay, d.business.phoneDisplay),
      email: str(b.email, d.business.email).trim(),
      city: str(b.city, d.business.city),
      region: str(b.region, d.business.region),
      street: str(b.street, d.business.street),
      workingHours: str(b.workingHours, d.business.workingHours),
      openingHoursSpec: str(b.openingHoursSpec, d.business.openingHoursSpec),
      geo: { lat: num(geo.lat, d.business.geo.lat, 90), lng: num(geo.lng, d.business.geo.lng, 180) },
    },
    hero: {
      eyebrow: str(h.eyebrow, d.hero.eyebrow),
      title: str(h.title, d.hero.title),
      titleAccent: str(h.titleAccent, d.hero.titleAccent),
      subtitle: str(h.subtitle, d.hero.subtitle),
      image: "image" in h ? safeImageUrl(h.image) : d.hero.image,
    },
    blocks: normalizeBlocks(blocksInput),
    cta: { title: str(cta.title, d.cta.title), text: str(cta.text, d.cta.text) },
    seo: {
      title: str(seo.title, d.seo.title),
      description: str(seo.description, d.seo.description),
      url: httpsUrl(seo.url, d.seo.url),
    },
    workHours: {
      start: clampHour(wh.start, d.workHours.start, 0, 23),
      end: clampHour(wh.end, d.workHours.end, 1, 24),
      days: Array.isArray(wh.days) && wh.days.length === 7 ? wh.days.map(Boolean) : d.workHours.days,
      enforce: bool(wh.enforce, d.workHours.enforce),
    },
  };
}

/**
 * Все загруженные файлы, на которые ссылается контент (для уборки загрузок).
 * Обход всего дерева, а не списка полей — новый тип раздела с картинками
 * не сможет «потерять» свои файлы.
 */
export function referencedMedia(content: Content): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v.startsWith(MEDIA_PREFIX)) out.push(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(content);
  return out;
}
