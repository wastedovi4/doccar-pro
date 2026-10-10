import { resolveIcon } from "@/lib/icons";
import type { Content } from "@/lib/content-model";

/** Блок «По делу. Без лишних работ.» — подход сервиса + 4 преимущества. */
export function About({ about }: { about: Content["about"] }) {
  const n = about.features.length;
  // Разделитель под каждым рядом, кроме последнего (2 колонки на sm+, 1 на мобильном).
  const lastRowStart = n - (n % 2 === 0 ? 2 : 1);

  return (
    <section id="about" className="border-y border-white/[0.05] bg-coal">
      <div className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <span className="rule" aria-hidden />
          <h2 className="mt-7 whitespace-pre-line font-display text-[34px] font-extrabold leading-[1.12] text-white sm:text-[44px]">
            {about.title}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-frost/65">{about.text}</p>
        </div>

        {n > 0 && (
          <ul className="grid sm:grid-cols-2 sm:gap-x-10">
            {about.features.map((f, i) => {
              const Icon = resolveIcon(f.icon);
              const border =
                i === n - 1
                  ? "border-b-0"
                  : i >= lastRowStart
                    ? "border-b sm:border-b-0"
                    : "border-b";
              return (
                <li
                  key={`${f.icon}-${i}`}
                  className={`flex items-center gap-5 border-white/[0.07] py-6 ${border}`}
                >
                  <Icon className="h-10 w-10 shrink-0 text-accent [stroke-width:1.5]" aria-hidden />
                  <span className="max-w-[15rem] text-[15px] leading-snug text-frost/85">{f.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
