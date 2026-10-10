"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  PencilRuler,
  Users,
  BarChart3,
  DatabaseBackup,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import type { Role } from "@/lib/crm";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { LogoMark } from "@/components/Logo";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Владелец",
  receiver: "Приёмщик",
  mechanic: "Механик",
};

type Item = { href: string; label: string; icon: typeof Inbox; roles: Role[] };

const ITEMS: Item[] = [
  { href: "/admin", label: "Главная", icon: LayoutDashboard, roles: ["admin", "receiver", "mechanic"] },
  { href: "/admin/requests", label: "Запросы", icon: Inbox, roles: ["admin", "receiver"] },
  { href: "/admin/calendar", label: "Календарь", icon: CalendarDays, roles: ["admin", "receiver", "mechanic"] },
  { href: "/admin/site", label: "Сайт", icon: PencilRuler, roles: ["admin"] },
  { href: "/admin/users", label: "Сотрудники", icon: Users, roles: ["admin"] },
  { href: "/admin/stats", label: "Статистика", icon: BarChart3, roles: ["admin"] },
  { href: "/admin/backup", label: "Бэкап", icon: DatabaseBackup, roles: ["admin"] },
];

export function AdminShell({
  user,
  children,
}: {
  user: { id: string; name: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = ITEMS.filter((i) => i.roles.includes(user.role));

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const NavList = () => (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`inline-flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-on-accent"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="theme-light min-h-screen bg-mist text-graphite lg:grid lg:grid-cols-[248px_1fr]">
      {/* Мобильная шапка */}
      <div className="theme-dark flex items-center justify-between border-b border-line bg-night px-4 py-3 text-white lg:hidden">
        <span className="inline-flex items-center gap-2 font-bold">
          <LogoMark className="h-5 w-auto" /> DOCCAR · CRM
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Сайдбар */}
      <aside
        className={`${
          open ? "block" : "hidden"
        } theme-dark border-b border-white/10 bg-night px-4 py-4 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10`}
      >
        <div className="mb-6 hidden lg:block">
          <div className="flex items-center gap-2.5 text-lg font-bold">
            <LogoMark className="h-6 w-auto" />
            <span className="font-brand tracking-wide">DOCCAR<span className="text-lime">.PRO</span></span>
          </div>
          <div className="mt-1 text-xs text-white/50">
            {user.name} · {ROLE_LABEL[user.role]}
          </div>
        </div>

        <NavList />

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm text-white/60 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Открыть сайт
          </a>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm text-white/60 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Выйти
          </button>
        </div>
      </aside>

      {/* Контент */}
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-end">
          <NotificationCenter role={user.role} userId={user.id} />
        </div>
        {children}
      </main>
    </div>
  );
}
