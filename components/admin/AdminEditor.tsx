"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  LayoutTemplate,
  ListChecks,
  Wrench,
  Search,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Clock,
  RotateCcw,
  MessageSquareText,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { DEFAULT_CONTENT, type Content, type Feature, type Photo, type ServiceItem } from "@/lib/content-model";
import { ICON_KEYS, resolveIcon } from "@/lib/icons";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type TabKey =
  | "business"
  | "hero"
  | "services"
  | "about"
  | "gallery"
  | "cta"
  | "sections"
  | "hours"
  | "seo";

const TABS: { key: TabKey; label: string; icon: typeof Phone }[] = [
  { key: "business", label: "Контакты", icon: Phone },
  { key: "hero", label: "Главный экран", icon: LayoutTemplate },
  { key: "services", label: "Услуги", icon: Wrench },
  { key: "about", label: "О сервисе", icon: ListChecks },
  { key: "gallery", label: "Фото", icon: ImageIcon },
  { key: "cta", label: "Блок «Вопросы»", icon: MessageSquareText },
  { key: "sections", label: "Разделы", icon: Eye },
  { key: "hours", label: "Календарь", icon: Clock },
  { key: "seo", label: "SEO", icon: Search },
];

const SECTION_LABELS: { key: keyof Content["sections"]; label: string; hint: string }[] = [
  { key: "services", label: "Услуги", hint: "Карточки услуг с фото" },
  { key: "about", label: "О сервисе", hint: "«По делу. Без лишних работ.» + преимущества" },
  { key: "gallery", label: "Фото", hint: "Лента фотографий сервиса" },
];

/* ---------- мелкие переиспользуемые поля ---------- */

