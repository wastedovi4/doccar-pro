import { resolveIcon } from "@/lib/icons";
import type { CardsBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Сетка карточек: иконка или номер шага, заголовок, текст. */
export function CardsBlock({ block }: { block: Data }) {
  const cols = block.items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <BlockHeading eyebrow={block.eyebrow} title={block.title} text={block.text} className="mb-10" />
      <ol className={`grid gap-5 sm:grid-cols-2 ${cols}`}>
        {block.items.map((item, i) => {
          const Icon = resolveIcon(item.icon);
          return (
            <li key={`${item.title}-${i}`} className="panel p-6">
              {block.numbered ? (
                <span className="font-display text-3xl font-extrabold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
              ) : (
                <Icon className="h-9 w-9 text-accent [stroke-width:1.6]" aria-hidden />
              )}
              <h3 className="mt-4 font-display text-lg font-bold text-white">{item.title}</h3>
              {item.text && <p className="mt-2 text-sm leading-relaxed text-frost/65">{item.text}</p>}
            </li>
          );
        })}
      </ol>
    </BlockShell>
  );
}
