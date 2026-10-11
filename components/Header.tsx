"use client";

import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BOOKING_HREF } from "@/lib/site";
import type { Content } from "@/lib/content-model";

export function Header({
  nav,
  business,
}: {
  nav: { href: string; label: string }[];
  business: Content["business"];
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Пункты меню — из разделов (подпись задаётся в админке) + «Контакты».
  const items = nav;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Блокируем прокрутку body при открытом меню
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
        scrolled || open
          ? "border-white/[0.06] bg-night/90 backdrop-blur-md"
          : "border-transparent bg-night/0"
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <a href="#top" aria-label={`${business.name} — на главную`} className="shrink-0">
          <Logo tagline={`Автосервис ${business.city}`} />
        </a>

        {/* Десктоп-навигация */}
        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm font-medium text-frost/85 transition-colors hover:text-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-frost transition-colors hover:text-accent"
            >
              <Phone className="h-4 w-4 text-accent" aria-hidden />
              {business.phoneDisplay || business.phone}
            </a>
          )}
          <a href={BOOKING_HREF} className="btn-primary min-h-[42px] px-6 py-2.5">
            Записаться
          </a>
        </div>

        {/* Бургер (мобайл/планшет) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-frost lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Мобильное меню */}
      {open && (
        <div id="mobile-menu" className="h-[calc(100dvh-4rem)] border-t border-white/[0.06] bg-night lg:hidden">
          <nav aria-label="Мобильная навигация" className="container-x py-4">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-3.5 text-lg font-medium text-frost hover:bg-white/5 hover:text-accent"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="btn-ghost mt-4 w-full"
              >
                <Phone className="h-4 w-4" aria-hidden />
                {business.phoneDisplay || business.phone}
              </a>
            )}
            <a href={BOOKING_HREF} onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">
              Записаться на сервис
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
