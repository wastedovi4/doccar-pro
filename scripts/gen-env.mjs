import crypto from "crypto";
import fs from "fs";
import path from "path";

const secret = crypto.randomBytes(32).toString("hex");
const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let pw = "";
for (let i = 0; i < 14; i++) pw += abc[crypto.randomInt(abc.length)];
const login = "doccar";

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
