import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR, contentTypeForId, isSafeId } from "@/lib/media";

export const dynamic = "force-dynamic";

/** Отдаёт загруженное фото по id. Публично (это картинки на сайте). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!isSafeId(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, id));
    return new NextResponse(new Blob([new Uint8Array(data)], { type: contentTypeForId(id) }), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForId(id),
        // id неизменяемый (новая загрузка = новый id) — можно кешировать надолго.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
