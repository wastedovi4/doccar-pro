import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession, can } from "@/lib/auth";
import { UPLOADS_DIR, MAX_UPLOAD_BYTES, MEDIA_PREFIX, sniffImage } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Загрузка фото (multipart/form-data: file). Возвращает URL, который админка
 * подставляет в нужный слот (hero, карточка услуги, лента). В контент файл
 * попадает по кнопке «Сохранить»; неиспользуемые загрузки убираются при
 * сохранении контента (см. collectUnusedUploads).
 */
export async function POST(request: Request) {
  const s = await getSession();
  if (!can(s?.role, "admin")) return NextResponse.json({ ok: false }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad form" }, { status: 400 });
  }
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  // Расширение — по содержимому файла, а не по заявленному браузером типу.
  const ext = sniffImage(buf);
  if (!ext) {
    return NextResponse.json({ ok: false, error: "Только JPG, PNG, WEBP или GIF" }, { status: 400 });
  }

  const id = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, id), buf);

  return NextResponse.json({ ok: true, url: `${MEDIA_PREFIX}${id}` });
}
