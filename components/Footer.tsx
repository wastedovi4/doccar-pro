import { MapPin, Phone, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { mapLinks } from "@/config/site";
import { fullAddress, type Content } from "@/lib/content-model";

export function Footer({
  business,
  nav,
}: {
  business: Content["business"];
  nav: { href: string; label: string }[];
}) {
  const items = nav;
  const maps = mapLinks(business.geo);

  return (
    <footer className="border-t border-white/[0.06] bg-night">
      <div className="container-x grid gap-10 py-14 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo tagline={`Автосервис ${business.city}`} size="lg" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-frost/55">
            Диагностика, обслуживание и ремонт автомобилей в {business.city}. Честная
            диагностика и только нужные работы.
          </p>
        </div>

        <nav aria-label="Навигация в футере">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-frost/40">Разделы</h3>
          <ul className="mt-4 space-y-2.5">
            {items.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm text-frost/75 transition-colors hover:text-accent">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-frost/40">Контакты</h3>
          <ul className="mt-4 space-y-3 text-sm text-frost/75">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <a href={maps.route} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                {fullAddress(business)}
              </a>
            </li>
            {business.phone && (
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <a href={`tel:${business.phone}`} className="hover:text-accent">
                  {business.phoneDisplay || business.phone}
                </a>
              </li>
            )}
            {business.workingHours && (
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{business.workingHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-6 text-xs text-frost/35">
          <span>
            © {business.name}, {new Date().getFullYear()}
          </span>
          <a href="/lk" className="hover:text-accent">
            Личный кабинет
          </a>
        </div>
      </div>
    </footer>
  );
}
