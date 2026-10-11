import { ArrowRight, MapPin, Phone, Clock, Mail, Navigation, MessageCircle, Send } from "lucide-react";
import { mapLinks, BOOKING_HREF } from "@/lib/site";
import { fullAddress, type Content } from "@/lib/content-model";

/** Финальный CTA: «Остались вопросы?» + контакты + тёмная карта с маркером. */
export function Contacts({
  cta,
  business,
}: {
  cta: Content["cta"];
  business: Content["business"];
}) {
  const maps = mapLinks(business.geo);
  const address = fullAddress(business);

  const details = [
    business.phone && {
      icon: Phone,
      label: "Телефон",
      value: business.phoneDisplay || business.phone,
      href: `tel:${business.phone}`,
    },
    business.workingHours && { icon: Clock, label: "График", value: business.workingHours },
    { icon: MapPin, label: "Адрес", value: address },
    business.email && {
      icon: Mail,
      label: "Почта",
      value: business.email,
      href: `mailto:${business.email}`,
    },
    business.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: "Написать в WhatsApp", href: business.whatsapp },
    business.telegram && { icon: Send, label: "Telegram", value: "Написать в Telegram", href: business.telegram },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <section id="contacts" className="py-16 sm:py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <div>
          <h2 className="whitespace-pre-line font-display text-[28px] font-extrabold leading-[1.2] text-white sm:text-4xl">
            {cta.title}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-frost/65">{cta.text}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={BOOKING_HREF} className="btn-primary px-7">
              Записаться на сервис
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a href={maps.route} target="_blank" rel="noopener noreferrer" className="btn-ghost px-7">
              <MapPin className="h-4 w-4" aria-hidden />
              Как добраться
            </a>
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-white/[0.07] pt-8 sm:grid-cols-2">
            {details.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="flex gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.12em] text-frost/45">{d.label}</dt>
                    <dd className="mt-1 text-sm text-frost/90">
                      {d.href ? (
                        <a
                          href={d.href}
                          {...(d.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="transition-colors hover:text-accent"
                        >
                          {d.value}
                        </a>
                      ) : (
                        d.value
                      )}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Карта — картинка-ссылка на маршрут: OSM в тёмной гамме + наш маркер в центре */}
        <a
          href={maps.route}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Построить маршрут: ${address}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.08] bg-coal sm:aspect-[16/10]"
        >
          <iframe
            title={`Карта — ${business.name}`}
            src={maps.embed}
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            referrerPolicy="no-referrer-when-downgrade"
            // Карта шире рамки на 64px с каждой стороны: центр тот же, а кнопки
            // зума и подпись OSM уходят за обрез (подпись даём свою, ниже).
            className="pointer-events-none absolute left-[-64px] top-[-64px] h-[calc(100%+128px)] w-[calc(100%+128px)] border-0 [filter:invert(1)_hue-rotate(180deg)_grayscale(0.55)_brightness(0.82)_contrast(0.92)]"
          />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(16,19,24,0.55)_100%)]" />

          {/* Маркер: остриё ровно в центре карты (точка сервиса = центр окна карты) */}
          <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <svg viewBox="0 0 24 32" className="h-9 w-7 drop-shadow-[0_4px_12px_rgba(198,243,74,0.35)]">
              <path
                d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0Z"
                fill="#C6F34A"
              />
              <circle cx="12" cy="12" r="4.4" fill="#101318" />
            </svg>
            <span className="absolute left-full top-1.5 ml-2 whitespace-nowrap rounded-md bg-night/70 px-2 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              {business.name}
            </span>
          </div>

          <span className="absolute left-3 top-2 text-[10px] text-frost/40">
            © участники OpenStreetMap
          </span>

          <div className="absolute bottom-4 right-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-white/[0.08] bg-night/85 px-4 py-3 backdrop-blur-md transition-colors group-hover:border-accent/40">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-frost/25 text-frost group-hover:border-accent group-hover:text-accent">
              <Navigation className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">
                {business.street || business.city}
              </span>
              <span className="block truncate text-xs text-frost/55">
                {business.street ? `${business.city}, ${business.region}` : business.region}
              </span>
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
