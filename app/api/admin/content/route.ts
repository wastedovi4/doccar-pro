import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, can } from "@/lib/auth";
import {
  getContent,
  saveContent,
  referencedImages,
  DEFAULT_CONTENT,
  type Content,
} from "@/lib/content";
import { safeImageUrl, collectUnusedUploads } from "@/lib/media";
import { ICONS } from "@/lib/icons";

async function requireAdmin() {
  const s = await getSession();
  return s && can(s.role, "admin") ? s : null;
}

export const dynamic = "force-dynamic";

/** Приводит произвольный вход к валидному Content (дефолты для отсутствующих полей). */
function sanitize(input: any): Content {
  const d = DEFAULT_CONTENT;
  const s = (v: unknown, fb: string) => (typeof v === "string" ? v : fb);
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  const icon = (v: unknown, fb: string) => (typeof v === "string" && v in ICONS ? v : fb);
  const num = (v: unknown, fb: number, lim: number) => {
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
    return Number.isFinite(n) && Math.abs(n) <= lim ? n : fb;
  };
  // Только https:// (или пусто) — домен идёт в canonical/OG/sitemap.
  const url = (v: unknown, fb: string) => {
    const x = s(v, fb).trim().replace(/\/+$/, "");
    try {
      return new URL(x).protocol === "https:" ? x : fb;
    } catch {
      return fb;
    }
  };

  const b = input?.business ?? {};
  const h = input?.hero ?? {};
  const a = input?.about ?? {};
  const seo = input?.seo ?? {};

  return {
    business: {
      name: s(b.name, d.business.name),
      phone: s(b.phone, d.business.phone).replace(/[^\d+]/g, ""),
      phoneDisplay: s(b.phoneDisplay, d.business.phoneDisplay),
      email: s(b.email, d.business.email).trim(),
      city: s(b.city, d.business.city),
      region: s(b.region, d.business.region),
      street: s(b.street, d.business.street),
      workingHours: s(b.workingHours, d.business.workingHours),
      openingHoursSpec: s(b.openingHoursSpec, d.business.openingHoursSpec),
      geo: {
        lat: num(b.geo?.lat, d.business.geo.lat, 90),
        lng: num(b.geo?.lng, d.business.geo.lng, 180),
      },
    },
    hero: {
      eyebrow: s(h.eyebrow, d.hero.eyebrow),
      title: s(h.title, d.hero.title),
      titleAccent: s(h.titleAccent, d.hero.titleAccent),
      subtitle: s(h.subtitle, d.hero.subtitle),
      image: "image" in h ? safeImageUrl(h.image) : d.hero.image,
    },
    services: Array.isArray(input?.services)
      ? input.services.map((x: any) => ({
          icon: icon(x?.icon, "wrench"),
          title: s(x?.title, ""),
          text: s(x?.text, ""),
          image: safeImageUrl(x?.image),
        }))
      : d.services,
    about: {
      title: s(a.title, d.about.title),
      text: s(a.text, d.about.text),
      features: Array.isArray(a.features)
        ? a.features.map((x: any) => ({ icon: icon(x?.icon, "badge"), text: s(x?.text, "") }))
        : d.about.features,
    },
    gallery: Array.isArray(input?.gallery)
      ? input.gallery
          .map((p: any) => ({ src: safeImageUrl(p?.src), alt: s(p?.alt, "") }))
          .filter((p: { src: string }) => p.src)
      : d.gallery,
    cta: {
      title: s(input?.cta?.title, d.cta.title),
      text: s(input?.cta?.text, d.cta.text),
    },
    seo: {
      title: s(seo.title, d.seo.title),
      description: s(seo.description, d.seo.description),
      url: url(seo.url, d.seo.url),
    },
    sections: {
      services: bool(input?.sections?.services, d.sections.services),
      about: bool(input?.sections?.about, d.sections.about),
      gallery: bool(input?.sections?.gallery, d.sections.gallery),
    },
    workHours: {
      start: clampHour(input?.workHours?.start, d.workHours.start, 0, 23),
      end: clampHour(input?.workHours?.end, d.workHours.end, 1, 24),
      days:
        Array.isArray(input?.workHours?.days) && input.workHours.days.length === 7
          ? input.workHours.days.map(Boolean)
          : d.workHours.days,
      enforce: bool(input?.workHours?.enforce, d.workHours.enforce),
    },
  };
}

function clampHour(v: unknown, fb: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const content = await getContent();
  return NextResponse.json({ ok: true, content });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  const content = sanitize(body);
  await saveContent(content);
  // Фото, заменённые/удалённые в этой правке, больше не нужны.
  await collectUnusedUploads(referencedImages(content));

  // Публичная страница читает контент на каждый запрос (force-dynamic),
  // но на всякий случай сбрасываем кеш маршрутов.
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");

  return NextResponse.json({ ok: true, content });
}
