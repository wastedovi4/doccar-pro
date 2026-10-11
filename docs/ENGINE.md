# Движок сайтов автосервиса

Один движок — несколько сайтов (doccar.pro, lenkrad.ru, …). Сайт = **движок**
(общие файлы, одинаковые везде) + **бренд** (своё у каждого сайта).
Источник движка — репозиторий **doccar** (`github.com/wastedovi4/doccar-pro`).
Этот файл — часть движка: он одинаковый во всех сайтах.

## Правило

**Файлы движка на сайте не правят.** Любое изменение движка делается в doccar,
коммитится, и только потом переносится на сайты скриптом:

```bash
# из каталога doccar
node scripts/engine-sync.mjs ../Lenkrad            # проверка: что изменилось, соблюдён ли контракт
node scripts/engine-sync.mjs ../Lenkrad --apply    # перенос из HEAD doccar + engine.lock.json
```

На сайте лежит `engine.lock.json` (коммит движка и хэши файлов) — коммитится
вместе с сайтом. Проверка показывает правки движка на стороне сайта как ошибку,
`--apply` при них отказывает (`--force` — затереть). Срочный фикс прямо на сайте
допустим только как исключение: тот же diff сразу в doccar → коммит → `--apply`.

## Что чьё

| Движок (синхронизируется) | Бренд (у каждого сайта свой) |
| --- | --- |
| `lib/**` — данные, CRM, клиенты, наряды, ЛК, контент-модель, нормализация | `config/brand.ts` — id, подписи, логин по умолчанию, подсказки полей |
| `app/api/**`, `app/admin/**`, `app/lk/**`, `app/r/**` | `config/content-defaults.ts` — контент по умолчанию |
| `app/robots.ts`, `app/sitemap.ts` | `app/layout.tsx` (шрифты, метаданные), `app/page.tsx` (состав главной) |
| `components/admin/**`, `components/lk/**` | `app/globals.css`, `tailwind.config.ts` — тема |
| `components/OrderDocument.tsx`, `PrintBar.tsx`, `JsonLd.tsx` | `components/Logo.tsx`, `Header`, `Hero`, `Footer`, `Contacts`, `MobileCTA`, формы записи |
| `Dockerfile`, `.dockerignore`, `next.config.mjs`, `postcss.config.mjs`, `tsconfig.json` | `components/blocks/**` — **вёрстка разделов** |
| `scripts/gen-env.mjs`, `docs/ENGINE.md` | `public/**`, `docker-compose.yml`, README |

Модель разделов (типы, поля, редакторы в админке) — движок; как раздел
выглядит на сайте — бренд. Поэтому один и тот же контент на doccar тёмный с
лаймом, а на lenkrad — в его стиле.

## Контракт бренда

Проверяется скриптом (`--check`); без него сборка не пройдёт или админка поедет.

- **`config/brand.ts`** — `export const BRAND = { id, crmTitle, defaultAdminLogin,
  defaultAdminPassword, placeholders: { siteUrl, email, street, geo } }`.
  `id` — латиница: имя файла бэкапа.
- **`config/content-defaults.ts`** — `DEFAULT_CONTENT: Content`, `DEFAULT_BLOCKS: Block[]`.
  Важно для миграции старого формата: заголовки/подписи разделов берутся из
  `DEFAULT_BLOCKS` **по id раздела** (`brands`, `services`, `why`, `process`,
  `about`, `gallery`), данные — из старого контента.
- **`components/Logo.tsx`** — `Logo` (полный, на тёмном фоне; шапка ЛК, онлайн-отчёт),
  `LogoMark` (знак; админка, печать), `Wordmark` (название строкой; админка, вход).
- **`components/blocks/index.tsx`** — `BlockView({ block })` рисует **каждый** тип
  из `BLOCK_TYPES` (`lib/content-model.ts`). Switch с `default: const missing: never = block`
  — новый тип в движке без вёрстки ломает сборку, а не молча пропадает.
  Каждый раздел: `id={block.anchor}`, учитывает `tone` (обычный / выделенный фон),
  `eyebrow` (надзаголовок, может быть пустым), переносы строк в текстах.
- **Главный экран** рисует все поля `content.hero`, включая `badges` (плашки, могут
  быть пустыми) и `titleAccent` (вторая строка, может быть пустой).
- **Контакты** показывают `business.whatsapp` / `business.telegram`, если заданы
  (ссылки https://, открывать в новой вкладке).
- **Окно записи** открывается по якорю `#booking` (`BOOKING_HREF` из `lib/site.ts`)
  и шлёт `POST /api/lead` с полями `name, phone, car, service, message`.
- **`app/globals.css`** — классы, которыми пользуются страницы движка (ЛК, отчёт,
  вход в админку): `.container-x .eyebrow .rule .btn .btn-primary .btn-ghost
  .btn-outline-light .card .panel`, темы `.theme-dark` / `.theme-light` с
  переменными `--accent --accent-hover --on-accent` (RGB-триплеты).
  Админка — `.theme-light`, ЛК и онлайн-отчёт — тёмные (`bg-night`).
- **`tailwind.config.ts`** — цвета `accent` (из `--accent`), `on-accent`, `night`,
  `coal`, `steel`, `frost` (тёмная гамма ЛК/отчёта), `graphite`, `muted`, `mist`,
  `line` (светлая админка); `fontFamily.display`. **Не затенять стандартные
  палитры Tailwind** (`lime`, `green`, `emerald`, `red`, `amber`, `sky`, …): движок
  ими красит статусы. Фирменный цвет называть по-своему (у doccar — `volt`).
  `content` должен включать `./app/**`, `./components/**`, `./lib/**`
  (иконки и статусы движка лежат в `lib/`).
- **`public/og-image.png`, `public/icon-512.png`** — на них ссылается JSON-LD.
- **`package.json`** — зависимости и `engines.node` как у движка (Node 24:
  встроенный `node:sqlite`).

## Данные

`data/` (том Docker, в git не попадает): `content.json`, `crm.db` (SQLite, схема
версионируется `PRAGMA user_version`, миграции — `lib/db.ts`, применяются сами на
первом запросе к базе), `uploads/`. Старый `data/crm.json` импортируется в базу
один раз и переименовывается в `crm.json.imported`. Старый формат `content.json`
(фиксированные секции + флажки `sections`, адрес одной строкой) приводится к
разделам при чтении и записывается в новом формате при первом сохранении из
админки. Миграции движка обязаны принимать данные **любого** сайта на движке.
