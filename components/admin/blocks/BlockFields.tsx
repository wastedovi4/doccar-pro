"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { Block } from "@/lib/content-model";
import { DEFAULT_BLOCKS } from "@/config/content-defaults";
import {
  Area,
  Field,
  IconSelect,
  ImageField,
  IMAGE_ACCEPT,
  ItemList,
  RowActions,
  Select,
  moveIn,
  setAt,
  uploadImage,
} from "@/components/admin/fields";

const LINE_BREAK_HINT = "Перенос строки (Enter) сохраняется на сайте.";

/** Стандартная картинка карточки — только для исходного раздела «Услуги». */
function defaultServiceImage(block: Block, i: number): string | undefined {
  const d = DEFAULT_BLOCKS.find((b) => b.id === block.id);
  return d?.type === "services" ? d.items[i]?.image : undefined;
}

/** Поля раздела конкретного типа. Общие поля (меню, якорь, фон) — в BlocksEditor. */
export function BlockFields({
  block,
  patch,
  onError,
}: {
  block: Block;
  patch: (p: Partial<Block>) => void;
  onError: (msg: string) => void;
}) {
  switch (block.type) {
    case "services":
      return (
        <div className="space-y-4">
          <Field
            label="Заголовок раздела"
            value={block.title}
            onChange={(title) => patch({ title })}
            hint="Можно оставить пустым — карточки идут без заголовка, как на макете."
          />
          <Area label="Текст под заголовком" value={block.text} rows={2} onChange={(text) => patch({ text })} />
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Услуга"
            addLabel="Добавить услугу"
            create={() => ({ icon: "wrench", title: "Новая услуга", text: "", image: "" })}
            render={(it, upd, i) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <IconSelect value={it.icon} onChange={(icon) => upd({ icon })} />
                  <Field label="Название" value={it.title} onChange={(title) => upd({ title })} />
                </div>
                <Area label="Описание" value={it.text} rows={2} onChange={(text) => upd({ text })} />
                <ImageField
                  label="Фото карточки"
                  value={it.image}
                  onChange={(image) => upd({ image })}
                  fallback={defaultServiceImage(block, i)}
                  onError={onError}
                />
              </div>
            )}
          />
          <p className="text-xs text-muted">Названия услуг попадают в выпадающий список формы записи.</p>
        </div>
      );

    case "features":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <Area label="Текст" value={block.text} rows={3} onChange={(text) => patch({ text })} />
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Пункт"
            addLabel="Добавить пункт"
            create={() => ({ icon: "badge", text: "" })}
            render={(it, upd) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <IconSelect value={it.icon} onChange={(icon) => upd({ icon })} />
                <Field label="Текст" value={it.text} onChange={(text) => upd({ text })} />
              </div>
            )}
          />
        </div>
      );

    case "gallery":
      return <GalleryFields block={block} patch={patch} onError={onError} />;

    case "text":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <Area
            label="Текст"
            value={block.text}
            rows={7}
            onChange={(text) => patch({ text })}
            hint="Абзацы разделяйте пустой строкой."
          />
          <ImageField
            label="Фото"
            value={block.image}
            onChange={(image) => patch({ image })}
            onError={onError}
            aspect="aspect-[4/3]"
          />
          {block.image && (
            <Select
              label="Фото на компьютере"
              value={block.imageSide}
              onChange={(imageSide) => patch({ imageSide })}
              options={[
                { value: "right", label: "Справа от текста" },
                { value: "left", label: "Слева от текста" },
              ]}
            />
          )}
        </div>
      );

    case "cards":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <Area label="Текст под заголовком" value={block.text} rows={2} onChange={(text) => patch({ text })} />
          <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
            <input
              type="checkbox"
              checked={block.numbered}
              onChange={(e) => patch({ numbered: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
            />
            <span className="text-sm text-graphite">
              Нумеровать карточки (01, 02, 03…)
              <span className="mt-0.5 block text-xs text-muted">Для шагов процесса. Иконки при этом не показываются.</span>
            </span>
          </label>
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Карточка"
            addLabel="Добавить карточку"
            create={() => ({ icon: "check", title: "", text: "" })}
            render={(it, upd) => (
              <div className="space-y-3">
                <div className={`grid gap-3 ${block.numbered ? "" : "sm:grid-cols-2"}`}>
                  {!block.numbered && <IconSelect value={it.icon} onChange={(icon) => upd({ icon })} />}
                  <Field label="Заголовок" value={it.title} onChange={(title) => upd({ title })} />
                </div>
                <Area label="Текст" value={it.text} rows={2} onChange={(text) => upd({ text })} />
              </div>
            )}
          />
        </div>
      );

    case "faq":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Вопрос"
            addLabel="Добавить вопрос"
            create={() => ({ q: "", a: "" })}
            render={(it, upd) => (
              <div className="space-y-3">
                <Field label="Вопрос" value={it.q} onChange={(q) => upd({ q })} />
                <Area label="Ответ" value={it.a} rows={3} onChange={(a) => upd({ a })} />
              </div>
            )}
          />
        </div>
      );

    case "prices":
      return (
        <div className="space-y-4">
          <Field label="Заголовок" value={block.title} onChange={(title) => patch({ title })} />
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Позиция"
            addLabel="Добавить позицию"
            create={() => ({ name: "", price: "", note: "" })}
            render={(it, upd) => (
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <Field label="Работа" value={it.name} onChange={(name) => upd({ name })} />
                <Field label="Цена" value={it.price} onChange={(price) => upd({ price })} placeholder="от 1 500 ₽" />
                <div className="sm:col-span-2">
                  <Field label="Примечание" value={it.note} onChange={(note) => upd({ note })} placeholder="Необязательно" />
                </div>
              </div>
            )}
          />
          <Area
            label="Текст под таблицей"
            value={block.text}
            rows={2}
            onChange={(text) => patch({ text })}
            hint="Например: «Окончательная стоимость — после диагностики»."
          />
        </div>
      );

    case "cta":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <Area label="Текст" value={block.text} rows={2} onChange={(text) => patch({ text })} />
          <Field
            label="Надпись на кнопке"
            value={block.button}
            onChange={(button) => patch({ button })}
            hint="Кнопка открывает окно записи."
          />
        </div>
      );

    case "reviews":
      return (
        <div className="space-y-4">
          <Field label="Заголовок" value={block.title} onChange={(title) => patch({ title })} />
          <ItemList
            items={block.items}
            onChange={(items) => patch({ items })}
            itemLabel="Отзыв"
            addLabel="Добавить отзыв"
            create={() => ({ name: "", meta: "", text: "" })}
            render={(it, upd) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Имя" value={it.name} onChange={(name) => upd({ name })} />
                  <Field label="Автомобиль / подпись" value={it.meta} onChange={(meta) => upd({ meta })} />
                </div>
                <Area label="Текст отзыва" value={it.text} rows={3} onChange={(text) => upd({ text })} />
              </div>
            )}
          />
          <p className="text-xs text-muted">Публикуйте только реальные отзывы клиентов.</p>
        </div>
      );

    case "brands":
      return (
        <div className="space-y-4">
          <Area label="Заголовок" value={block.title} rows={2} onChange={(title) => patch({ title })} hint={LINE_BREAK_HINT} />
          <Area label="Текст" value={block.text} rows={3} onChange={(text) => patch({ text })} />
          <Area
            label="Марки"
            value={block.items.join("\n")}
            rows={6}
            onChange={(v) => patch({ items: v.split("\n") })}
            hint="По одной марке на строку. Пустые строки не сохраняются."
          />
          <Area label="Сноска под списком" value={block.note} rows={2} onChange={(note) => patch({ note })} />
        </div>
      );
  }
}

