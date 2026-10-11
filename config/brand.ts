/**
 * Бренд сайта — всё, чем один сервис на этом движке отличается от другого в
 * коде движка (админка, бэкап, первый вход). Файл бренда: у каждого сайта свой,
 * движок читает только эти поля. См. docs/ENGINE.md.
 */
export const BRAND = {
  /** Латинский id: имя файла бэкапа, метка в архиве. */
  id: "doccar",
  /** Подпись CRM в мобильной шапке админки. */
  crmTitle: "DOCCAR · CRM",
  /** Первый вход, пока в .env не заданы ADMIN_LOGIN / ADMIN_PASSWORD. */
  defaultAdminLogin: "doccar",
  defaultAdminPassword: "doccar-admin",
  /** Подсказки в полях админки. */
  placeholders: {
    siteUrl: "https://doccar.pro",
    email: "info@doccar.pro",
    street: "ул. Такая-то, 1",
    geo: "55.678, 37.2775",
  },
} as const;
