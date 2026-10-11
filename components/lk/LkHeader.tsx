"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";

/** Шапка кабинета: логотип, подпись, выход. */
export function LkHeader({ city, signedIn }: { city: string; signedIn: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/lk/logout", { method: "POST" });
    router.replace("/lk");
    router.refresh();
  }
  return (
    <header className="border-b border-white/[0.06] print:hidden">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <a href="/" aria-label="На сайт" className="shrink-0">
          <Logo tagline={`Автосервис ${city}`} />
        </a>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-frost/60 sm:inline">Личный кабинет</span>
          {signedIn && (
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm text-frost/70 hover:text-accent">
              <LogOut className="h-4 w-4" aria-hidden /> Выйти
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
