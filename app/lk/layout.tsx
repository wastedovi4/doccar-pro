import type { Metadata } from "next";

// Личный кабинет — приватные данные: не индексировать.
export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function LkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
