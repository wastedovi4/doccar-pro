"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

type Errors = Partial<Record<"name" | "phone" | "consent", string>>;

const OTHER = "Другое / не знаю";

export function ContactForm({
  services,
  presetService = "",
  onDone,
}: {
  services: string[];
  presetService?: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [service, setService] = useState(presetService);

  useEffect(() => setService(presetService), [presetService]);

  function validate(form: HTMLFormElement): Errors {
    const data = new FormData(form);
    const next: Errors = {};

    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const consent = data.get("consent");

    if (!name) next.name = "Укажите имя";
    // Телефон обязателен: минимум 6 цифр
    const digits = phone.replace(/\D/g, "");
    if (!phone) next.phone = "Укажите телефон";
    else if (digits.length < 6) next.phone = "Проверьте номер телефона";
    if (!consent) next.consent = "Необходимо согласие на обработку данных";

    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("loading");
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      // Заявка падает в CRM (админка → «Запросы»), см. app/api/lead/route.ts
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-14 w-14 text-accent" aria-hidden />
        <h3 id="booking-title" className="mt-5 font-display text-2xl font-bold text-white">
          Заявка отправлена
        </h3>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-frost/65">
          Спасибо! Перезвоним, уточним детали и подберём удобное время визита.
        </p>
        {onDone && (
          <button type="button" onClick={onDone} className="btn-primary mt-7 px-8">
            Готово
          </button>
        )}
      </div>
    );
  }

  const fieldBase =
    "w-full rounded-lg border bg-night px-4 py-3 text-sm text-frost placeholder:text-frost/35 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40";
  const labelCls = "mb-1.5 block text-sm font-medium text-frost/85";
  const errCls = "mt-1.5 flex items-center gap-1 text-xs text-red-400";

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="booking-title">
      <h3 id="booking-title" className="pr-10 font-display text-2xl font-bold text-white">
        Запись на сервис
      </h3>
      <p className="mt-1.5 text-sm text-frost/60">
        Оставьте контакты — перезвоним, уточним задачу и предложим время.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className={labelCls}>
            Имя <span className="text-accent">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Как к вам обращаться"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
            className={`${fieldBase} ${errors.name ? "border-red-400/70" : "border-white/10"}`}
          />
          {errors.name && (
            <p id="err-name" className={errCls}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={labelCls}>
            Телефон <span className="text-accent">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "err-phone" : undefined}
            className={`${fieldBase} ${errors.phone ? "border-red-400/70" : "border-white/10"}`}
          />
          {errors.phone && (
            <p id="err-phone" className={errCls}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {errors.phone}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="service" className={labelCls}>
              Услуга
            </label>
            <select
              id="service"
              name="service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={`${fieldBase} border-white/10`}
            >
              <option value="">Выберите</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER}>{OTHER}</option>
            </select>
          </div>
          <div>
            <label htmlFor="car" className={labelCls}>
              Автомобиль
            </label>
            <input
              id="car"
              name="car"
              type="text"
              placeholder="Марка, модель, год"
              className={`${fieldBase} border-white/10`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className={labelCls}>
            Что беспокоит
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            placeholder="Симптомы, ошибки, желаемые работы"
            className={`${fieldBase} resize-y border-white/10`}
          />
        </div>

        <div>
          <label htmlFor="consent" className="flex items-start gap-2.5 text-sm text-frost/60">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-night accent-[#C6F34A]"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "err-consent" : undefined}
            />
            <span>
              Согласен на обработку персональных данных <span className="text-accent">*</span>
            </span>
          </label>
          {errors.consent && (
            <p id="err-consent" className={errCls}>
              <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {errors.consent}
            </p>
          )}
        </div>

        {status === "error" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.
          </div>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Отправляем…
            </>
          ) : (
            <>
              Отправить заявку <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
