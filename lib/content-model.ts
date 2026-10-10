/**
 * Модель контента сайта: типы, значения по умолчанию и чистые хелперы.
 * Без зависимостей от Node — модуль можно импортировать и в клиентских
 * компонентах (админка). Чтение/запись файла — в lib/content.ts.
 *
 * Картинки хранятся как URL: либо встроенные `/images/*.webp` (стартовые),
 * либо загруженные через админку `/api/media/<id>`. Пустая строка — без фото.
 */

export type ServiceItem = {
  icon: string; // ключ иконки, см. lib/icons.tsx -> ICON_KEYS
  title: string;
  text: string;
  image: string;
};

export type Feature = { icon: string; text: string };
export type Photo = { src: string; alt: string };
export type Geo = { lat: number; lng: number };

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
  services: ServiceItem[];
  about: {
    title: string; // переносы строк сохраняются
    text: string;
    features: Feature[];
  };
  gallery: Photo[];
  cta: {
    title: string; // переносы строк сохраняются
    text: string;
  };
  seo: {
    title: string;
    description: string;
    url: string;
  };
  // Показывать/скрывать блоки на сайте
  sections: {
    services: boolean;
    about: boolean;
    gallery: boolean;
  };
  // Рабочие часы для календаря записей
  workHours: {
    start: number; // час начала (0–23)
    end: number; // час конца (1–24)
    days: boolean[]; // 7 значений: Пн..Вс
    enforce: boolean; // предупреждать при записи вне рабочего времени
  };
};

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
    image: "/images/hero.webp",
  },
  services: [
    {
      icon: "monitor-pulse",
      title: "Диагностика",
      text: "Компьютерная диагностика, поиск неисправностей, проверка систем.",
      image: "/images/service-diagnostics.webp",
    },
    {
      icon: "tools",
      title: "ТО и обслуживание",
      text: "Плановое ТО, замена масел и фильтров, техническое обслуживание.",
      image: "/images/service-maintenance.webp",
    },
    {
      icon: "gear",
      title: "Ремонт",
      text: "Текущий и сложный ремонт узлов и агрегатов.",
      image: "/images/service-repair.webp",
    },
  ],
  about: {
    title: "По делу.\nБез лишних работ.",
    text: "Честная диагностика, понятные рекомендации и только те работы, которые действительно нужны вашему автомобилю.",
    features: [
      { icon: "badge", text: "Опытные мастера с реальным стажем" },
      { icon: "cpu", text: "Современное оборудование" },
      { icon: "price", text: "Прозрачные цены и согласование работ" },
      { icon: "pin", text: "Удобное расположение в Одинцово" },
    ],
  },
  gallery: [
    { src: "/images/gallery-1.webp", alt: "Автомобиль на подъёмнике в ремзоне" },
    { src: "/images/gallery-2.webp", alt: "Инструмент в ложементе" },
    { src: "/images/gallery-3.webp", alt: "Шиномонтаж и обслуживание колёс" },
  ],
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
  sections: {
    services: true,
    about: true,
    gallery: true,
  },
  workHours: {
    start: 9,
    end: 20,
    days: [true, true, true, true, true, true, false], // Пн–Сб
    enforce: true,
  },
};

/** Полный адрес одной строкой: «ул. …, г. Одинцово, Московская область». */
export function fullAddress(b: Content["business"]): string {
  return [b.street, b.city && `г. ${b.city}`, b.region].filter(Boolean).join(", ");
}

/** Все URL картинок, на которые ссылается контент (для сборки мусора загрузок). */
export function referencedImages(content: Content): string[] {
  return [
    content.hero.image,
    ...content.services.map((s) => s.image),
    ...content.gallery.map((p) => p.src),
  ].filter(Boolean);
}