const inputCls =
  "w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-graphite">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Area({
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
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-y`}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function IconBtn({
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

/** Вверх / вниз / удалить — для элемента списка. */
function RowActions({
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

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-mist/50 p-4 sm:p-5">{children}</div>;
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
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

/** Загрузка файла в /api/admin/media → URL. */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) throw new Error(data?.error || "Ошибка загрузки");
  return data.url as string;
}

/** Слот картинки: превью + «Загрузить» / «Убрать» / «Стандартное». */
function ImageField({
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
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
              Без фото
            </span>
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
            accept="image/jpeg,image/png,image/webp,image/gif"
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
            <button
              type="button"
              onClick={() => onChange(fallback)}
              className="btn-outline-light min-h-[38px] px-3.5 py-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Стандартное
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="btn-outline-light min-h-[38px] px-3.5 py-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Убрать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- основной редактор ---------- */

const moveIn = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

const setAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

export function AdminEditor({ initial }: { initial: Content }) {
  const router = useRouter();
  const [content, setContent] = useState<Content>(initial);
  const [tab, setTab] = useState<TabKey>("business");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }
  const showError = (msg: string) => showToast("err", msg);

  // Иммутабельные апдейтеры по секциям
  const patch = <K extends keyof Content>(key: K, p: Partial<Content[K]>) =>
    setContent((c) => ({ ...c, [key]: { ...c[key], ...p } }));
  const setServices = (fn: (s: ServiceItem[]) => ServiceItem[]) =>
    setContent((c) => ({ ...c, services: fn(c.services) }));
  const setFeatures = (fn: (f: Feature[]) => Feature[]) =>
    setContent((c) => ({ ...c, about: { ...c.about, features: fn(c.about.features) } }));
  const setGallery = (fn: (g: Photo[]) => Photo[]) =>
    setContent((c) => ({ ...c, gallery: fn(c.gallery) }));
  const toggleSection = (key: keyof Content["sections"]) =>
    setContent((c) => ({ ...c, sections: { ...c.sections, [key]: !c.sections[key] } }));
  const toggleWorkDay = (i: number) =>
    setContent((c) => ({
      ...c,
      workHours: { ...c.workHours, days: c.workHours.days.map((d, idx) => (idx === i ? !d : d)) },
    }));

  // Координаты одной строкой — так их копируют из Яндекс/Google Карт: «55.678, 37.277».
  const [coords, setCoords] = useState(`${initial.business.geo.lat}, ${initial.business.geo.lng}`);
  const coordsValid = /^\s*-?\d{1,2}(\.\d+)?\s*[,;\s]\s*-?\d{1,3}(\.\d+)?\s*$/.test(coords);
  function applyCoords(v: string) {
    setCoords(v);
    const m = v.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (!m) return;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) patch("business", { geo: { lat, lng } });
  }

  // Загрузка нового фото в ленту
  const galleryInput = useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  async function addGalleryPhoto(file: File | undefined) {
    if (!file) return;
    setUploadingGallery(true);
    try {
      const src = await uploadImage(file);
      setGallery((g) => [...g, { src, alt: "" }]);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploadingGallery(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => null);
      if (data?.content) setContent(data.content); // то, что реально сохранил сервер
      showToast("ok", "Сохранено. Сайт обновлён.");
    } catch {
      showToast("err", "Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  const b = content.business;

  return (
    <div>
      {/* Панель сохранения */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-end gap-3 border-b border-line bg-mist/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <span className="mr-auto text-xs text-muted">
          Загруженные фото попадают на сайт после «Сохранить».
        </span>
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-70">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Сохранить
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Табы */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-on-accent"
                    : "bg-white text-graphite hover:bg-white/60 hover:text-accent"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Панель редактирования */}
        <div className="min-w-0 space-y-5">
          {tab === "business" && (
            <div className="space-y-4">
              <Field label="Название сервиса" value={b.name} onChange={(v) => patch("business", { name: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Телефон (для звонка)"
                  value={b.phone}
                  onChange={(v) => patch("business", { phone: v })}
                  placeholder="+74951234567"
                  hint="Только цифры и +. Пусто — кнопка «Позвонить» скрыта."
                />
                <Field
                  label="Телефон (как показывать)"
                  value={b.phoneDisplay}
                  onChange={(v) => patch("business", { phoneDisplay: v })}
                  placeholder="+7 (495) 123-45-67"
                />
              </div>
              <Field
                label="E-mail"
                value={b.email}
                onChange={(v) => patch("business", { email: v })}
                placeholder="info@doccar.pro"
                hint="Необязательно."
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Город" value={b.city} onChange={(v) => patch("business", { city: v })} />
                <Field label="Регион" value={b.region} onChange={(v) => patch("business", { region: v })} />
                <Field
                  label="Улица, дом"
                  value={b.street}
                  onChange={(v) => patch("business", { street: v })}
                  placeholder="ул. Такая-то, 1"
                  hint="Пусто — на сайте показывается город."
                />
              </div>

              <Card>
                <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                  <MapPin className="h-4 w-4 text-accent" aria-hidden /> Точка на карте
                </div>
                <p className="mt-1 text-xs text-muted">
                  Скопируйте координаты из Яндекс.Карт (клик по точке → координаты) и вставьте сюда.
                  По ним строится карта и маршрут «Как добраться».
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={coords}
                    onChange={(e) => applyCoords(e.target.value)}
                    placeholder="55.678, 37.2775"
                    aria-invalid={!coordsValid}
                    className={`${inputCls} sm:max-w-xs ${coordsValid ? "" : "border-red-400"}`}
                  />
                  <a
                    href={`https://yandex.ru/maps/?pt=${b.geo.lng},${b.geo.lat}&z=16&l=map`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    Проверить на карте <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
                {!coordsValid && (
                  <p className="mt-1.5 text-xs text-red-500">Формат: широта, долгота — например 55.678, 37.2775</p>
                )}
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="График работы (текст)"
                  value={b.workingHours}
                  onChange={(v) => patch("business", { workingHours: v })}
                  placeholder="Пн–Сб 09:00–20:00"
                />
                <Field
                  label="График для поисковиков"
                  value={b.openingHoursSpec}
                  onChange={(v) => patch("business", { openingHoursSpec: v })}
                  placeholder="Mo-Sa 09:00-20:00"
                  hint="Формат schema.org. Можно оставить пустым."
                />
              </div>
            </div>
          )}

          {tab === "hero" && (
            <div className="space-y-4">
              <Field label="Надзаголовок" value={content.hero.eyebrow} onChange={(v) => patch("hero", { eyebrow: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Заголовок — строка 1 (белая)"
                  value={content.hero.title}
                  onChange={(v) => patch("hero", { title: v })}
                />
                <Field
                  label="Заголовок — строка 2 (лаймовая)"
                  value={content.hero.titleAccent}
                  onChange={(v) => patch("hero", { titleAccent: v })}
                />
              </div>
              <Area
                label="Подзаголовок"
                value={content.hero.subtitle}
                onChange={(v) => patch("hero", { subtitle: v })}
                rows={2}
              />
              <ImageField
                label="Фото на главном экране"
                value={content.hero.image}
                onChange={(image) => patch("hero", { image })}
                fallback={DEFAULT_CONTENT.hero.image}
                onError={showError}
              />
              <p className="text-xs text-muted">
                Лучше горизонтальное фото от 1600 px по ширине. Левая часть кадра уходит под текст и
                затемняется.
              </p>
            </div>
          )}

          {tab === "services" && (
            <div className="space-y-4">
              {content.services.map((svc, i) => (
                <Card key={i}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-graphite">Услуга {i + 1}</span>
                    <RowActions
                      index={i}
                      count={content.services.length}
                      onMove={(dir) => setServices((s) => moveIn(s, i, dir))}
                      onRemove={() => setServices((s) => s.filter((_, idx) => idx !== i))}
                      removeTitle="Удалить услугу"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <IconSelect value={svc.icon} onChange={(icon) => setServices((s) => setAt(s, i, { icon }))} />
                    <Field
                      label="Название"
                      value={svc.title}
                      onChange={(title) => setServices((s) => setAt(s, i, { title }))}
                    />
                  </div>
                  <div className="mt-3 space-y-3">
                    <Area
                      label="Описание"
                      value={svc.text}
                      rows={2}
                      onChange={(text) => setServices((s) => setAt(s, i, { text }))}
                    />
                    <ImageField
                      label="Фото карточки"
                      value={svc.image}
                      onChange={(image) => setServices((s) => setAt(s, i, { image }))}
                      fallback={DEFAULT_CONTENT.services[i]?.image}
                      onError={showError}
                    />
                  </div>
                </Card>
              ))}
              <AddButton
                onClick={() =>
                  setServices((s) => [...s, { icon: "wrench", title: "Новая услуга", text: "", image: "" }])
                }
              >
                Добавить услугу
              </AddButton>
              <p className="text-xs text-muted">
                Названия услуг также попадают в выпадающий список формы записи.
              </p>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-4">
              <Area
                label="Заголовок блока"
                value={content.about.title}
                onChange={(v) => patch("about", { title: v })}
                rows={2}
                hint="Перенос строки (Enter) сохраняется на сайте."
              />
              <Area label="Текст" value={content.about.text} rows={3} onChange={(v) => patch("about", { text: v })} />

              <span className="block pt-2 text-sm font-semibold text-graphite">Преимущества</span>
              {content.about.features.map((f, i) => (
                <Card key={i}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-graphite">Пункт {i + 1}</span>
                    <RowActions
                      index={i}
                      count={content.about.features.length}
                      onMove={(dir) => setFeatures((x) => moveIn(x, i, dir))}
                      onRemove={() => setFeatures((x) => x.filter((_, idx) => idx !== i))}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <IconSelect value={f.icon} onChange={(icon) => setFeatures((x) => setAt(x, i, { icon }))} />
                    <Field label="Текст" value={f.text} onChange={(text) => setFeatures((x) => setAt(x, i, { text }))} />
                  </div>
                </Card>
              ))}
              <AddButton onClick={() => setFeatures((x) => [...x, { icon: "badge", text: "" }])}>
                Добавить преимущество
              </AddButton>
            </div>
          )}

          {tab === "gallery" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Лента фотографий между блоками «О сервисе» и «Вопросы». На компьютере — по три в ряд.
              </p>
              {content.gallery.length === 0 ? (
                <p className="text-sm text-muted">Фото пока нет — лента на сайте не показывается.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {content.gallery.map((p, i) => (
                    <li key={`${p.src}-${i}`} className="flex gap-3 rounded-xl border border-line bg-white p-2.5">
                      <img src={p.src} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <input
                          value={p.alt}
                          placeholder="Описание фото (для поисковиков)"
                          onChange={(e) => setGallery((g) => setAt(g, i, { alt: e.target.value }))}
                          className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <div className="mt-1.5">
                          <RowActions
                            index={i}
                            count={content.gallery.length}
                            onMove={(dir) => setGallery((g) => moveIn(g, i, dir))}
                            onRemove={() => setGallery((g) => g.filter((_, idx) => idx !== i))}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-xl border border-dashed border-line p-4">
                <input
                  ref={galleryInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => addGalleryPhoto(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  disabled={uploadingGallery}
                  className="btn-primary disabled:opacity-60"
                >
                  {uploadingGallery ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden />
                  )}
                  Добавить фото
                </button>
                <p className="mt-2 text-xs text-muted">JPG, PNG, WEBP или GIF, до 6 МБ.</p>
              </div>
            </div>
          )}

          {tab === "cta" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Финальный блок перед футером: заголовок, текст, кнопки записи и маршрута, карта.
              </p>
              <Area
                label="Заголовок"
                value={content.cta.title}
                onChange={(v) => patch("cta", { title: v })}
                rows={2}
                hint="Перенос строки (Enter) сохраняется на сайте."
              />
              <Area label="Текст" value={content.cta.text} onChange={(v) => patch("cta", { text: v })} rows={2} />
            </div>
          )}

          {tab === "sections" && (
            <div>
              <p className="mb-4 text-sm text-muted">
                Включайте и выключайте блоки на сайте. Скрытый блок пропадает со страницы,
                а его пункт исчезает из меню.
              </p>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {SECTION_LABELS.map((sec) => {
                  const on = content.sections[sec.key];
                  return (
                    <li key={sec.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                          {on ? (
                            <Eye className="h-4 w-4 text-accent" aria-hidden />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted" aria-hidden />
                          )}
                          {sec.label}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">{sec.hint}</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${on ? "Скрыть" : "Показать"} блок «${sec.label}»`}
                        onClick={() => toggleSection(sec.key)}
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
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">
                «Главный экран» и блок «Вопросы» с картой скрыть нельзя — они основные.
              </p>
            </div>
          )}

          {tab === "hours" && (
            <div className="space-y-5">
              <p className="text-sm text-muted">
                Рабочие часы и дни для календаря записей. Сетка календаря строится по ним;
                при записи вне рабочего времени приёмщик увидит предупреждение.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-graphite">Начало дня</span>
                  <select
                    value={content.workHours.start}
                    onChange={(e) => patch("workHours", { start: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-graphite">Конец дня</span>
                  <select
                    value={content.workHours.end}
                    onChange={(e) => patch("workHours", { end: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-graphite">Рабочие дни</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d, i) => {
                    const on = content.workHours.days[i];
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWorkDay(i)}
                        aria-pressed={on}
                        className={`h-10 w-12 rounded-lg border text-sm font-medium transition-colors ${
                          on
                            ? "border-accent bg-accent text-on-accent"
                            : "border-line bg-white text-muted hover:border-accent"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
                <input
                  type="checkbox"
                  checked={content.workHours.enforce}
                  onChange={(e) => patch("workHours", { enforce: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                />
                <span className="text-sm text-graphite">
                  Предупреждать при записи вне рабочего времени
                  <span className="mt-0.5 block text-xs text-muted">
                    Запись всё равно можно создать — но с подтверждением, как при пересечении.
                  </span>
                </span>
              </label>
            </div>
          )}

          {tab === "seo" && (
            <div className="space-y-4">
              <Field label="SEO Title" value={content.seo.title} onChange={(v) => patch("seo", { title: v })} />
              <Area
                label="SEO Description"
                value={content.seo.description}
                onChange={(v) => patch("seo", { description: v })}
                rows={3}
              />
              <Field
                label="Домен сайта"
                value={content.seo.url}
                onChange={(v) => patch("seo", { url: v })}
                placeholder="https://doccar.pro"
                hint="Полный адрес с https:// — влияет на canonical, sitemap и Open Graph."
              />
            </div>
          )}
        </div>
      </div>

      {/* Тост */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "ok" ? "bg-graphite" : "bg-red-600"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 text-lime" aria-hidden />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
