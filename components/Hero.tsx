/* eslint-disable @next/next/no-img-element */
import { ArrowRight, MapPin } from "lucide-react";
import { BOOKING_HREF } from "@/config/site";
import { LogoMark } from "@/components/Logo";
import type { Content } from "@/lib/content-model";

/** Фон главного экрана без фото: мотив логотипа — линия пульса, сетка, свечение. */
function BrandBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(232,236,239,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(232,236,239,0.045) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 70% at 70% 45%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 70% 45%, #000 30%, transparent 100%)",
        }}
      />
      <div className="absolute -right-32 top-1/3 h-[560px] w-[760px] rounded-full bg-lime/[0.09] blur-[140px]" />
      <LogoMark className="absolute right-[-4%] top-1/2 hidden h-[86%] w-auto -translate-y-1/2 opacity-[0.07] lg:block" />
      {/* Линия пульса: на десктопе — правее текста, на узких экранах — под кнопками */}
      <svg
        viewBox="0 0 1200 240"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[90%] h-24 w-full -translate-y-1/2 lg:top-[66%] lg:h-56"
      >
        <defs>
          <linearGradient id="pulse-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#C6F34A" stopOpacity="0" />
            <stop offset="0.6" stopColor="#C6F34A" stopOpacity="0" />
            <stop offset="0.75" stopColor="#C6F34A" stopOpacity="0.55" />
            <stop offset="1" stopColor="#C6F34A" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <polyline
          points="0,140 860,140 900,138 940,40 985,205 1025,110 1055,140 1200,140"
          fill="none"
          stroke="url(#pulse-fade)"
          strokeWidth="3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function Hero({ hero }: { hero: Content["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden bg-night pt-16 lg:pt-[72px]">
      {hero.image ? (
        // Фото ремзоны: справа на десктопе, фоном на мобильном. Слева уходит в фон.
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
      ) : (
        <BrandBackdrop />
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
