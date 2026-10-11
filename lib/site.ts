/**
 * Ссылки на карты по координатам и якорь окна записи — общие для движка и бренда.
 * Меню строится из разделов контента (navItems в lib/content-model.ts).
 * Координаты сервиса — в контенте (админка → «Контакты»), сюда приходят аргументом.
 *
 * Редактируемый контент (контакты, услуги, тексты, SEO) — в lib/content-model.ts.
 */
import type { Geo } from "@/lib/content-model";

export function mapLinks({ lat, lng }: Geo) {
  // Окно карты вокруг точки: точка — ровно в центре (на неё ставится наш маркер).
  const dLng = 0.045;
  const dLat = 0.02;
  return {
    // Встроенная OpenStreetMap-карта (без ключей и внешних SDK), без родного маркера.
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${lng - dLng}%2C${
      lat - dLat
    }%2C${lng + dLng}%2C${lat + dLat}&layer=mapnik`,
    // Маршрут в Яндекс.Картах от «Моего местоположения» (пустая точка отправления «~»)
    route: `https://yandex.ru/maps/?rtext=~${lat}%2C${lng}&rtt=auto`,
  };
}

/** Якорь, который открывает окно записи (окно записи — компонент бренда, контракт см. docs/ENGINE.md). */
export const BOOKING_HREF = "#booking";
