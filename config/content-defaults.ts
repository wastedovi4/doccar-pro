/**
 * Контент по умолчанию — файл БРЕНДА (у каждого сайта на движке свой).
 * Что видит новый сайт без data/content.json и откуда миграция старого формата
 * берёт заголовки разделов (по id раздела). Модель — lib/content-model.ts.
 */
import type { Block, Content } from "@/lib/content-model";

export const DEFAULT_BLOCKS: Block[] = [
  {
    id: "services",
    type: "services",
    visible: true,
    anchor: "services",
    menuLabel: "Услуги",
    tone: "default",
    eyebrow: "",
    title: "",
    text: "",
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
    eyebrow: "",
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
    eyebrow: "",
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
    whatsapp: "",
    telegram: "",
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
    badges: [],
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
