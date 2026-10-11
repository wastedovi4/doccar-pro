import crypto from "crypto";
import fs from "fs";
import path from "path";

const secret = crypto.randomBytes(32).toString("hex");
const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let pw = "";
for (let i = 0; i < 14; i++) pw += abc[crypto.randomInt(abc.length)];
// Логин по умолчанию — из бренда (config/brand.ts: defaultAdminLogin).
const brandSrc = fs.readFileSync(path.join(process.cwd(), "config", "brand.ts"), "utf8");
const login = /defaultAdminLogin:\s*"([^"]+)"/.exec(brandSrc)?.[1];
if (!login) {
  console.error("Нет defaultAdminLogin в config/brand.ts");
  process.exit(1);
}

const body = [
  "# Доступ в админку /admin (смените при желании)",
  `ADMIN_LOGIN=${login}`,
  `ADMIN_PASSWORD=${pw}`,
  "",
  "# Секрет подписи cookie-сессии",
  `ADMIN_SECRET=${secret}`,
  "",
].join("\n");

const out = path.join(process.cwd(), ".env.local");
if (fs.existsSync(out) && !process.argv.includes("--force")) {
  console.log("EXISTS: .env.local уже есть — не перезаписываю (добавьте --force)");
} else {
  fs.writeFileSync(out, body);
  console.log("LOGIN=" + login);
  console.log("PASSWORD=" + pw);
}
