/**
 * Модель контента сайта: типы, значения по умолчанию и чистые хелперы.
 * Без зависимостей от Node — модуль можно импортировать и в клиентских
 * компонентах (админка). Нормализация входа — lib/content-normalize.ts,
 * чтение/запись файла — lib/content.ts.
 *
 * Страница = главный экран (фикс.) → список разделов `blocks` → финальный блок
 * с контактами и картой (фикс.). Разделы владелец добавляет, переставляет,
 * скрывает и удаляет сам; тип раздела задаёт вёрстку, данные — его поля.
 *
 * Значения по умолчанию (тексты конкретного сервиса) — в config/content-defaults.ts:
 * это файл бренда, модель от него не зависит.
 *
 * Картинки хранятся как URL загруженных через админку файлов `/api/media/<id>`
 * (или встроенных `/images/*`). Пустая строка — без фото: вёрстка всех разделов
 * рассчитана и на этот случай.
 */

export type ServiceItem = {
  icon: string; // ключ иконки, см. lib/icons.tsx -> ICON_KEYS
  title: string;
  text: string; // переносы строк сохраняются (бренд может показать их списком)
  image: string;
};

export type Feature = { icon: string; text: string };
export type Photo = { src: string; alt: string };
export type CardItem = { icon: string; title: string; text: string };
export type FaqItem = { q: string; a: string };
export type PriceItem = { name: string; price: string; note: string };
export type ReviewItem = { name: string; meta: string; text: string };
export type Geo = { lat: number; lng: number };

/* ---------- разделы (блоки) ---------- */

export const BLOCK_TYPES = [
  "services",
  "features",
  "gallery",
  "text",
  "cards",
  "faq",
  "prices",
  "cta",
  "reviews",
  "brands",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type Tone = "default" | "raised";

type BlockBase = {
  id: string; // стабильный id (ключ в списке)
  visible: boolean;
  anchor: string; // якорь в URL (#anchor), латиница/цифры/дефис
  menuLabel: string; // подпись в меню; "" — раздела нет в меню
  tone: Tone; // фон: обычный или выделенная полоса
  eyebrow: string; // надзаголовок над заголовком раздела; "" — нет
};

export type ServicesBlock = BlockBase & { type: "services"; title: string; text: string; items: ServiceItem[] };
export type FeaturesBlock = BlockBase & {
  type: "features";
  title: string; // переносы строк сохраняются
  text: string;
  items: Feature[];
};
export type GalleryBlock = BlockBase & { type: "gallery"; title: string; photos: Photo[] };
export type TextBlock = BlockBase & {
  type: "text";
  title: string;
  text: string; // абзацы через пустую строку
  image: string;
  imageSide: "left" | "right";
};
export type CardsBlock = BlockBase & {
  type: "cards";
  title: string;
  text: string;
  numbered: boolean; // 01, 02… вместо иконок (шаги процесса)
  items: CardItem[];
};
export type FaqBlock = BlockBase & { type: "faq"; title: string; items: FaqItem[] };
export type PricesBlock = BlockBase & {
  type: "prices";
  title: string;
  text: string; // примечание под таблицей
  items: PriceItem[];
};
export type CtaBlock = BlockBase & { type: "cta"; title: string; text: string; button: string };
export type ReviewsBlock = BlockBase & { type: "reviews"; title: string; items: ReviewItem[] };
export type BrandsBlock = BlockBase & {
  type: "brands";
  title: string;
  text: string;
  items: string[]; // названия марок
  note: string; // сноска под списком; "" — нет
};

export type Block =
  | ServicesBlock
  | FeaturesBlock
  | GalleryBlock
  | TextBlock
  | CardsBlock
  | FaqBlock
  | PricesBlock
  | CtaBlock
  | ReviewsBlock
  | BrandsBlock;

export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

/** Каталог типов: подписи и описания для админки, фон по умолчанию. */
export const BLOCK_META: Record<BlockType, { label: string; description: string; tone: Tone }> = {
  services: {
    label: "Услуги с фото",
    description: "Карточки: фото, иконка, название, описание и стрелка «записаться на эту услугу».",
    tone: "default",
  },
  features: {
    label: "Преимущества",
    description: "Заголовок и текст слева, список коротких пунктов с иконками справа.",
    tone: "raised",
  },
  gallery: {
    label: "Фото",
    description: "Лента фотографий по три в ряд, на телефоне — прокрутка.",
    tone: "default",
  },
  text: {
    label: "Текст с фото",
    description: "Заголовок и абзацы текста, фото слева или справа.",
    tone: "default",
  },
  cards: {
    label: "Карточки",
    description: "Сетка карточек: иконка или номер шага, заголовок, текст. Подходит для «Как мы работаем».",
    tone: "default",
  },
  faq: {
    label: "Вопросы и ответы",
    description: "Раскрывающийся список FAQ. Попадает в разметку для поисковиков.",
    tone: "default",
  },
  prices: {
    label: "Цены",
    description: "Прайс: название работы, цена и короткое примечание.",
    tone: "raised",
  },
  cta: {
    label: "Призыв к записи",
    description: "Яркий баннер с заголовком, текстом и кнопкой записи.",
    tone: "default",
  },
  reviews: {
    label: "Отзывы",
    description: "Карточки отзывов клиентов: текст, имя, автомобиль.",
    tone: "raised",
  },
  brands: {
    label: "Марки",
    description: "Марки автомобилей, которые обслуживает сервис: плитки с названиями и сноска.",
    tone: "default",
  },
};

/** Короткий id: 8 символов base36. */
export function blockId(): string {
  const rnd =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36)).join("")
      : Math.random().toString(36).slice(2);
  return rnd.replace(/[^a-z0-9]/g, "").slice(0, 8).padEnd(8, "0");
}

