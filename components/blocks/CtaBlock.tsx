import { ArrowRight } from "lucide-react";
import { BOOKING_HREF } from "@/config/site";
import type { CtaBlock as Data } from "@/lib/content-model";
import { BlockShell } from "@/components/blocks/BlockShell";
import { LogoMark } from "@/components/Logo";

/** Баннер-призыв: заголовок, текст и кнопка записи. */
export function CtaBlock({ block }: { block: Data }) {
  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.14] via-coal to-coal px-6 py-10 sm:px-12 sm:py-14">
        <LogoMark className="pointer-events-none absolute -right-10 top-1/2 hidden h-56 w-auto -translate-y-1/2 opacity-[0.07] md:block" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="whitespace-pre-line font-display text-[28px] font-extrabold leading-[1.15] text-white sm:text-4xl">
              {block.title}
            </h2>
            {block.text && (
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-frost/70">{block.text}</p>
            )}
          </div>
          <a href={BOOKING_HREF} className="btn-primary shrink-0 px-8">
            {block.button}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </BlockShell>
  );
}
