import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSession, can } from "@/lib/auth";
import { zipStore } from "@/lib/zip";
import { snapshot, SCHEMA_VERSION } from "@/lib/crm";
import { UPLOADS_DIR, isSafeId } from "@/lib/media";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");

async function fileOr(name: string, fallback: string): Promise<Buffer> {
  try {
    return await fs.readFile(path.join(DATA_DIR, name));
  } catch {
    return Buffer.from(fallback, "utf8");
  }
}

/** Загруженные фото → записи архива uploads/<id>. */
async function uploads(): Promise<{ name: string; data: Buffer }[]> {
  let names: string[];
  try {
    names = await fs.readdir(UPLOADS_DIR);
  } catch {
    return [];
  }
  const out: { name: string; data: Buffer }[] = [];
  for (const n of names.filter(isSafeId)) {
    out.push({ name: `uploads/${n}`, data: await fs.readFile(path.join(UPLOADS_DIR, n)) });
  }
  return out;
}

/** Скачать ZIP-бэкап всех данных (контент сайта + база CRM + фото). Только владелец. */
export async function GET() {
  const s = await getSession();
  if (!can(s?.role, "admin")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const meta = Buffer.from(
    JSON.stringify(
      { app: "doccar", kind: "backup", version: 3, crm: "sqlite", schema: SCHEMA_VERSION, exportedAt: new Date().toISOString() },
      null,
      2
    ),
    "utf8"
  );

  const zip = zipStore([
    { name: "content.json", data: await fileOr("content.json", "{}") },
    // Консистентный снимок базы (VACUUM INTO), а не копия «живого» файла с WAL.
    { name: "crm.db", data: snapshot() },
    { name: "meta.json", data: meta },
    ...(await uploads()),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const body = new Blob([new Uint8Array(zip)], { type: "application/zip" });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="doccar-backup-${date}.zip"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "no-store",
    },
  });
}
