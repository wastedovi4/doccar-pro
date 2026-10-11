import { resolveIcon } from "@/lib/icons";
import type { FeaturesBlock as Data } from "@/lib/content-model";
import { BlockShell } from "@/components/blocks/BlockShell";

/** «По делу. Без лишних работ.» — подход сервиса + короткие пункты с иконками. */
export function FeaturesBlock({ block }: { block: Data }) {
  const n = block.items.length;
  // Разделитель под каждым рядом, кроме последнего (2 колонки на sm+, 1 на мобильном).
  const lastRowStart = n - (n % 2 === 0 ? 2 : 1);

  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
        <div>
          <span className="rule" aria-hidden />
          <h2 className="mt-7 whitespace-pre-line font-display text-[34px] font-extrabold leading-[1.12] text-white sm:text-[44px]">
            {block.title}
          </h2>
          {block.text && (
            <p className="mt-6 max-w-md whitespace-pre-line text-base leading-relaxed text-frost/65">{block.text}</p>
          )}
        </div>

        {n > 0 && (
          <ul className="grid sm:grid-cols-2 sm:gap-x-10">
            {block.items.map((f, i) => {
              const Icon = resolveIcon(f.icon);
              const border =
                i === n - 1 ? "border-b-0" : i >= lastRowStart ? "border-b sm:border-b-0" : "border-b";
              return (
                <li key={`${f.icon}-${i}`} className={`flex items-center gap-5 border-white/[0.07] py-6 ${border}`}>
                  <Icon className="h-10 w-10 shrink-0 text-accent [stroke-width:1.5]" aria-hidden />
                  <span className="max-w-[15rem] text-[15px] leading-snug text-frost/85">{f.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BlockShell>
  );
}
