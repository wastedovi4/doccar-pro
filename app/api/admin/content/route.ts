import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, can } from "@/lib/auth";
import { getContent, saveContent } from "@/lib/content";
import { normalizeContent, referencedMedia } from "@/lib/content-normalize";
import { collectUnusedUploads } from "@/lib/media";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const s = await getSession();
  return s && can(s.role, "admin") ? s : null;
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

  const content = normalizeContent(body);
  await saveContent(content);
  // Фото, заменённые/удалённые в этой правке, больше не нужны.
  await collectUnusedUploads(referencedMedia(content));

  // Публичная страница читает контент на каждый запрос (force-dynamic),
  // но на всякий случай сбрасываем кеш маршрутов.
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");

  return NextResponse.json({ ok: true, content });
}
