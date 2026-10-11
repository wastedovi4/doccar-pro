/* eslint-disable @next/next/no-img-element */
import { ArrowRight } from "lucide-react";
import { resolveIcon } from "@/lib/icons";
import { BOOKING_HREF } from "@/lib/site";
import type { ServicesBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

export function ServicesBlock({ block }: { block: Data }) {
  return (
    <BlockShell anchor={block.anchor} tone={block.tone} label={block.title ? undefined : "Услуги"}>
      <BlockHeading eyebrow={block.eyebrow} title={block.title} text={block.text} className="mb-10" />
      <div className="grid gap-5 md:grid-cols-3">
        {block.items.map((service, i) => {
          const Icon = resolveIcon(service.icon);
          return (
            <article
              key={`${service.title}-${i}`}
              className="panel group relative flex flex-col overflow-hidden transition-colors duration-200 hover:border-accent/30"
            >
              {service.image && (
                <div className="relative aspect-[2/1] overflow-hidden bg-steel/40">
                  <img
                    src={service.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-coal/70 via-transparent to-transparent" />
                  {/* «Язычок» панели, заходящий на фото, + вогнутое скругление справа */}
                  <div aria-hidden className="absolute bottom-0 left-0 h-5 w-[44%] rounded-tr-[18px] bg-coal" />
                  <div
                    aria-hidden
                    className="absolute bottom-0 left-[44%] h-[18px] w-[18px]"
                    style={{ background: "radial-gradient(circle at 100% 0, transparent 17.5px, #16191F 18px)" }}
                  />
                </div>
              )}

              <div className={`flex flex-1 flex-col px-6 pb-6 ${service.image ? "pt-3" : "pt-7"}`}>
                <Icon className="h-9 w-9 text-accent [stroke-width:1.6]" aria-hidden />
                <h3 className="mt-5 font-display text-xl font-bold text-white">{service.title}</h3>
                <p className="mt-2.5 whitespace-pre-line pr-12 text-sm leading-relaxed text-frost/65">{service.text}</p>
              </div>

              <a
                href={BOOKING_HREF}
                data-service={service.title}
                aria-label={`Записаться: ${service.title}`}
                className="absolute bottom-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-frost/30 text-frost transition-colors group-hover:border-accent group-hover:text-accent hover:bg-accent hover:!text-on-accent"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </article>
          );
        })}
      </div>
    </BlockShell>
  );
}
