/* eslint-disable @next/next/no-img-element */
import { ArrowRight, MapPin } from "lucide-react";
import { BOOKING_HREF } from "@/config/site";
import type { Content } from "@/lib/content-model";

export function Hero({ hero }: { hero: Content["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden bg-night pt-16 lg:pt-[72px]">
      {/* Фото ремзоны: справа на десктопе, фоном на мобильном. Слева уходит в фон. */}
      {hero.image && (
        <div aria-hidden className="absolute inset-0 -z-10 lg:left-[22%]">
          <img
            src={hero.image}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[68%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/75 to-night/5 lg:via-night/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-night/50" />
        </div>
      )}

      <div className="container-x flex min-h-[540px] items-center py-20 sm:min-h-[600px] lg:min-h-[640px] lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow animate-fade-up">{hero.eyebrow}</p>

          <h1 className="animate-fade-up mt-5 font-display text-[40px] font-extrabold leading-[1.06] tracking-[-0.01em] sm:text-6xl lg:text-[68px]">
            <span className="block text-white">{hero.title}</span>
            {hero.titleAccent && <span className="block text-accent">{hero.titleAccent}</span>}
          </h1>

          <p className="animate-fade-up mt-6 max-w-md text-base leading-relaxed text-frost/80 sm:text-lg">
            {hero.subtitle}
          </p>

          <div className="animate-fade-up mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={BOOKING_HREF} className="btn-primary px-7">
              Записаться на сервис
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a href="#contacts" className="btn-ghost px-7">
              <MapPin className="h-4 w-4" aria-hidden />
              Как добраться
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
