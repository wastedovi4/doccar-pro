"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserCheck, UserPlus, Search, Car, Plus } from "lucide-react";
import type { Appointment, Client, ClientListItem, Vehicle, WorkOrderView } from "@/lib/crm-types";
import { normalizePhone, plateDisplay, vehicleLabel, formatMileage } from "@/lib/format";
import { Modal, Label, crmInput } from "@/components/admin/ui";
import type { StaffLite } from "@/components/admin/AppointmentModal";

type Found = { client: Client; vehicles: Vehicle[]; orders?: number };
type NewVehicle = { make: string; model: string; year: string; plate: string; vin: string };

/** «Kia Rio 2018» из записи → марка / модель / год для новой машины. */
function guessVehicle(text: string): NewVehicle {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const yearIdx = parts.findIndex((p) => /^(19|20)\d{2}$/.test(p.replace(/[^\d]/g, "")));
  const year = yearIdx >= 0 ? parts.splice(yearIdx, 1)[0].replace(/[^\d]/g, "") : "";
  return { make: parts[0] ?? "", model: parts.slice(1).join(" "), year, plate: "", vin: "" };
}

/**
 * Приёмка автомобиля → заказ-наряд. Из записи календаря («Клиент приехал»),
 * из карточки клиента или с нуля, если клиент пришёл сам.
 */
