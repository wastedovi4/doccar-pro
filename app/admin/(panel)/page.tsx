import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, CalendarDays, Wrench, ArrowRight } from "lucide-react";
import { getSession, can } from "@/lib/auth";
import { countNewLeads, countTodayAppointments } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  // Layout и page рендерятся параллельно — гард layout не защищает page.
  const user = await getSession();
  if (!user) redirect("/admin/login");
  const newLeads = countNewLeads();
  const todayAppts = countTodayAppointments(user.role === "mechanic" ? user.id : undefined);

  const cards: { href: string; icon: typeof Inbox; label: string; value: number | string; hint: string; show: boolean }[] = [
    {
      href: "/admin/requests",
      icon: Inbox,
      label: "Новые запросы",
      value: newLeads,
      hint: "не обработаны",
      show: can(user.role, "admin", "receiver"),
    },
    {
      href: "/admin/calendar",
      icon: user.role === "mechanic" ? Wrench : CalendarDays,
      label: user.role === "mechanic" ? "Мои работы сегодня" : "Записи на сегодня",
      value: todayAppts,
      hint: "в календаре",
      show: true,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-graphite">Здравствуйте, {user.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {user.role === "admin" && "Полный доступ: сайт, сотрудники, запросы, календарь, статистика."}
        {user.role === "receiver" && "Обрабатывайте запросы клиентов и планируйте записи в календаре."}
        {user.role === "mechanic" && "Ваши назначенные работы — в календаре."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        {cards
          .filter((c) => c.show)
          .map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group rounded-xl border border-line bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
                </div>
                <div className="mt-4 text-3xl font-extrabold text-graphite">{c.value}</div>
                <div className="mt-1 text-sm font-medium text-graphite">{c.label}</div>
                <div className="text-xs text-muted">{c.hint}</div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
