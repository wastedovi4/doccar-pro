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
 * Картинки хранятся как URL загруженных через админку файлов `/api/media/<id>`
 * (или встроенных `/images/*`). Пустая строка — без фото: вёрстка всех разделов
 * рассчитана и на этот случай.
 */

export type ServiceItem = {
  icon: string; // ключ иконки, см. lib/icons.tsx -> ICON_KEYS
  title: string;
  text: string;
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
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type Tone = "default" | "raised";

type BlockBase = {
  id: string; // стабильный id (ключ в списке)
  visible: boolean;
  anchor: string; // якорь в URL (#anchor), латиница/цифры/дефис
  menuLabel: string; // подпись в меню; "" — раздела нет в меню
  tone: Tone; // фон: обычный или выделенная полоса
};

export type ServicesBlock = BlockBase & { type: "services"; title: string; items: ServiceItem[] };
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

export type Block =
  | ServicesBlock
  | FeaturesBlock
  | GalleryBlock
  | TextBlock
  | CardsBlock
  | FaqBlock
  | PricesBlock
  | CtaBlock
  | ReviewsBlock;

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
  const base = { id, visible: false, anchor: `${type}-${id.slice(0, 4)}`, menuLabel: "", tone: BLOCK_META[type].tone };
  switch (type) {
    case "services":
      return { ...base, type, title: "", items: [{ icon: "wrench", title: "Новая услуга", text: "", image: "" }] };
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
  }
}

/* ---------- контент целиком ---------- */

export type Content = {
  business: {
    name: string;
    phone: string; // для tel:, напр. "+74951234567" ("" если нет)
    phoneDisplay: string; // как показывать
    email: string; // "" если нет
    city: string; // «Одинцово»
    region: string; // «Московская область»
    street: string; // «ул. Такая-то, 1» ("" пока не уточнён — показываем город)
    workingHours: string;
    openingHoursSpec: string; // schema.org, напр. "Mo-Sa 09:00-20:00"
    geo: Geo; // точка на карте и для маршрута
  };
  hero: {
    eyebrow: string;
    title: string; // первая строка (белая)
    titleAccent: string; // вторая строка (лайм)
    subtitle: string;
    image: string;
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

export const DEFAULT_BLOCKS: Block[] = [
  {
    id: "services",
    type: "services",
    visible: true,
    anchor: "services",
    menuLabel: "Услуги",
    tone: "default",
    title: "",
    items: [
      {
        icon: "monitor-pulse",
        title: "Диагностика",
        text: "Компьютерная диагностика, поиск неисправностей, проверка систем.",
        image: "",
      },
      {
        icon: "tools",
        title: "ТО и обслуживание",
        text: "Плановое ТО, замена масел и фильтров, техническое обслуживание.",
        image: "",
      },
      {
        icon: "gear",
        title: "Ремонт",
        text: "Текущий и сложный ремонт узлов и агрегатов.",
        image: "",
      },
    ],
  },
  {
    id: "about",
    type: "features",
    visible: true,
    anchor: "about",
    menuLabel: "О сервисе",
    tone: "raised",
    title: "По делу.\nБез лишних работ.",
    text: "Честная диагностика, понятные рекомендации и только те работы, которые действительно нужны вашему автомобилю.",
    items: [
      { icon: "badge", text: "Опытные мастера с реальным стажем" },
      { icon: "cpu", text: "Современное оборудование" },
      { icon: "price", text: "Прозрачные цены и согласование работ" },
      { icon: "pin", text: "Удобное расположение в Одинцово" },
    ],
  },
  {
    id: "gallery",
    type: "gallery",
    visible: true,
    anchor: "gallery",
    menuLabel: "",
    tone: "default",
    title: "",
    // Фото сервиса загружаются из админки; пустая лента на сайте не показывается.
    photos: [],
  },
];

export const DEFAULT_CONTENT: Content = {
  business: {
    name: "DOCCAR.PRO",
    phone: "",
    phoneDisplay: "",
    email: "",
    city: "Одинцово",
    region: "Московская область",
    street: "",
    workingHours: "",
    openingHoursSpec: "",
    // Центр Одинцово — уточнить точку сервиса в админке (вкладка «Контакты»).
    geo: { lat: 55.678, lng: 37.2775 },
  },
  hero: {
    eyebrow: "Автосервис в Одинцово",
    title: "Разберёмся",
    titleAccent: "с вашей машиной",
    subtitle: "Диагностика, обслуживание и ремонт автомобилей в Одинцово.",
    image: "",
  },
  blocks: DEFAULT_BLOCKS,
  cta: {
    title: "Остались вопросы?\nНапишите нам — поможем.",
    text: "Проконсультируем по услугам, подскажем по работам и запишем на удобное время.",
  },
  seo: {
    title: "DOCCAR.PRO — автосервис в Одинцово",
    description:
      "Диагностика, техническое обслуживание и ремонт автомобилей в Одинцово. Честная диагностика, понятные рекомендации и согласование работ.",
    url: "https://doccar.pro",
  },
  workHours: {
    start: 9,
    end: 20,
    days: [true, true, true, true, true, true, false], // Пн–Сб
    enforce: true,
  },
};

/** Якоря, занятые самой страницей. */
export const RESERVED_ANCHORS = ["top", "contacts", "booking", "contact-form"];

/** Полный адрес одной строкой: «ул. …, г. Одинцово, Московская область». */
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
