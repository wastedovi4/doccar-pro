import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Exo_2 } from "next/font/google";
import "./globals.css";
import { getContent } from "@/lib/content";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

// Заголовки
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-display",
});

// Вордмарк DOCCAR.PRO (только латиница)
const exo = Exo_2({
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  variable: "--font-brand",
});

export async function generateMetadata(): Promise<Metadata> {
  const { seo, business } = await getContent();
  return {
    metadataBase: new URL(seo.url),
    title: {
      default: seo.title,
      template: `%s — ${business.name}`,
    },
    description: seo.description,
    applicationName: business.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: seo.url,
      siteName: business.name,
      title: seo.title,
      description: seo.description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: business.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og-image.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      shortcut: "/favicon.svg",
      apple: "/apple-touch-icon.png",
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#101318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${montserrat.variable} ${exo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
