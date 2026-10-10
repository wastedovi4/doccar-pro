"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import type { Appointment, ApptStatus } from "@/lib/crm";
import type { Content } from "@/lib/content-model";

export type StaffLite = { id: string; name: string; role: string };

const STATUS_LABEL: Record<ApptStatus, string> = {
  scheduled: "Запланирована",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentModal({
  open,
  onClose,
  onSaved,
  staff,
  initial,
  leadId,
  prefill,
  defaultDate,
  defaultTime,
  defaultMechanicId,
  restricted = false,
  workHours,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  staff: StaffLite[];
  initial?: Appointment | null;
  leadId?: string;
  prefill?: { clientName?: string; phone?: string; car?: string; service?: string };
  defaultDate?: string; // yyyy-mm-dd
  defaultTime?: string; // HH:mm
  defaultMechanicId?: string;
  restricted?: boolean; // механик: можно менять только статус
  workHours?: Content["workHours"];
}) {
  const isEdit = !!initial?.id;
  const mechanics = staff.filter((s) => s.role === "mechanic");

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [car, setCar] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(60);
  const [mechanicId, setMechanicId] = useState("");
  const [status, setStatus] = useState<ApptStatus>("scheduled");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [offHours, setOffHours] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setConflict("");
    setOffHours("");
    if (initial) {
      setClientName(initial.clientName);
      setPhone(initial.phone);
      setCar(initial.car);
      setService(initial.service);
      setDate(toDateInput(initial.start));
      setTime(toTimeInput(initial.start));
      setDurationMin(initial.durationMin);
      setMechanicId(initial.mechanicId ?? "");
      setStatus(initial.status);
      setNote(initial.note ?? "");
    } else {
      setClientName(prefill?.clientName ?? "");
      setPhone(prefill?.phone ?? "");
      setCar(prefill?.car ?? "");
      setService(prefill?.service ?? "");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setTime(defaultTime ?? "10:00");
      setDurationMin(60);
      setMechanicId(defaultMechanicId ?? "");
      setStatus("scheduled");
      setNote("");
    }
  }, [open, initial, prefill, defaultDate, defaultTime, defaultMechanicId]);

  if (!open) return null;

  function offHoursMessage(): string {
    if (!workHours?.enforce || !date || !time) return "";
    const hour = Number(time.split(":")[0]);
    const dayIdx = (new Date(`${date}T${time}`).getDay() + 6) % 7;
    const dayOff = !workHours.days[dayIdx];
    const timeOff = hour < workHours.start || hour >= workHours.end;
    if (!dayOff && !timeOff) return "";
    const wd = ["понедельник", "вторник", "среду", "четверг", "пятницу", "субботу", "воскресенье"][dayIdx];
    if (dayOff) return `Выбран нерабочий день (${wd}).`;
    return `Время ${time} вне рабочих часов (${pad(workHours.start)}:00–${pad(workHours.end)}:00).`;
  }

  async function submit(force = false, skipHours = false) {
    if (!clientName.trim()) {
      setError("Укажите имя клиента");
      return;
    }
    if (!date || !time) {
      setError("Укажите дату и время");
      return;
    }
    if (!skipHours) {
      const oh = offHoursMessage();
      if (oh) {
        setOffHours(oh);
        return;
      }
    }
    setSaving(true);
    setError("");
    if (!force) setConflict("");
    setOffHours("");
    const start = new Date(`${date}T${time}`).toISOString();
    const payload: Record<string, unknown> = {
      clientName,
      phone,
      car,
      service,
      start,
      durationMin,
      mechanicId: mechanicId || undefined,
      status,
      note,
      force,
    };
    if (isEdit) payload.id = initial!.id;
    if (leadId) payload.leadId = leadId;

    try {
      const res = await fetch("/api/admin/appointments", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setConflict(data?.error || "Пересечение записей у механика.");
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError("Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!confirm("Удалить запись?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/appointments?id=${initial!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onSaved();
      onClose();
    } catch {
      setError("Не удалось удалить");
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-graphite">
            {isEdit ? "Запись" : "Новая запись"}
          </h3>
          <button onClick={onClose} aria-label="Закрыть" className="text-muted hover:text-graphite">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {restricted && (
            <p className="rounded-lg bg-mist px-3 py-2 text-xs text-muted">
              Вы можете менять только статус этой записи.
            </p>
          )}
          <fieldset disabled={restricted} className="space-y-3 border-0 p-0 disabled:opacity-60">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Клиент *</span>
                <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Телефон</span>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Авто</span>
                <input className={inputCls} value={car} onChange={(e) => setCar(e.target.value)} placeholder="BMW X5" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Работа</span>
                <input className={inputCls} value={service} onChange={(e) => setService(e.target.value)} placeholder="Диагностика" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Дата *</span>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Время *</span>
                <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Длит., мин</span>
                <input
                  type="number"
                  min={15}
                  max={600}
                  step={15}
                  className={inputCls}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Механик</span>
              <select className={inputCls} value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
                <option value="">— не назначен —</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Статус</span>
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as ApptStatus)}
            >
              {(Object.keys(STATUS_LABEL) as ApptStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Заметка</span>
            <textarea
              className={inputCls}
              rows={2}
              value={note}
              disabled={restricted}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {offHours && !conflict && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <div className="font-medium">Вне рабочего времени</div>
              <div className="mt-0.5">{offHours}</div>
              <button
                onClick={() => submit(false, true)}
                disabled={saving}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Всё равно записать
              </button>
            </div>
          )}

          {conflict && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <div className="font-medium">Пересечение по времени</div>
              <div className="mt-0.5">{conflict}</div>
              <button
                onClick={() => submit(true, true)}
                disabled={saving}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Всё равно сохранить
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          {isEdit && !restricted ? (
            <button
              onClick={remove}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline-light">
              Отмена
            </button>
            <button onClick={() => submit()} disabled={saving} className="btn-primary disabled:opacity-70">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
