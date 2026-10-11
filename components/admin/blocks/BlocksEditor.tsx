"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Blocks,
  ChevronDown,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Images,
  LayoutGrid,
  ListChecks,
  Megaphone,
  MessageSquareQuote,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import {
  BLOCK_META,
  BLOCK_TYPES,
  blockId,
  createBlock,
  type Block,
  type BlockType,
  type Tone,
} from "@/lib/content-model";
import { Field, IconBtn, Select, Switch } from "@/components/admin/fields";
import { BlockFields } from "@/components/admin/blocks/BlockFields";

const TYPE_ICON: Record<BlockType, typeof Blocks> = {
  services: LayoutGrid,
  features: ListChecks,
  gallery: Images,
  text: AlignLeft,
  cards: Blocks,
  faq: CircleHelp,
  prices: Receipt,
  cta: Megaphone,
  reviews: MessageSquareQuote,
};

/** Подпись раздела в списке: его заголовок (первая строка) или название типа. */
function blockTitle(b: Block): string {
  const t = ("title" in b ? b.title : "").split("\n")[0].trim();
  return t || BLOCK_META[b.type].label;
}

/**
 * Конструктор разделов: список (порядок = порядок на странице), добавление
 * из каталога типов, дублирование, удаление, видимость, пункт меню, якорь, фон.
 * Всё применяется на сайте по кнопке «Сохранить» редактора.
 */
export function BlocksEditor({
  blocks,
  onChange,
  onError,
}: {
  blocks: Block[];
  onChange: (fn: (blocks: Block[]) => Block[]) => void;
  onError: (msg: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  // После добавления/дублирования — прокрутить к новому разделу.
  useEffect(() => {
    if (!scrollTo) return;
    rowRefs.current.get(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollTo(null);
  }, [scrollTo, blocks]);

  const patch = (id: string, p: Partial<Block>) =>
    onChange((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));

  const move = (i: number, dir: -1 | 1) =>
    onChange((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function add(type: BlockType) {
    const b = createBlock(type);
    onChange((bs) => [...bs, b]);
    setPicker(false);
    setOpenId(b.id);
    setScrollTo(b.id);
  }

  function duplicate(b: Block) {
    const id = blockId();
    // Копия скрыта и без пункта меню — чтобы на сайте не появилось двойников.
    const copy = { ...structuredClone(b), id, anchor: `${b.anchor}-copy`, visible: false, menuLabel: "" } as Block;
    onChange((bs) => {
      const i = bs.findIndex((x) => x.id === b.id);
      return [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)];
    });
    setOpenId(id);
    setScrollTo(id);
  }

  function remove(b: Block) {
    if (!confirm(`Удалить раздел «${blockTitle(b)}»? Изменение попадёт на сайт после «Сохранить».`)) return;
    onChange((bs) => bs.filter((x) => x.id !== b.id));
    if (openId === b.id) setOpenId(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Разделы идут на странице в этом порядке — между главным экраном и финальным блоком с картой.
        Новый раздел создаётся скрытым: заполните его и включите видимость.
      </p>

      <ul className="space-y-3">
        {blocks.map((b, i) => {
          const Icon = TYPE_ICON[b.type];
          const open = openId === b.id;
          return (
            <li
              key={b.id}
              ref={(el) => {
                if (el) rowRefs.current.set(b.id, el);
                else rowRefs.current.delete(b.id);
              }}
              className={`scroll-mt-20 overflow-hidden rounded-xl border bg-white transition-colors ${
                open ? "border-accent/50 shadow-sm" : "border-line"
              }`}
            >
              <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : b.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      b.visible ? "bg-accent/10 text-accent" : "bg-mist text-muted"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${b.visible ? "text-graphite" : "text-muted"}`}>
                      {blockTitle(b)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{BLOCK_META[b.type].label}</span>
                      {b.menuLabel.trim() && <span>· в меню: «{b.menuLabel.trim()}»</span>}
                      {!b.visible && <span className="font-medium text-amber-600">· скрыт</span>}
                    </span>
                  </span>
                  <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Switch
                    on={b.visible}
                    onToggle={() => patch(b.id, { visible: !b.visible })}
                    label={b.visible ? "Скрыть раздел" : "Показать раздел"}
                  />
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <IconBtn onClick={() => move(i, -1)} disabled={i === 0} title="Выше">
                      <ArrowUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => move(i, 1)} disabled={i === blocks.length - 1} title="Ниже">
                      <ArrowDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => duplicate(b)} title="Дублировать">
                      <Copy className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => remove(b)} title="Удалить раздел">
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </span>
                </div>
              </div>

              {open && (
                <div className="space-y-5 border-t border-line bg-mist/40 px-3 py-4 sm:px-5 sm:py-5">
                  {/* На телефоне действия раздела — здесь */}
                  <div className="flex flex-wrap gap-1.5 sm:hidden">
                    <IconBtn onClick={() => move(i, -1)} disabled={i === 0} title="Выше">
                      <ArrowUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => move(i, 1)} disabled={i === blocks.length - 1} title="Ниже">
                      <ArrowDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => duplicate(b)} title="Дублировать">
                      <Copy className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn onClick={() => remove(b)} title="Удалить раздел">
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>

                  {!b.visible && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
                      Раздел скрыт. Заполните и включите переключатель видимости.
                    </div>
                  )}

                  <div className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-3">
                    <Field
                      label="Пункт меню"
                      value={b.menuLabel}
                      onChange={(menuLabel) => patch(b.id, { menuLabel })}
                      placeholder="Не показывать"
                      hint="Пусто — раздела нет в меню."
                    />
                    <Field
                      label="Адрес раздела"
                      prefix="#"
                      value={b.anchor}
                      onChange={(v) => patch(b.id, { anchor: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                      hint="Латиница, цифры, дефис."
                    />
                    <Select<Tone>
                      label="Фон"
                      value={b.tone}
                      onChange={(tone) => patch(b.id, { tone })}
                      options={[
                        { value: "default", label: "Обычный" },
                        { value: "raised", label: "Выделенная полоса" },
                      ]}
                    />
                  </div>

                  <BlockFields block={b} patch={(p) => patch(b.id, p)} onError={onError} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-muted">
          Разделов нет — на странице только главный экран и финальный блок.
        </p>
      )}

      {/* Каталог типов */}
      {picker ? (
        <div className="rounded-xl border border-accent/40 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-graphite">Какой раздел добавить?</span>
            <IconBtn onClick={() => setPicker(false)} title="Закрыть">
              <X className="h-4 w-4" />
            </IconBtn>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCK_TYPES.map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => add(t)}
                  className="group flex gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-accent hover:bg-accent/5"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-graphite group-hover:text-accent">
                      {BLOCK_META[t].label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{BLOCK_META[t].description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicker(true)} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden /> Добавить раздел
        </button>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Eye className="h-3.5 w-3.5" aria-hidden /> Переключатель справа — видимость раздела на сайте.
      </p>
    </div>
  );
}
