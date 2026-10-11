"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  LayoutTemplate,
  Search,
  Clock,
  MessageSquareText,
  MapPin,
  ExternalLink,
  Rows3,
} from "lucide-react";
import { DEFAULT_CONTENT, type Content } from "@/lib/content-model";
import { Area, Card, Field, ImageField, inputCls } from "@/components/admin/fields";
import { BlocksEditor } from "@/components/admin/blocks/BlocksEditor";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type TabKey = "business" | "hero" | "blocks" | "cta" | "hours" | "seo";

const TABS: { key: TabKey; label: string; icon: typeof Phone }[] = [
  { key: "blocks", label: "Разделы", icon: Rows3 },
  { key: "hero", label: "Главный экран", icon: LayoutTemplate },
  { key: "cta", label: "Финальный блок", icon: MessageSquareText },
  { key: "business", label: "Контакты", icon: Phone },
  { key: "hours", label: "Календарь", icon: Clock },
  { key: "seo", label: "SEO", icon: Search },
];

export function AdminEditor({ initial }: { initial: Content }) {
  const router = useRouter();
  const [content, setContent] = useState<Content>(initial);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial));
  const [tab, setTab] = useState<TabKey>("blocks");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const dirty = useMemo(() => JSON.stringify(content) !== saved, [content, saved]);

  // Не потерять правки при закрытии вкладки.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function showToast(type: "ok" | "err", msg: string) {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }
  const showError = (msg: string) => showToast("err", msg);

  // Иммутабельный апдейтер секции
  const patch = <K extends keyof Content>(key: K, p: Partial<Content[K]>) =>
    setContent((c) => ({ ...c, [key]: { ...c[key], ...p } }));
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
      // То, что реально сохранил сервер (якоря, отброшенное невалидное).
      const next: Content = data?.content ?? content;
      setContent(next);
      setSaved(JSON.stringify(next));
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
        <span className={`mr-auto text-xs ${dirty ? "font-medium text-amber-700" : "text-muted"}`}>
          {dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}
        </span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm font-medium text-accent hover:underline sm:inline"
        >
          Открыть сайт
        </a>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
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
                  active ? "bg-accent text-on-accent" : "bg-white text-graphite hover:bg-white/60 hover:text-accent"
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
          {tab === "blocks" && (
            <BlocksEditor
              blocks={content.blocks}
              onChange={(fn) => setContent((c) => ({ ...c, blocks: fn(c.blocks) }))}
              onError={showError}
            />
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
              <Area label="Подзаголовок" value={content.hero.subtitle} onChange={(v) => patch("hero", { subtitle: v })} rows={2} />
              <ImageField
                label="Фото на главном экране"
                value={content.hero.image}
                onChange={(image) => patch("hero", { image })}
                fallback={DEFAULT_CONTENT.hero.image}
                onError={showError}
              />
              <p className="text-xs text-muted">
                Лучше горизонтальное фото от 1600 px по ширине. Левая часть кадра уходит под текст и затемняется.
              </p>
            </div>
          )}

          {tab === "cta" && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Последний блок страницы: заголовок, текст, кнопки записи и маршрута, контакты и карта. Всегда виден.
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
                  Скопируйте координаты из Яндекс.Карт (клик по точке → координаты) и вставьте сюда. По ним строится
                  карта и маршрут «Как добраться».
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

          {tab === "hours" && (
            <div className="space-y-5">
              <p className="text-sm text-muted">
                Рабочие часы и дни для календаря записей. Сетка календаря строится по ним; при записи вне рабочего
                времени приёмщик увидит предупреждение.
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
                          on ? "border-accent bg-accent text-on-accent" : "border-line bg-white text-muted hover:border-accent"
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
