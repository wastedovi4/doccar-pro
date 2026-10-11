"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Car,
  Wrench,
  CalendarDays,
  Printer,
  Link2,
  Lock,
  Package,
  FileText,
  Lightbulb,
} from "lucide-react";
import {
  WO_MECHANIC_STATUSES,
  WO_STATUSES,
  WO_STATUS_LABEL,
  type Role,
  type Vehicle,
  type WorkOrderDetail,
  type WorkOrderStatus,
} from "@/lib/crm-types";
import { formatMileage, parseRub, plateDisplay, rub, rubInput, vehicleLabel, woNumber } from "@/lib/format";
import { WoStatusChip, fmtDate, Label, crmInput } from "@/components/admin/ui";
import { OrderLines } from "@/components/admin/OrderLines";
import { OrderRecommendations } from "@/components/admin/OrderRecommendations";
import type { StaffLite } from "@/components/admin/AppointmentModal";

/** Следующий шаг по статусу — главная кнопка карточки. */
const NEXT: Partial<Record<WorkOrderStatus, { to: WorkOrderStatus; label: string }>> = {
  open: { to: "in_progress", label: "Взять в работу" },
  in_progress: { to: "ready", label: "Готово" },
  ready: { to: "closed", label: "Выдать клиенту" },
};

function Section({ icon: Icon, title, children, aside }: { icon: typeof User; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
          <Icon className="h-4 w-4" aria-hidden /> {title}
        </h2>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Карточка заказ-наряда. Механик — свой наряд, без телефона и цен, статусы «в работе/готов». */
export function WorkOrderCard({ id, role }: { id: string; role: Role }) {
  const manager = role === "admin" || role === "receiver";
  const [order, setOrder] = useState<WorkOrderDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [draft, setDraft] = useState({ complaint: "", mileage: "", note: "", mechanicId: "", vehicleId: "" });
  const [report, setReport] = useState("");
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function adopt(o: WorkOrderDetail) {
    setOrder(o);
    setDraft({
      complaint: o.complaint,
      mileage: o.mileage !== undefined ? String(o.mileage) : "",
      note: o.note,
      mechanicId: o.mechanicId ?? "",
      vehicleId: o.vehicleId ?? "",
    });
    setReport(o.report);
    setDiscount(rubInput(o.discount ?? 0) === "0" ? "" : rubInput(o.discount ?? 0));
  }

  async function reload() {
    const d = await (await fetch(`/api/admin/orders/${id}`)).json();
    if (d.ok) setOrder(d.order);
    else setMissing(true);
  }

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? adopt(d.order) : setMissing(true)));
  }, [id]);

  useEffect(() => {
    if (!manager || !order) return;
    fetch("/api/admin/staff").then((r) => r.json()).then((d) => d.ok && setStaff(d.staff));
    fetch(`/api/admin/clients/${order.clientId}`).then((r) => r.json()).then((d) => d.ok && setVehicles(d.vehicles));
  }, [manager, order?.clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (ok: boolean, text: string) => setMsg({ ok, text });

  async function patch(body: Record<string, unknown>, okText: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Не удалось сохранить");
      adopt(d.order);
      flash(true, okText);
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    const res = await fetch(`/api/admin/orders/${id}/share`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return flash(false, d?.error || "Не удалось получить ссылку");
    try {
      await navigator.clipboard.writeText(d.url);
      flash(true, `Ссылка для клиента скопирована: ${d.url}`);
    } catch {
      flash(true, `Ссылка для клиента: ${d.url}`);
    }
  }

  if (missing) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
        Заказ-наряд не найден или недоступен. <Link href="/admin/orders" className="text-accent hover:underline">К списку</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Загрузка…
      </p>
    );
  }

  const next = NEXT[order.status];
  const canNext = next && (manager || WO_MECHANIC_STATUSES.includes(next.to));
  const dirty =
    draft.complaint !== order.complaint ||
    draft.note !== order.note ||
    draft.mileage !== (order.mileage !== undefined ? String(order.mileage) : "") ||
    draft.mechanicId !== (order.mechanicId ?? "") ||
    draft.vehicleId !== (order.vehicleId ?? "");
  const mechanics = staff.filter((s) => s.role === "mechanic");
  const locked = order.locked;
  const t = order.totals;

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Заказ-наряды
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-extrabold text-graphite">{woNumber(order.number)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <WoStatusChip status={order.status} /> открыт {fmtDate(order.openedAt)}
            {order.closedAt && <> · выдан {fmtDate(order.closedAt)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manager && (
            <a href={`/admin/print/orders/${id}`} target="_blank" rel="noopener noreferrer" className="btn-outline-light min-h-[40px] py-2">
              <Printer className="h-4 w-4" aria-hidden /> Печать
            </a>
          )}
          {manager && (
            <button onClick={share} className="btn-outline-light min-h-[40px] py-2">
              <Link2 className="h-4 w-4" aria-hidden /> Ссылка клиенту
            </button>
          )}
          {canNext && (
            <button onClick={() => patch({ status: next!.to }, `Статус: ${WO_STATUS_LABEL[next!.to]}`)} disabled={saving} className="btn-primary min-h-[40px] py-2">
              {next!.label}
            </button>
          )}
          {manager && (
            <select
              aria-label="Статус"
              className={`${crmInput} w-auto`}
              value={order.status}
              onChange={(e) => patch({ status: e.target.value }, `Статус: ${WO_STATUS_LABEL[e.target.value as WorkOrderStatus]}`)}
            >
              {WO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {WO_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {locked && (
        <p className="flex items-center gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-sm text-muted">
          <Lock className="h-4 w-4" aria-hidden />
          Наряд {order.status === "closed" ? "выдан" : "отменён"} — это документ, правки закрыты.
          {manager && " Чтобы исправить, верните статус."}
        </p>
      )}
      {msg && (
        <p className={`break-all rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-600"}`}>{msg.text}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <User className="h-4 w-4" aria-hidden /> Клиент
          </div>
          <div className="mt-2 text-base font-semibold text-graphite">
            {manager ? (
              <Link href={`/admin/clients/${order.clientId}`} className="hover:text-accent">
                {order.client.name}
              </Link>
            ) : (
              order.client.name
            )}
          </div>
          {order.client.phone && (
            <a href={`tel:${order.client.phone}`} className="mt-0.5 block text-sm text-muted hover:text-accent">
              {order.client.phone}
            </a>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Car className="h-4 w-4" aria-hidden /> Автомобиль
          </div>
          {manager && !locked && vehicles.length > 0 ? (
            <select className={`${crmInput} mt-2`} value={draft.vehicleId} onChange={(e) => setDraft({ ...draft, vehicleId: e.target.value })}>
              <option value="">— не указан —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 text-base font-semibold text-graphite">
              {order.vehicle ? [order.vehicle.make, order.vehicle.model, order.vehicle.year].filter(Boolean).join(" ") : "Не указан"}
            </div>
          )}
          <div className="mt-1 space-y-0.5 text-sm text-muted">
            {order.vehicle?.plate && <div>Госномер: {plateDisplay(order.vehicle.plate)}</div>}
            {order.vehicle?.vin && <div className="font-mono text-xs">VIN {order.vehicle.vin}</div>}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Wrench className="h-4 w-4" aria-hidden /> Механик
          </div>
          {manager && !locked ? (
            <select className={`${crmInput} mt-2`} value={draft.mechanicId} onChange={(e) => setDraft({ ...draft, mechanicId: e.target.value })}>
              <option value="">— не назначен —</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-2 text-base font-semibold text-graphite">{order.mechanicName ?? "Не назначен"}</div>
          )}
          {order.appointmentId && (
            <Link href="/admin/calendar" className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Открыт по записи из календаря
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <label className="block">
            <Label>Пробег при приёмке, км</Label>
            {manager && !locked ? (
              <input className={crmInput} inputMode="numeric" value={draft.mileage} onChange={(e) => setDraft({ ...draft, mileage: e.target.value })} />
            ) : (
              <div className="py-2 text-sm font-medium text-graphite">{formatMileage(order.mileage) || "—"}</div>
            )}
          </label>
          <label className="block">
            <Label>Жалоба / что нужно сделать</Label>
            {manager && !locked ? (
              <textarea className={crmInput} rows={2} value={draft.complaint} onChange={(e) => setDraft({ ...draft, complaint: e.target.value })} />
            ) : (
              <div className="whitespace-pre-line py-2 text-sm text-graphite">{order.complaint || "—"}</div>
            )}
          </label>
        </div>
        {manager && (
          <label className="mt-4 block">
            <Label>Заметка (внутренняя, клиенту не видна)</Label>
            <textarea
              className={crmInput}
              rows={2}
              value={draft.note}
              disabled={locked}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>
        )}
        {manager && !locked && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() =>
                patch(
                  {
                    complaint: draft.complaint,
                    note: draft.note,
                    mileage: draft.mileage.replace(/\s/g, ""),
                    mechanicId: draft.mechanicId || null,
                    vehicleId: draft.vehicleId || null,
                  },
                  "Сохранено"
                )
              }
              disabled={saving || !dirty}
              className="btn-primary disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Сохранить
            </button>
          </div>
        )}
      </div>

      <Section icon={Wrench} title="Работы">
        <OrderLines orderId={id} kind="work" lines={order.lines} manager={manager} locked={locked} onChange={reload} onError={(m) => flash(false, m)} />
      </Section>

      <Section icon={Package} title="Запчасти и материалы">
        <OrderLines orderId={id} kind="part" lines={order.lines} manager={manager} locked={locked} onChange={reload} onError={(m) => flash(false, m)} />
      </Section>

      {manager && t && (
        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted">Работы</dt>
            <dd className="text-right text-graphite">{rub(t.works)}</dd>
            <dt className="text-muted">Запчасти и материалы</dt>
            <dd className="text-right text-graphite">{rub(t.parts)}</dd>
            <dt className="self-center text-muted">Скидка, ₽</dt>
            <dd className="text-right">
              {locked ? (
                <span className="text-graphite">{t.discount ? `− ${rub(t.discount)}` : "—"}</span>
              ) : (
                <input
                  className="w-28 rounded-md border border-line px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={discount}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(e) => setDiscount(e.target.value)}
                  onBlur={() => (parseRub(discount) ?? 0) !== (order.discount ?? 0) && patch({ discount: discount || "0" }, "Скидка сохранена")}
                />
              )}
            </dd>
            <dt className="border-t border-line pt-2 font-bold text-graphite">Итого к оплате</dt>
            <dd className="border-t border-line pt-2 text-right text-lg font-extrabold text-graphite">{rub(t.total)}</dd>
          </dl>
          {t.unpriced > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Позиций без цены: {t.unpriced}. Наряд нельзя выдать, пока у всех позиций сервиса нет цены.
            </p>
          )}
        </div>
      )}

      <Section
        icon={FileText}
        title="Отчёт механика"
        aside={
          !locked && report !== order.report ? (
            <button onClick={() => patch({ report }, "Отчёт сохранён")} disabled={saving} className="btn-primary min-h-[34px] px-3 py-1.5">
              <Save className="h-4 w-4" aria-hidden /> Сохранить
            </button>
          ) : null
        }
      >
        {locked ? (
          <div className="whitespace-pre-line text-sm text-graphite">{order.report || "—"}</div>
        ) : (
          <textarea
            className={crmInput}
            rows={4}
            value={report}
            placeholder="Что сделано, что выявлено при осмотре, на что обратить внимание"
            onChange={(e) => setReport(e.target.value)}
          />
        )}
      </Section>

      <Section icon={Lightbulb} title="Рекомендации клиенту">
        <OrderRecommendations
          orderId={id}
          carried={order.carried}
          own={order.recommendations}
          manager={manager}
          locked={locked}
          onChange={reload}
          onError={(m) => flash(false, m)}
        />
      </Section>
    </div>
  );
}
