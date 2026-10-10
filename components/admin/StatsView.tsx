"use client";

import { useEffect, useState } from "react";
import { Loader2, Inbox, CalendarCheck, TrendingUp, Users } from "lucide-react";

type Stats = {
  totalLeads: number;
  newLeads: number;
  leadStatus: { new: number; seen: number; processed: number; archived: number };
  apptStatus: { scheduled: number; in_progress: number; done: number; cancelled: number };
  byDay: { date: string; count: number }[];
  perMechanic: { id: string; name: string; total: number; done: number; active: number }[];
  upcoming: number;
  doneTotal: number;
  conversion: number;
  staffCount: number;
};

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="mt-3 text-3xl font-extrabold text-graphite">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-graphite">{label}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function StatsView() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => d.ok && setStats(d.stats));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.byDay.map((d) => d.count));

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-graphite">Статистика</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Inbox} label="Всего запросов" value={stats.totalLeads} hint={`новых: ${stats.newLeads}`} />
        <Metric icon={TrendingUp} label="Конверсия в запись" value={`${stats.conversion}%`} hint="обработано от всех" />
        <Metric icon={CalendarCheck} label="Предстоящие записи" value={stats.upcoming} hint={`выполнено: ${stats.doneTotal}`} />
        <Metric icon={Users} label="Сотрудников" value={stats.staffCount} hint="активных" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Заявки по дням */}
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-graphite">Заявки за 7 дней</h2>
          <div className="mt-4 flex items-end gap-2" style={{ height: 140 }}>
            {stats.byDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-accent"
                    style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 0 }}
                    title={`${d.count}`}
                  />
                </div>
                <span className="text-[10px] text-muted">
                  {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                </span>
                <span className="text-xs font-semibold text-graphite">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Статусы */}
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-graphite">Разбивка</h2>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Запросы</div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Chip label="Новые" value={stats.leadStatus.new} cls="bg-accent/10 text-accent" />
                <Chip label="Просмотрены" value={stats.leadStatus.seen} cls="bg-amber-100 text-amber-700" />
                <Chip label="Обработаны" value={stats.leadStatus.processed} cls="bg-green-100 text-green-700" />
                <Chip label="Архив" value={stats.leadStatus.archived} cls="bg-gray-100 text-gray-500" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Записи</div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Chip label="Запланированы" value={stats.apptStatus.scheduled} cls="bg-accent/10 text-accent" />
                <Chip label="В работе" value={stats.apptStatus.in_progress} cls="bg-amber-100 text-amber-700" />
                <Chip label="Выполнены" value={stats.apptStatus.done} cls="bg-green-100 text-green-700" />
                <Chip label="Отменены" value={stats.apptStatus.cancelled} cls="bg-gray-100 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Механики */}
      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-bold text-graphite">Загрузка механиков</h2>
        {stats.perMechanic.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Механики не добавлены.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 font-medium">Механик</th>
                  <th className="py-2 text-right font-medium">Всего</th>
                  <th className="py-2 text-right font-medium">В работе</th>
                  <th className="py-2 text-right font-medium">Выполнено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.perMechanic.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 font-medium text-graphite">{m.name}</td>
                    <td className="py-2.5 text-right">{m.total}</td>
                    <td className="py-2.5 text-right text-accent">{m.active}</td>
                    <td className="py-2.5 text-right text-green-600">{m.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${cls}`}>
      {label} <b>{value}</b>
    </span>
  );
}
