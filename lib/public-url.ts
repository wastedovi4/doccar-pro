import { headers } from "next/headers";
import { getContent } from "@/lib/content";

/**
 * Публичный адрес сайта для ссылок наружу (QR на распечатке): из заголовков
 * запроса (за Caddy — X-Forwarded-*), иначе домен из настроек SEO.
 */
export async function publicOrigin(): Promise<string> {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host}`;
  }
  return (await getContent()).seo.url;
}
