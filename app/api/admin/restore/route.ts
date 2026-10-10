import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession, can } from "@/lib/auth";
import { unzipStore } from "@/lib/zip";
import { UPLOADS_DIR, isSafeId } from "@/lib/media";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Восстановление из ZIP-бэкапа (тело запроса = байты .zip).
 * Заменяет content.json и crm.json, докладывает фото из uploads/. Только владелец.
 */
export async function POST(request: Request) {
  const s = await getSession();
  if (!can(s?.role, "admin")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let entries;
  try {
    const buf = Buffer.from(await request.arrayBuffer());
    entries = unzipStore(buf);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Не удалось прочитать архив" },
      { status: 400 }
    );
  }

  const content = entries.find((e) => e.name === "content.json");
  const crm = entries.find((e) => e.name === "crm.json");

  if (!content && !crm) {
    return NextResponse.json(
      { ok: false, error: "В архиве нет content.json / crm.json — это не бэкап сайта" },
      { status: 400 }
    );
  }

  // Проверяем, что это валидный JSON, прежде чем записывать.
  try {
    if (content) JSON.parse(content.data.toString("utf8"));
    if (crm) JSON.parse(crm.data.toString("utf8"));
  } catch {
    return NextResponse.json({ ok: false, error: "Повреждённые данные в архиве" }, { status: 400 });
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  if (content) await fs.writeFile(path.join(DATA_DIR, "content.json"), content.data);
  if (crm) await fs.writeFile(path.join(DATA_DIR, "crm.json"), crm.data);

  // Фото: только плоские безопасные имена (никаких путей из архива).
  const photos = entries.filter(
    (e) => e.name.startsWith("uploads/") && isSafeId(e.name.slice("uploads/".length))
  );
  if (photos.length) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    for (const p of photos) {
      await fs.writeFile(path.join(UPLOADS_DIR, p.name.slice("uploads/".length)), p.data);
    }
  }

  return NextResponse.json({ ok: true });
}
