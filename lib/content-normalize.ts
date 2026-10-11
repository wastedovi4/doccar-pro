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
  RESERVED_ANCHORS,
  blockId,
  createBlock,
  type Block,
  type BlockType,
  type Content,
  type Tone,
} from "@/lib/content-model";
import { DEFAULT_BLOCKS, DEFAULT_CONTENT } from "@/config/content-defaults";
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
/** Список коротких строк: обрезка, без пустых. */
const strList = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, len))
        .filter(Boolean)
        .slice(0, max)
    : [];
const num = (v: unknown, fb: number, lim: number) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : fb;
};
const clampHour = (v: unknown, fb: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fb;
};
// Только https:// — домен идёт в canonical/OG/sitemap.
// Ссылка на мессенджер: только https:// (wa.me, t.me), иначе пусто.
const linkUrl = (v: unknown) => {
  const x = str(v).trim();
  try {
    return x && new URL(x).protocol === "https:" ? x : "";
  } catch {
    return "";
  }
};
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
  // старый формат lenkrad: пункты списком → по строке на пункт
  text: str(x.text) || (Array.isArray(x.points) ? x.points.map(String).join("\n").slice(0, MAX_TEXT) : ""),
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
    case "brands":
      return { title: str(b.title), text: str(b.text), items: strList(b.items, MAX_ITEMS, 60), note: str(b.note) };
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
      eyebrow: str(b.eyebrow).slice(0, 80),
      ...blockData(type, b),
    } as Block);
  }
  return out;
}

/**
 * Заготовка раздела для миграции: раздел с этим id из дефолтов бренда
 * (заголовки, подписи меню — тексты конкретного сайта) или пустой раздел типа.
 */
function template(id: string, type: BlockType): Dict {
  const d = DEFAULT_BLOCKS.find((b) => b.id === id && b.type === type);
  return d ? { ...d } : { ...createBlock(type), id, anchor: id };
}

/**
 * Формат lenkrad: фиксированные секции brands / services / why (advantages) /
 * process / about + флажки sections → разделы в том же порядке, видимость
 * сохраняется. Заголовки — из дефолтов бренда по id раздела.
 */
function lenkradLegacyBlocks(input: Dict): unknown[] | null {
  if (!("brands" in input || "advantages" in input || "process" in input)) return null;
  const sections = obj(input.sections);
  const about = obj(input.about);
  const pairs = (v: unknown, fb: unknown) =>
    Array.isArray(v) ? v.map((x) => ({ icon: "check", title: obj(x).title, text: obj(x).text })) : fb;
  const brands = template("brands", "brands");
  const services = template("services", "services");
  const why = template("why", "cards");
  const process = template("process", "cards");
  const aboutTpl = template("about", "text");
  return [
    { ...brands, visible: bool(sections.brands, true), items: Array.isArray(input.brands) ? input.brands : brands.items },
    {
      ...services,
      visible: bool(sections.services, true),
      items: Array.isArray(input.services) ? input.services : services.items,
    },
    { ...why, numbered: false, visible: bool(sections.why, true), items: pairs(input.advantages, why.items) },
    { ...process, numbered: true, visible: bool(sections.process, true), items: pairs(input.process, process.items) },
    {
      ...aboutTpl,
      visible: bool(sections.about, true),
      title: "title" in about ? about.title : aboutTpl.title,
      text: "text" in about ? about.text : aboutTpl.text,
      image: "",
    },
  ];
}

/** Контент старого формата doccar (фиксированные services/about/gallery + флажки sections) → разделы. */
function legacyBlocks(input: Dict): unknown[] | null {
  const lenkrad = lenkradLegacyBlocks(input);
  if (lenkrad) return lenkrad;
  const hasLegacy = "services" in input || "about" in input || "gallery" in input || "sections" in input;
  if (!hasLegacy) return null;
  const sections = obj(input.sections);
  const svc = template("services", "services");
  const about = template("about", "features");
  const gallery = template("gallery", "gallery");
  const about0 = obj(input.about);
  return [
    {
      ...svc,
      visible: bool(sections.services, true),
      items: Array.isArray(input.services) ? input.services : svc.items,
    },
    {
      ...about,
      visible: bool(sections.about, true),
      title: "title" in about0 ? about0.title : about.title,
      text: "text" in about0 ? about0.text : about.text,
      items: Array.isArray(about0.features) ? about0.features : about.items,
    },
    {
      ...gallery,
      visible: bool(sections.gallery, true),
      photos: Array.isArray(input.gallery) ? input.gallery : gallery.photos,
    },
  ];
}

/* ---------- контент целиком ---------- */

/** Адрес одной строкой (формат lenkrad «г. Москва, ул. …») → город и улица. Только если новых полей нет. */
function legacyAddress(b: Dict): { city: string; street: string } | null {
  if ("city" in b || "street" in b || typeof b.address !== "string" || !b.address.trim()) return null;
  const a = b.address.trim().slice(0, 200);
  const m = /^г\.?\s*([^,]+),\s*(.+)$/.exec(a);
  return m ? { city: m[1].trim(), street: m[2].trim() } : { city: "", street: a };
}

export function normalizeContent(raw: unknown): Content {
  const input = obj(raw);
  const d = DEFAULT_CONTENT;
  const b = obj(input.business);
  const geo = obj(b.geo);
  const h = obj(input.hero);
  const cta = obj(input.cta);
  const seo = obj(input.seo);
  const wh = obj(input.workHours);
  const addr = legacyAddress(b);

  const blocksInput = Array.isArray(input.blocks) ? input.blocks : (legacyBlocks(input) ?? d.blocks);

  return {
    business: {
      name: str(b.name, d.business.name),
      phone: str(b.phone, d.business.phone).replace(/[^\d+]/g, ""),
      phoneDisplay: str(b.phoneDisplay, d.business.phoneDisplay),
      email: str(b.email, d.business.email).trim(),
      whatsapp: linkUrl(b.whatsapp),
      telegram: linkUrl(b.telegram),
      city: str(b.city, addr?.city ?? d.business.city),
      region: str(b.region, addr ? "" : d.business.region),
      street: str(b.street, addr?.street ?? d.business.street),
      workingHours: str(b.workingHours, d.business.workingHours),
      openingHoursSpec: str(b.openingHoursSpec, d.business.openingHoursSpec),
      geo: { lat: num(geo.lat, d.business.geo.lat, 90), lng: num(geo.lng, d.business.geo.lng, 180) },
    },
    hero: {
      eyebrow: str(h.eyebrow, d.hero.eyebrow),
      title: str(h.title, d.hero.title),
      // Свой заголовок без второй строки (старый формат) — не дописываем строку из дефолтов.
      titleAccent: "titleAccent" in h ? str(h.titleAccent) : "title" in h ? "" : d.hero.titleAccent,
      subtitle: str(h.subtitle, d.hero.subtitle),
      image: "image" in h ? safeImageUrl(h.image) : d.hero.image,
      badges: "badges" in h ? strList(h.badges, 8, 40) : d.hero.badges,
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