export function IntakeDialog({
  appointment,
  presetClientId,
  staff,
  onClose,
  onDone,
}: {
  appointment?: Appointment | null;
  presetClientId?: string;
  staff: StaffLite[];
  onClose: () => void;
  onDone: (order: WorkOrderView) => void;
}) {
  const mechanics = staff.filter((s) => s.role === "mechanic");

  // Клиент
  const [phone, setPhone] = useState(appointment?.phone ?? "");
  const [name, setName] = useState(appointment?.clientName ?? "");
  const [found, setFound] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<ClientListItem[]>([]);

  // Автомобиль
  const [vehicleId, setVehicleId] = useState<string>("new");
  const [nv, setNv] = useState<NewVehicle>(() => guessVehicle(appointment?.car ?? ""));

  // Приёмка
  const [mileage, setMileage] = useState("");
  const [complaint, setComplaint] = useState(
    [appointment?.service, appointment?.note].filter(Boolean).join(". ")
  );
  const [mechanicId, setMechanicId] = useState(appointment?.mechanicId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const phoneNorm = useMemo(() => normalizePhone(phone), [phone]);

  function applyFound(f: Found | null) {
    setFound(f);
    if (f) {
      // Машина из записи (по марке/модели), иначе первая из машин клиента; машин нет — «новая».
      const hint = (appointment?.car ?? "").toLowerCase();
      const match = hint ? f.vehicles.find((v) => hint.includes(v.model.toLowerCase()) && v.model) : undefined;
      setVehicleId(match?.id ?? f.vehicles[0]?.id ?? "new");
    } else {
      setVehicleId("new");
    }
  }

  // Клиент из карточки — сразу загрузить.
  useEffect(() => {
    if (!presetClientId) return;
    fetch(`/api/admin/clients/${presetClientId}`)
      .then((r) => r.json())
      .then((d) => d.ok && applyFound({ client: d.client, vehicles: d.vehicles, orders: d.orders.length }));
  }, [presetClientId]);

  // Склейка по телефону: ищем, как только номер похож на настоящий.
  useEffect(() => {
    if (presetClientId) return;
    // Номер совпадает с уже выбранным клиентом (в т.ч. выбранным вручную) — ничего не делать.
    if (found && (found.client.phoneNorm ?? null) === phoneNorm) return;
    // Номер изменили — прежний выбор больше не относится к делу.
    if (found) applyFound(null);
    if (!phoneNorm || phoneNorm.length < 10) return;
    setLooking(true);
    const t = setTimeout(async () => {
      try {
        const d = await (await fetch(`/api/admin/clients/lookup?phone=${encodeURIComponent(phone)}`)).json();
        if (d.ok) applyFound(d.client ? { client: d.client, vehicles: d.vehicles, orders: d.orders } : null);
      } finally {
        setLooking(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      setLooking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNorm, presetClientId]);

  // Ручной поиск (клиент без телефона, по имени или госномеру).
  useEffect(() => {
    if (searchQ.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const d = await (await fetch(`/api/admin/clients?q=${encodeURIComponent(searchQ)}`)).json();
      if (d.ok) setResults(d.clients.slice(0, 8));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ]);

  async function pickClient(id: string) {
    const d = await (await fetch(`/api/admin/clients/${id}`)).json();
    if (d.ok) {
      applyFound({ client: d.client, vehicles: d.vehicles, orders: d.orders.length });
      setPhone(d.client.phone);
      setSearchQ("");
      setResults([]);
    }
  }

  async function submit() {
    setError("");
    if (!found && !name.trim()) return setError("Укажите имя клиента");
    if (!found && !phoneNorm) return setError("Укажите телефон клиента");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment?.id,
          client: found ? { id: found.client.id } : { name, phone },
          vehicle: vehicleId !== "new" ? { id: vehicleId } : { ...nv, year: nv.year ? Number(nv.year) : undefined },
          mileage: mileage.replace(/\s/g, "") || undefined,
          complaint,
          mechanicId: mechanicId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Не удалось открыть заказ-наряд");
      onDone(d.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setSaving(false);
    }
  }

  const selectedVehicle = found?.vehicles.find((v) => v.id === vehicleId);

  return (
    <Modal
      title={appointment ? "Клиент приехал → заказ-наряд" : "Новый заказ-наряд"}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose} className="btn-outline-light">
            Отмена
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-70">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Открыть заказ-наряд
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* 1. Клиент */}
        <section>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">1. Клиент</h4>
          {!presetClientId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <Label required>Телефон</Label>
                <input className={crmInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
              </label>
              {!found && (
                <label className="block">
                  <Label required>Имя</Label>
                  <input className={crmInput} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
              )}
            </div>
          )}

          {looking && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Ищем клиента по номеру…
            </p>
          )}

          {found ? (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
              <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold text-graphite">{found.client.name}</div>
                <div className="text-xs text-muted">
                  {presetClientId ? found.client.phone : "Найден по номеру"} · машин: {found.vehicles.length} · визитов:{" "}
                  {found.orders ?? 0}
                </div>
              </div>
              {!presetClientId && (
                <button
                  type="button"
                  onClick={() => {
                    applyFound(null);
                    setPhone("");
                  }}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Другой клиент
                </button>
              )}
            </div>
          ) : (
            !presetClientId &&
            !looking && (
              <div className="mt-3 rounded-xl border border-dashed border-line p-3">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {phoneNorm && phoneNorm.length >= 10
                    ? "По номеру никого нет — будет создан новый клиент."
                    : "Введите номер — проверим, был ли клиент раньше."}
                </div>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    className={`${crmInput} pl-9`}
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Или найти по имени / госномеру"
                  />
                </div>
                {results.length > 0 && (
                  <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickClient(c.id)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-mist"
                        >
                          <span className="font-medium text-graphite">{c.name}</span>
                          <span className="truncate text-xs text-muted">
                            {[c.phone, ...c.vehicles].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </section>

        {/* 2. Автомобиль */}
        <section>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">2. Автомобиль</h4>
          {found && found.vehicles.length > 0 && (
            <div className="mb-3 space-y-2">
              {found.vehicles.map((v) => (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                    vehicleId === v.id ? "border-accent bg-accent/5" : "border-line"
                  }`}
                >
                  <input type="radio" name="vehicle" checked={vehicleId === v.id} onChange={() => setVehicleId(v.id)} />
                  <Car className="h-4 w-4 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-graphite">{vehicleLabel(v) || "Без названия"}</span>
                    {v.mileage !== undefined && <span className="ml-2 text-xs text-muted">{formatMileage(v.mileage)}</span>}
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                  vehicleId === "new" ? "border-accent bg-accent/5" : "border-line"
                }`}
              >
                <input type="radio" name="vehicle" checked={vehicleId === "new"} onChange={() => setVehicleId("new")} />
                <Plus className="h-4 w-4 text-muted" aria-hidden />
                <span className="font-medium text-graphite">Другой автомобиль</span>
              </label>
            </div>
          )}

          {vehicleId === "new" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <Label>Марка</Label>
                <input className={crmInput} value={nv.make} onChange={(e) => setNv({ ...nv, make: e.target.value })} placeholder="Kia" />
              </label>
              <label className="block">
                <Label>Модель</Label>
                <input className={crmInput} value={nv.model} onChange={(e) => setNv({ ...nv, model: e.target.value })} placeholder="Rio" />
              </label>
              <label className="block">
                <Label>Год</Label>
                <input className={crmInput} value={nv.year} inputMode="numeric" onChange={(e) => setNv({ ...nv, year: e.target.value })} placeholder="2018" />
              </label>
              <label className="block">
                <Label>Госномер</Label>
                <input className={crmInput} value={nv.plate} onChange={(e) => setNv({ ...nv, plate: e.target.value })} placeholder="А123ВС 77" />
              </label>
              <label className="block sm:col-span-2">
                <Label>VIN</Label>
                <input className={crmInput} value={nv.vin} onChange={(e) => setNv({ ...nv, vin: e.target.value.toUpperCase() })} placeholder="17 символов" />
              </label>
            </div>
          )}
        </section>

        {/* 3. Приёмка */}
        <section>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">3. Приёмка</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Label>Пробег, км</Label>
              <input
                className={crmInput}
                value={mileage}
                inputMode="numeric"
                onChange={(e) => setMileage(e.target.value)}
                placeholder={selectedVehicle?.mileage !== undefined ? `было ${formatMileage(selectedVehicle.mileage)}` : "123 456"}
              />
            </label>
            <label className="block">
              <Label>Механик</Label>
              <select className={crmInput} value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
                <option value="">— не назначен —</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <Label>Жалоба / что нужно сделать</Label>
              <textarea className={crmInput} rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
            </label>
          </div>
          {selectedVehicle?.plate && (
            <p className="mt-2 text-xs text-muted">Госномер: {plateDisplay(selectedVehicle.plate)}</p>
          )}
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
