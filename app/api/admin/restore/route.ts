import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession, can } from "@/lib/auth";
import { unzipStore } from "@/lib/zip";
import { importLegacy, keepCopyBeforeRestore, replaceDbFile, validateDbFile } from "@/lib/crm";
import { UPLOADS_DIR, isSafeId } from "@/lib/media";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Восстановление из ZIP-бэкапа (тело запроса = байты .zip). Только владелец.
 * — crm.db (новый формат): проверка целостности/схемы, затем замена базы;
 * — crm.json (старые бэкапы): перенос в базу через импорт.
 * Текущая база перед заменой сохраняется как data/crm.db.before-restore-*.
 * content.json заменяется, фото из uploads/ докладываются.
 */
export async function POST(request: Request) {
  const s = await getSession();
  if (!can(s?.role, "admin")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let entries;
  try {
    entries = unzipStore(Buffer.from(await request.arrayBuffer()));
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Не удалось прочитать архив" },
      { status: 400 }
    );
  }

  const content = entries.find((e) => e.name === "content.json");
  const crmDb = entries.find((e) => e.name === "crm.db");
  const crmJson = entries.find((e) => e.name === "crm.json");

  if (!content && !crmDb && !crmJson) {
    return NextResponse.json({ ok: false, error: "В архиве нет данных сайта — это не бэкап" }, { status: 400 });
  }

  // Всё проверяем до того, как что-либо записать.
  let legacy: unknown = null;
  try {
    if (content) JSON.parse(content.data.toString("utf8"));
    if (!crmDb && crmJson) legacy = JSON.parse(crmJson.data.toString("utf8"));
  } catch {
    return NextResponse.json({ ok: false, error: "Повреждённые данные в архиве" }, { status: 400 });
  }
  if (crmDb) {
    const err = validateDbFile(crmDb.data);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
  }

  if (crmDb || legacy) keepCopyBeforeRestore();
  if (crmDb) replaceDbFile(crmDb.data);
  else if (legacy) importLegacy(legacy as Parameters<typeof importLegacy>[0], { replace: true });

  await fs.mkdir(DATA_DIR, { recursive: true });
  if (content) await fs.writeFile(path.join(DATA_DIR, "content.json"), content.data);

  // Фото: только плоские безопасные имена (никаких путей из архива).
  const photos = entries.filter((e) => e.name.startsWith("uploads/") && isSafeId(e.name.slice("uploads/".length)));
  if (photos.length) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    for (const p of photos) {
      await fs.writeFile(path.join(UPLOADS_DIR, p.name.slice("uploads/".length)), p.data);
    }
  }

  return NextResponse.json({ ok: true });
}
