"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, ClipboardPlus, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { Appointment, Client, Recommendation, Vehicle, WorkOrderView } from "@/lib/crm-types";
import { PriorityChip } from "@/components/admin/OrderRecommendations";
import { formatMileage, isValidVin, plateDisplay, rub, vehicleLabel, woNumber } from "@/lib/format";
import { Modal, WoStatusChip, fmtDate, Label, crmInput } from "@/components/admin/ui";
import { IntakeDialog } from "@/components/admin/IntakeDialog";
import { ClientAccess } from "@/components/admin/ClientAccess";
import type { StaffLite } from "@/components/admin/AppointmentModal";

type Card = {
  client: Client;
  vehicles: Vehicle[];
  orders: WorkOrderView[];
  appointments: Appointment[];
  recommendations: Recommendation[];
};

const APPT_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Запланирована",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

/** Карточка клиента: контакты, машины, история заказ-нарядов и записей. */
export function ClientCard({ id }: { id: string }) {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [vehicleModal, setVehicleModal] = useState<Vehicle | "new" | null>(null);
  const [intake, setIntake] = useState(false);
  const [staff, setStaff] = useState<StaffLite[]>([]);

  async function load() {
    const d = await (await fetch(`/api/admin/clients/${id}`)).json();
    if (!d.ok) return setMissing(true);
    setCard(d);
    setForm({ name: d.client.name, phone: d.client.phone, email: d.client.email, note: d.client.note });
  }
  useEffect(() => {
    load();
    fetch("/api/admin/staff").then((r) => r.json()).then((d) => d.ok && setStaff(d.staff));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Сохранено" });
      load();
    } else setMsg({ ok: false, text: d.error || "Не удалось сохранить" });
  }

  async function remove() {
    if (!confirm("Удалить клиента и его машины?")) return;
    const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) router.push("/admin/clients");
    else setMsg({ ok: false, text: d.error || "Не удалось удалить" });
  }

  if (missing) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
        Клиент не найден. <Link href="/admin/clients" className="text-accent hover:underline">К списку</Link>
      </div>
    );
  }
  if (!card) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Загрузка…
      </p>
    );
  }

  const c = card.client;
  const dirty = form.name !== c.name || form.phone !== c.phone || form.email !== c.email || form.note !== c.note;

  return (
    <div className="space-y-5">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Клиенты
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-graphite">{c.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Клиент с {fmtDate(c.createdAt, false)} · визитов: {card.orders.length}
          </p>
        </div>
        <button onClick={() => setIntake(true)} className="btn-primary">
          <ClipboardPlus className="h-4 w-4" aria-hidden /> Новый заказ-наряд
        </button>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-lime-50 text-lime-800" : "bg-red-50 text-red-600"}`}>{msg.text}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Контакты */}
        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Контакты</h2>
          <div className="space-y-3">
            <label className="block">
              <Label required>Имя</Label>
              <input className={crmInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <Label>Телефон</Label>
              <input className={crmInput} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block">
              <Label>E-mail</Label>
              <input className={crmInput} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <Label>Заметка</Label>
              <textarea className={crmInput} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:underline">
              <Trash2 className="h-4 w-4" aria-hidden /> Удалить
            </button>
            <button onClick={save} disabled={saving || !dirty} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Сохранить
            </button>
          </div>
        </div>

        {/* Машины */}
        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Автомобили</h2>
            <button onClick={() => setVehicleModal("new")} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              <Plus className="h-4 w-4" aria-hidden /> Добавить
            </button>
          </div>
          {card.vehicles.length === 0 ? (
            <p className="text-sm text-muted">Машин пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {card.vehicles.map((v) => (
                <li key={v.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                  <Car className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold text-graphite">
                      {[v.make, v.model, v.year].filter(Boolean).join(" ") || "Без названия"}
                    </div>
                    <div className="mt-0.5 space-x-3 text-xs text-muted">
                      {v.plate && <span>{plateDisplay(v.plate)}</span>}
                      {v.mileage !== undefined && <span>{formatMileage(v.mileage)}</span>}
                      {v.vin && <span className="font-mono">VIN {v.vin}</span>}
                    </div>
                  </div>
                  <button onClick={() => setVehicleModal(v)} aria-label="Изменить" className="text-muted hover:text-accent">
                    <Pencil className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {card.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Открытые рекомендации</h2>
          <ul className="space-y-2">
            {card.recommendations.map((r) => {
              const v = card.vehicles.find((x) => x.id === r.vehicleId);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <PriorityChip p={r.priority} />
                  <span className="text-graphite">{r.text}</span>
                  <span className="text-xs text-muted">
                    {[v && vehicleLabel(v), r.orderNumber && woNumber(r.orderNumber), r.estimate !== undefined && `ориентир ${rub(r.estimate)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Отметить выполненной можно в заказ-наряде при следующем визите.</p>
        </div>
      )}

      <ClientAccess clientId={id} />

      {/* История */}
      <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Заказ-наряды</h2>
        {card.orders.length === 0 ? (
          <p className="text-sm text-muted">Пока не было.</p>
        ) : (
          <ul className="divide-y divide-line">
            {card.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm hover:text-accent">
                  <span className="w-24 font-mono font-semibold">{woNumber(o.number)}</span>
                  <span className="w-32 text-xs text-muted">{fmtDate(o.openedAt, false)}</span>
                  <span className="min-w-0 flex-1 truncate">{vehicleLabel(o.vehicle) || "—"}</span>
                  <span className="min-w-0 max-w-xs truncate text-xs text-muted">{o.complaint}</span>
                  <WoStatusChip status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {card.appointments.length > 0 && (
          <>
            <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-muted">Записи</h2>
            <ul className="divide-y divide-line text-sm">
              {card.appointments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 py-2">
                  <span className="w-32 text-xs text-muted">{fmtDate(a.start)}</span>
                  <span className="min-w-0 flex-1 truncate">{a.service || a.car || "—"}</span>
                  <span className="text-xs text-muted">{APPT_LABEL[a.status]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {vehicleModal && (
        <VehicleModal
          clientId={id}
          vehicle={vehicleModal === "new" ? null : vehicleModal}
          onClose={() => setVehicleModal(null)}
          onSaved={() => {
            setVehicleModal(null);
            load();
          }}
        />
      )}
      {intake && (
        <IntakeDialog presetClientId={id} staff={staff} onClose={() => setIntake(false)} onDone={(o) => router.push(`/admin/orders/${o.id}`)} />
      )}
    </div>
  );
}

function VehicleModal({
  clientId,
  vehicle,
  onClose,
  onSaved,
}: {
  clientId: string;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ? String(vehicle.year) : "",
    plate: vehicle?.plate ? plateDisplay(vehicle.plate) : "",
    vin: vehicle?.vin ?? "",
    mileage: vehicle?.mileage !== undefined ? String(vehicle.mileage) : "",
    note: vehicle?.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch(vehicle ? `/api/admin/vehicles/${vehicle.id}` : `/api/admin/clients/${clientId}/vehicles`, {
      method: vehicle ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, year: f.year || null, mileage: f.mileage.replace(/\s/g, "") }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) onSaved();
    else setError(d.error || "Не удалось сохранить");
  }

  async function remove() {
    if (!vehicle || !confirm("Удалить автомобиль?")) return;
    const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) onSaved();
    else setError(d.error || "Не удалось удалить");
  }

  const vinWarn = f.vin && !isValidVin(f.vin.toUpperCase().replace(/\s/g, ""));

  return (
    <Modal
      title={vehicle ? "Автомобиль" : "Новый автомобиль"}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between">
          {vehicle ? (
            <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:underline">
              <Trash2 className="h-4 w-4" aria-hidden /> Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline-light">
              Отмена
            </button>
            <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-70">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Сохранить
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <Label>Марка</Label>
          <input className={crmInput} value={f.make} onChange={(e) => setF({ ...f, make: e.target.value })} />
        </label>
        <label className="block">
          <Label>Модель</Label>
          <input className={crmInput} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
        </label>
        <label className="block">
          <Label>Год</Label>
          <input className={crmInput} inputMode="numeric" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} />
        </label>
        <label className="block">
          <Label>Госномер</Label>
          <input className={crmInput} value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} placeholder="А123ВС 77" />
        </label>
        <label className="block">
          <Label>Пробег, км</Label>
          <input className={crmInput} inputMode="numeric" value={f.mileage} onChange={(e) => setF({ ...f, mileage: e.target.value })} />
        </label>
        <label className="block sm:col-span-3">
          <Label>VIN</Label>
          <input className={crmInput} value={f.vin} onChange={(e) => setF({ ...f, vin: e.target.value.toUpperCase() })} />
          {vinWarn && <span className="mt-1 block text-xs text-amber-700">Не похоже на 17-значный VIN — проверьте (для старых машин это нормально).</span>}
        </label>
        <label className="block sm:col-span-3">
          <Label>Заметка</Label>
          <input className={crmInput} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-3">{error}</p>}
      </div>
    </Modal>
  );
}