/** Лента фото: список с подписями + загрузка новых. */
function GalleryFields({
  block,
  patch,
  onError,
}: {
  block: Extract<Block, { type: "gallery" }>;
  patch: (p: Partial<Block>) => void;
  onError: (msg: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const photos = block.photos;

  async function add(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const src = await uploadImage(file);
      patch({ photos: [...photos, { src, alt: "" }] });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Field
        label="Заголовок раздела"
        value={block.title}
        onChange={(title) => patch({ title })}
        hint="Можно оставить пустым."
      />
      {photos.length === 0 ? (
        <p className="text-sm text-muted">Фото пока нет — раздел на сайте не показывается.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {photos.map((p, i) => (
            <li key={`${p.src}-${i}`} className="flex gap-3 rounded-xl border border-line bg-white p-2.5">
              <img src={p.src} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <input
                  value={p.alt}
                  placeholder="Описание фото (для поисковиков)"
                  onChange={(e) => patch({ photos: setAt(photos, i, { alt: e.target.value }) })}
                  className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="mt-1.5">
                  <RowActions
                    index={i}
                    count={photos.length}
                    onMove={(dir) => patch({ photos: moveIn(photos, i, dir) })}
                    onRemove={() => patch({ photos: photos.filter((_, idx) => idx !== i) })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-dashed border-line p-4">
        <input ref={input} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => add(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          Добавить фото
        </button>
        <p className="mt-2 text-xs text-muted">JPG, PNG, WEBP или GIF, до 6 МБ. На компьютере — по три в ряд.</p>
      </div>
    </div>
  );
}
