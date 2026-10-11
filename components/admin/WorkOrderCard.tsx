"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, User, Car, Wrench, CalendarDays } from "lucide-react";
import {
  WO_MECHANIC_STATUSES,
  WO_STATUSES,
  WO_STATUS_LABEL,
  type Role,
  type Vehicle,
  type WorkOrderStatus,
  type WorkOrderView,
} from "@/lib/crm-types";
import { formatMileage, plateDisplay, vehicleLabel, woNumber } from "@/lib/format";
import { WoStatusChip, fmtDate, Label, crmInput } from "@/components/admin/ui";
import type { StaffLite } from "@/components/admin/AppointmentModal";

/** Следующий шаг по статусу — главная кнопка карточки. */
const NEXT: Partial<Record<WorkOrderStatus, { to: WorkOrderStatus; label: string }>> = {
  open: { to: "in_progress", label: "Взять в работу" },
  in_progress: { to: "ready", label: "Готово" },
  ready: { to: "closed", label: "Выдать клиенту" },
};

/** Карточка заказ-наряда. Механик — свой наряд, без телефона, только статусы «в работе/готов». */
export function WorkOrderCard({ id, role }: { id: string; role: Role }) {
  const manager = role === "admin" || role === "receiver";
  const [order, setOrder] = useState<WorkOrderView | null>(null);
  const [missing, setMissing] = useState(false);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [draft, setDraft] = useState({ complaint: "", mileage: "", note: "", mechanicId: "", vehicleId: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function adopt(o: WorkOrderView) {
    setOrder(o);
    setDraft({
      complaint: o.complaint,
      mileage: o.mileage !== undefined ? String(o.mileage) : "",
      note: o.note,
      mechanicId: o.mechanicId ?? "",
      vehicleId: o.vehicleId ?? "",
    });
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
      setMsg({ ok: true, text: okText });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setSaving(false);
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
          {canNext && (
            <button onClick={() => patch({ status: next!.to }, `Статус: ${WO_STATUS_LABEL[next!.to]}`)} disabled={saving} className="btn-primary">
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

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-lime-50 text-lime-800" : "bg-red-50 text-red-600"}`}>{msg.text}</p>
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
          {manager && vehicles.length > 0 ? (
            <select
              className={`${crmInput} mt-2`}
              value={draft.vehicleId}
              onChange={(e) => setDraft({ ...draft, vehicleId: e.target.value })}
            >
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
          {manager ? (
            <select
              className={`${crmInput} mt-2`}
              value={draft.mechanicId}
              onChange={(e) => setDraft({ ...draft, mechanicId: e.target.value })}
            >
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
            {manager ? (
              <input
                className={crmInput}
                inputMode="numeric"
                value={draft.mileage}
                onChange={(e) => setDraft({ ...draft, mileage: e.target.value })}
              />
            ) : (
              <div className="py-2 text-sm font-medium text-graphite">{formatMileage(order.mileage) || "—"}</div>
            )}
          </label>
          <label className="block">
            <Label>Жалоба / что нужно сделать</Label>
            {manager ? (
              <textarea
                className={crmInput}
                rows={3}
                value={draft.complaint}
                onChange={(e) => setDraft({ ...draft, complaint: e.target.value })}
              />
            ) : (
              <div className="whitespace-pre-line py-2 text-sm text-graphite">{order.complaint || "—"}</div>
            )}
          </label>
        </div>
        {manager && (
          <label className="mt-4 block">
            <Label>Заметка (внутренняя)</Label>
            <textarea className={crmInput} rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>
        )}
        {manager && (
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

      <div className="rounded-xl border border-dashed border-line bg-white px-5 py-4 text-sm text-muted">
        Работы, запчасти, отчёт механика и рекомендации клиенту — следующий этап.
      </div>
    </div>
  );
}
