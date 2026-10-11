import Link from "next/link";
import { ArrowRight, CalendarCheck, Car, ChevronRight, Lightbulb, MapPin, Phone, ShieldAlert } from "lucide-react";
import { getClientSession } from "@/lib/client-access";
import { getLkDashboard } from "@/lib/lk";
import { getContent, fullAddress, serviceTitles } from "@/lib/content";
import { mapLinks } from "@/lib/site";
import { formatMileage, plateDisplay, rub, woNumber } from "@/lib/format";
import { REC_PRIORITY_LABEL, WO_STATUS_LABEL, type RecPriority } from "@/lib/crm-types";
import { LkHeader } from "@/components/lk/LkHeader";
import { LkBooking } from "@/components/lk/LkBooking";

export const dynamic = "force-dynamic";

const dateRu = (iso: string, time = false) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", ...(time ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }) });

const PRIORITY_CLS: Record<RecPriority, string> = {
  urgent: "bg-red-500/15 text-red-300 ring-red-400/30",
  soon: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  later: "bg-sky-400/15 text-sky-200 ring-sky-300/30",
};

function SectionTitle({ icon: Icon, children }: { icon: typeof Car; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-white">
      <Icon className="h-5 w-5 text-accent" aria-hidden /> {children}
    </h2>
  );
}

/** Личный кабинет клиента. Вход — по персональной ссылке от сервиса. */
export default async function LkPage({ searchParams }: { searchParams: { e?: string } }) {
  const content = await getContent();
  const { business } = content;
  const session = getClientSession();
  const data = session ? getLkDashboard(session.clientId) : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-night">
        <LkHeader city={business.city} signedIn={false} />
        <main className="container-x flex min-h-[70vh] items-center py-16">
          <div className="max-w-xl">
            <span className="rule" aria-hidden />
            <h1 className="mt-6 font-display text-4xl font-extrabold text-white">Личный кабинет</h1>
            {searchParams.e === "link" && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Ссылка недействительна или устарела — попросите новую у администратора.
              </p>
            )}
            <p className="mt-6 text-base leading-relaxed text-frost/70">
              Здесь — ваши автомобили, история обслуживания, отчёты мастера и рекомендации. Вход — по персональной
              ссылке, которую выдаёт администратор сервиса. Пароль не нужен.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="btn-primary px-7">
                  <Phone className="h-4 w-4" aria-hidden /> {business.phoneDisplay || business.phone}
                </a>
              )}
              <a href="/#booking" className="btn-ghost px-7">
                Записаться на сервис <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const firstName = data.client.name.split(/\s+/)[0];
  const vehicleOptions = data.vehicles.map((v) => ({
    id: v.id,
    label: [v.make, v.model, v.plate && plateDisplay(v.plate)].filter(Boolean).join(" ") || "Автомобиль",
  }));
  const maps = mapLinks(business.geo);

  return (
    <div className="min-h-screen bg-night pb-16">
      <LkHeader city={business.city} signedIn />
      <main className="container-x space-y-12 py-10">
        {/* Приветствие */}
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Личный кабинет</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Здравствуйте, {firstName}</h1>
            <p className="mt-2 text-sm text-frost/60">
              {data.client.phone}
              {data.client.email && ` · ${data.client.email}`}
            </p>
          </div>
          <button data-lk-book className="btn-primary px-7">
            <CalendarCheck className="h-4 w-4" aria-hidden /> Записаться на сервис
          </button>
        </section>

        {/* Рекомендации */}
        {data.recommendations.length > 0 && (
          <section>
            <SectionTitle icon={Lightbulb}>Рекомендации мастера</SectionTitle>
            <ul className="grid gap-4 md:grid-cols-2">
              {data.recommendations.map((r) => (
                <li key={r.id} className="panel flex flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${PRIORITY_CLS[r.priority]}`}>
                      {REC_PRIORITY_LABEL[r.priority]}
                    </span>
                    {r.vehicleLabel && <span className="text-xs text-frost/50">{r.vehicleLabel}</span>}
                  </div>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white">{r.text}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-frost/50">
                      {r.orderNumber ? `${woNumber(r.orderNumber)} · ` : ""}
                      {dateRu(r.createdAt)}
                      {r.estimate !== undefined && ` · ориентир ${rub(r.estimate)}`}
                    </span>
                    <button
                      data-lk-book
                      data-vehicle={r.vehicleId ?? ""}
                      data-message={`По рекомендации мастера: ${r.text}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                    >
                      Записаться <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Запланированные визиты */}
        {data.upcoming.length > 0 && (
          <section>
            <SectionTitle icon={CalendarCheck}>Вы записаны</SectionTitle>
            <ul className="space-y-3">
              {data.upcoming.map((v) => (
                <li key={v.id} className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <span className="font-semibold text-white">{dateRu(v.start, true)}</span>
                  <span className="text-sm text-frost/65">{[v.service, v.car].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Автомобили */}
        <section>
          <SectionTitle icon={Car}>Ваши автомобили</SectionTitle>
          {data.vehicles.length === 0 ? (
            <p className="text-sm text-frost/60">Автомобили появятся после первого визита в сервис.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.vehicles.map((v) => (
                <li key={v.id} className="panel p-5">
                  <div className="font-display text-lg font-bold text-white">
                    {[v.make, v.model].filter(Boolean).join(" ") || "Автомобиль"}
                    {v.year && <span className="ml-2 text-sm font-medium text-frost/50">{v.year}</span>}
                  </div>
                  {v.plate && (
                    <div className="mt-2 inline-flex rounded-md border border-frost/25 px-2 py-0.5 font-mono text-sm tracking-wider text-frost">
                      {plateDisplay(v.plate)}
                    </div>
                  )}
                  <dl className="mt-3 space-y-1 text-sm text-frost/60">
                    {v.mileage !== undefined && (
                      <div>
                        Пробег: <span className="text-frost/90">{formatMileage(v.mileage)}</span>
                      </div>
                    )}
                    {v.lastVisit && (
                      <div>
                        Последний визит: <span className="text-frost/90">{dateRu(v.lastVisit.date)}</span>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* История */}
        <section>
          <SectionTitle icon={ChevronRight}>История обслуживания</SectionTitle>
          {data.orders.length === 0 ? (
            <p className="text-sm text-frost/60">Пока пусто — здесь появятся заказ-наряды с отчётами мастера.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-coal">
              {data.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/lk/orders/${o.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-mono text-sm font-semibold text-white">{woNumber(o.number)}</span>
                        <span className="text-sm text-frost/60">{dateRu(o.openedAt)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-frost/75">
                        {[o.vehicleLabel, o.complaint].filter(Boolean).join(" — ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-semibold text-white">
                      {o.total !== undefined ? rub(o.total) : <span className="font-normal text-frost/60">{WO_STATUS_LABEL[o.status]}</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-frost/40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Контакты */}
        <section className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-frost/75">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>
              {business.name} · {fullAddress(business)}
              {business.workingHours && <span className="block text-frost/50">{business.workingHours}</span>}
            </span>
          </div>
          <div className="flex gap-3">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="btn-ghost min-h-[40px] px-4 py-2">
                <Phone className="h-4 w-4" aria-hidden /> Позвонить
              </a>
            )}
            <a href={maps.route} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-[40px] px-4 py-2">
              <MapPin className="h-4 w-4" aria-hidden /> Маршрут
            </a>
          </div>
        </section>
      </main>
      <LkBooking vehicles={vehicleOptions} services={serviceTitles(content)} />
    </div>
  );
}
