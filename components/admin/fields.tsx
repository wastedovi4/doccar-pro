"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Upload, RotateCcw } from "lucide-react";
import { ICON_KEYS, resolveIcon } from "@/lib/icons";

/** Общие поля форм админки (редактор сайта, конструктор разделов). */

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      <span className="flex items-center">
        {prefix && (
          <span className="rounded-l-lg border border-r-0 border-line bg-mist px-3 py-2.5 text-sm text-muted">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} ${prefix ? "rounded-l-none" : ""}`}
        />
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function IconBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

/** Вверх / вниз / удалить — для элемента списка. */
export function RowActions({
  index,
  count,
  onMove,
  onRemove,
  removeTitle = "Удалить",
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  removeTitle?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <IconBtn onClick={() => onMove(-1)} disabled={index === 0} title="Вверх">
        <ArrowUp className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={() => onMove(1)} disabled={index === count - 1} title="Вниз">
        <ArrowDown className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={onRemove} title={removeTitle}>
        <Trash2 className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Ic = resolveIcon(value);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">Иконка</span>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Ic className="h-5 w-5" aria-hidden />
        </span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {ICON_KEYS.map((ik) => (
            <option key={ik.key} value={ik.key}>
              {ik.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

/** Переключатель вкл/выкл. */
export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-accent" : "bg-line"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-mist/50 p-4 sm:p-5">{children}</div>;
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-4 py-2.5 text-sm font-medium text-accent hover:border-accent"
    >
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

export const moveIn = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export const setAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

/** Список однотипных элементов: карточка на элемент + порядок/удаление + «Добавить». */
export function ItemList<T>({
  items,
  onChange,
  render,
  create,
  itemLabel,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  create: () => T;
  itemLabel: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={i}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-graphite">
              {itemLabel} {i + 1}
            </span>
            <RowActions
              index={i}
              count={items.length}
              onMove={(dir) => onChange(moveIn(items, i, dir))}
              onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
            />
          </div>
          {render(item, (patch) => onChange(setAt(items, i, patch)), i)}
        </Card>
      ))}
      <AddButton onClick={() => onChange([...items, create()])}>{addLabel}</AddButton>
    </div>
  );
}

/** Загрузка файла в /api/admin/media → URL. */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) throw new Error(data?.error || "Ошибка загрузки");
  return data.url as string;
}

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Слот картинки: превью + «Загрузить» / «Убрать» / «Стандартное». */
export function ImageField({
  label,
  value,
  onChange,
  fallback,
  onError,
  aspect = "aspect-[2/1]",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  fallback?: string; // стандартная картинка из комплекта сайта
  onError: (msg: string) => void;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className={`relative w-full overflow-hidden rounded-lg border border-line bg-night sm:w-48 ${aspect}`}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/50">Без фото</span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-outline-light min-h-[38px] px-3.5 py-2 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden /> Загрузить
          </button>
          {fallback && value !== fallback && (
            <button type="button" onClick={() => onChange(fallback)} className="btn-outline-light min-h-[38px] px-3.5 py-2">
              <RotateCcw className="h-4 w-4" aria-hidden /> Стандартное
            </button>
          )}
          {value && (
            <button type="button" onClick={() => onChange("")} className="btn-outline-light min-h-[38px] px-3.5 py-2">
              <Trash2 className="h-4 w-4" aria-hidden /> Убрать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
