import { Phone, Navigation, CalendarCheck } from "lucide-react";
import { mapLinks, BOOKING_HREF } from "@/lib/site";
import type { Geo } from "@/lib/content-model";

/**
 * Липкая нижняя CTA-панель для мобильных: Позвонить / Маршрут / Записаться.
 * «Позвонить» появляется, только когда телефон задан в админке.
 */
export function MobileCTA({ phone, geo }: { phone: string; geo: Geo }) {
  const route = mapLinks(geo).route;
  const cell =
    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium text-frost active:bg-white/5";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-night/95 backdrop-blur-md lg:hidden">
      <div
        className={`grid ${phone ? "grid-cols-3" : "grid-cols-2"} divide-x divide-white/[0.08]`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {phone && (
          <a href={`tel:${phone}`} className={cell}>
            <Phone className="h-5 w-5 text-accent" aria-hidden />
            Позвонить
          </a>
        )}
        <a href={route} target="_blank" rel="noopener noreferrer" className={cell}>
          <Navigation className="h-5 w-5 text-accent" aria-hidden />
          Маршрут
        </a>
        <a
          href={BOOKING_HREF}
          className="flex flex-col items-center justify-center gap-0.5 bg-accent py-2.5 text-xs font-semibold text-on-accent active:bg-accent-hover"
        >
          <CalendarCheck className="h-5 w-5" aria-hidden />
          Записаться
        </a>
      </div>
    </div>
  );
}