/** Новый раздел с шаблонным содержимым. Создаётся скрытым — включается после заполнения. */
export function createBlock(type: BlockType): Block {
  const id = blockId();
  const base = { id, visible: false, anchor: `${type}-${id.slice(0, 4)}`, menuLabel: "", tone: BLOCK_META[type].tone, eyebrow: "" };
  switch (type) {
    case "services":
      return { ...base, type, title: "", text: "", items: [{ icon: "wrench", title: "Новая услуга", text: "", image: "" }] };
    case "features":
      return { ...base, type, title: "Заголовок раздела", text: "", items: [{ icon: "badge", text: "Преимущество" }] };
    case "gallery":
      return { ...base, type, title: "", photos: [] };
    case "text":
      return { ...base, type, title: "Заголовок раздела", text: "Текст раздела.", image: "", imageSide: "right" };
    case "cards":
      return {
        ...base,
        type,
        title: "Как мы работаем",
        text: "",
        numbered: true,
        items: [
          { icon: "check", title: "Заявка", text: "Звоните или оставляете заявку на сайте." },
          { icon: "scan", title: "Диагностика", text: "Находим причину и согласуем работы." },
          { icon: "wrench", title: "Ремонт", text: "Делаем только согласованное." },
        ],
      };
    case "faq":
      return { ...base, type, title: "Частые вопросы", items: [{ q: "Вопрос?", a: "Ответ." }] };
    case "prices":
      return {
        ...base,
        type,
        title: "Цены",
        text: "Окончательная стоимость — после диагностики.",
        items: [{ name: "Компьютерная диагностика", price: "от 1 500 ₽", note: "" }],
      };
    case "cta":
      return {
        ...base,
        type,
        title: "Запишитесь на диагностику",
        text: "Найдём причину и согласуем работы до начала ремонта.",
        button: "Записаться на сервис",
      };
    case "reviews":
      return { ...base, type, title: "Отзывы клиентов", items: [{ name: "Имя", meta: "Автомобиль", text: "Текст отзыва." }] };
    case "brands":
      return {
        ...base,
        type,
        title: "Обслуживаем марки",
        text: "",
        items: ["BMW", "Mercedes-Benz", "Audi", "Volkswagen"],
        note: "Названия марок указаны только для обозначения специализации сервиса.",
      };
  }
}

/* ---------- контент целиком ---------- */

export type Content = {
  business: {
    name: string;
    phone: string; // для tel:, напр. "+74951234567" ("" если нет)
    phoneDisplay: string; // как показывать
    email: string; // "" если нет
    whatsapp: string; // ссылка https://wa.me/…; "" если нет
    telegram: string; // ссылка https://t.me/…; "" если нет
    city: string; // «Москва»
    region: string; // «Московская область»
    street: string; // «ул. Такая-то, 1» ("" пока не уточнён — показываем город)
    workingHours: string;
    openingHoursSpec: string; // schema.org, напр. "Mo-Sa 09:00-20:00"
    geo: Geo; // точка на карте и для маршрута
  };
  hero: {
    eyebrow: string;
    title: string; // первая строка
    titleAccent: string; // вторая строка (акцентный цвет); "" — нет
    subtitle: string;
    image: string;
    badges: string[]; // короткие плашки под заголовком; [] — нет
  };
  blocks: Block[];
  cta: {
    title: string; // переносы строк сохраняются
    text: string;
  };
  seo: {
    title: string;
    description: string;
    url: string;
  };
  // Рабочие часы для календаря записей
  workHours: {
    start: number; // час начала (0–23)
    end: number; // час конца (1–24)
    days: boolean[]; // 7 значений: Пн..Вс
    enforce: boolean; // предупреждать при записи вне рабочего времени
  };
};

/** Якоря, занятые самой страницей. */
export const RESERVED_ANCHORS = ["top", "contacts", "booking", "contact-form"];

/** Полный адрес одной строкой: «ул. …, г. Город, Область». */
export function fullAddress(b: Content["business"]): string {
  return [b.street, b.city && `г. ${b.city}`, b.region].filter(Boolean).join(", ");
}

/** Пункты меню: видимые разделы с подписью (в порядке страницы) + «Контакты». */
export function navItems(content: Content): { href: string; label: string }[] {
  return [
    ...content.blocks
      .filter((b) => b.visible && b.menuLabel.trim())
      .map((b) => ({ href: `#${b.anchor}`, label: b.menuLabel.trim() })),
    { href: "#contacts", label: "Контакты" },
  ];
}

/** Названия услуг из видимых разделов «Услуги» — для выпадающего списка формы записи. */
export function serviceTitles(content: Content): string[] {
  const titles = content.blocks
    .filter((b): b is ServicesBlock => b.type === "services" && b.visible)
    .flatMap((b) => b.items.map((i) => i.title.trim()))
    .filter(Boolean);
  return Array.from(new Set(titles));
}
