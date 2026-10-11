"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, ClipboardList, Check } from "lucide-react";
import type { Role, WorkOrderView } from "@/lib/crm-types";
import { parseRub, rub, rubInput, vehicleLabel, woNumber } from "@/lib/format";
import { WoStatusChip, fmtDate } from "@/components/admin/ui";
import { IntakeDialog } from "@/components/admin/IntakeDialog";
import type { StaffLite } from "@/components/admin/AppointmentModal";

type Scope = "active" | "closed" | "all";
const SCOPES: { key: Scope; label: string }[] = [
  { key: "active", label: "В работе" },
  { key: "closed", label: "Закрытые" },
  { key: "all", label: "Все" },
];

/** Список заказ-нарядов. Механик видит только свои. */
export function OrdersBoard({ role }: { role: Role }) {
  const router = useRouter();
  const manager = role === "admin" || role === "receiver";
  const [scope, setScope] = useState<Scope>("active");
  const [orders, setOrders] = useState<WorkOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [intake, setIntake] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/orders?scope=${scope}`)
      .then((r) => r.json())
      .then((d) => alive && d.ok && setOrders(d.orders))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    if (manager) fetch("/api/admin/staff").then((r) => r.json()).then((d) => d.ok && setStaff(d.staff));
  }, [manager]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-graphite">Заказ-наряды</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={`rounded-md px-3 py-1.5 font-medium ${scope === s.key ? "bg-accent text-on-accent" : "text-muted"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {manager && (
            <button onClick={() => setIntake(true)} className="btn-primary min-h-[38px] py-2">
              <Plus className="h-4 w-4" aria-hidden /> Заказ-наряд
            </button>
          )}
        </div>
      </div>

      {manager && <LaborRate canEdit={role === "admin"} />}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Загрузка…
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
          <ClipboardList className="mx-auto mb-2 h-6 w-6" aria-hidden />
          {scope === "active" ? "Открытых заказ-нарядов нет." : "Заказ-нарядов нет."}
          {manager && " Наряд открывается из записи в календаре («Клиент приехал») или кнопкой «Заказ-наряд»."}
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-accent/50"
              >
                <span className="w-24 shrink-0 font-mono text-sm font-semibold text-graphite">{woNumber(o.number)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-graphite">{o.client.name}</span>
                  <span className="block truncate text-xs text-muted">{vehicleLabel(o.vehicle) || "Автомобиль не указан"}</span>
                </span>
                <span className="text-xs text-muted">{o.mechanicName ?? "механик не назначен"}</span>
                <span className="w-32 text-xs text-muted">{fmtDate(o.openedAt)}</span>
                <WoStatusChip status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {intake && (
        <IntakeDialog staff={staff} onClose={() => setIntake(false)} onDone={(o) => router.push(`/admin/orders/${o.id}`)} />
      )}
    </div>
  );
}

/** Стоимость нормо-часа: подставляется в цену новых работ. Меняет владелец. */
function LaborRate({ canEdit }: { canEdit: boolean }) {
  const [rate, setRate] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setRate(d.laborRate);
        setValue(rubInput(d.laborRate));
      });
  }, []);

  async function save() {
    if ((parseRub(value) ?? null) === rate) return;
    const d = await (
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laborRate: value }),
      })
    ).json();
    if (d.ok) {
      setRate(d.laborRate);
      setValue(rubInput(d.laborRate));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm">
      <span className="text-muted">Стоимость нормо-часа:</span>
      {canEdit ? (
        <>
          <input
            className="w-28 rounded-md border border-line px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-accent"
            value={value}
            inputMode="decimal"
            placeholder="не задана"
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <span className="text-muted">₽</span>
          {saved && <Check className="h-4 w-4 text-accent" aria-label="Сохранено" />}
        </>
      ) : (
        <span className="font-medium text-graphite">{rate ? rub(rate) : "не задана"}</span>
      )}
      <span className="text-xs text-muted">— подставляется в цену новых работ</span>
    </div>
  );
}
