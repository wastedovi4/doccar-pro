# ТЗ: lenkrad на движке doccar

Для сессии (вкладки), которая ведёт **Lenkrad** (`C:\Users\ru\Documents\AIslop\Lenkrad`,
`github.com/wastedovi4/lenkrad`). Сначала прочитать [ENGINE.md](ENGINE.md) — граница
«движок / бренд» и контракт бренда. Источник движка — doccar
(`C:\Users\ru\Documents\AIslop\doccar`), он уже подготовлен к переносу.

## Цель

lenkrad.ru получает всё, что есть на doccar.pro: конструктор разделов, CRM на
SQLite, клиенты/машины/заказ-наряды, работы/запчасти/рекомендации, печать А4 с QR,
онлайн-отчёт `/r/…`, личный кабинет клиента `/lk`. **Вид lenkrad сохраняется**
(светлый сайт, синий акцент `#008BD9`, свои секции). **Живые данные не теряются.**

## Запрещено

- Править файлы движка внутри Lenkrad (`lib/`, `app/api|admin|lk|r/`,
  `components/admin|lk/`, `OrderDocument`, `PrintBar`, `JsonLd`, `Dockerfile`, …) —
  только в doccar → коммит → `engine-sync`. Копировать файлы doccar руками — тоже нет.
- Трогать `/opt/doccar`, контейнер `doccar-app`, блок `doccar.pro` в `Caddyfile`.
- `docker compose down` в `/opt/lenkrad`: там `lenkrad-caddy` (отдаёт и doccar.pro) и
  сеть `lenkrad_web`, в которой живёт `doccar-app` — лягут оба сайта.
- Подключать временные контейнеры к сети `lenkrad_web` и называть compose-сервисы
  так, чтобы алиас совпал с чужим (урок: алиас `app` в двух контейнерах — 3.5 мин
  половина lenkrad.ru уходила в doccar).

## Что на проде сейчас (2026-10-11)

- Сервер `135.106.175.41` (ssh-ключ `~/.ssh/hvpn_deploy`), `/opt/lenkrad`; compose:
  `app` → `lenkrad-app` (**Node 20** — движку нужен 24) и `caddy` → `lenkrad-caddy`
  (80/443: lenkrad.ru, www, lenkrad.ixat.taxi, doccar.pro).
- `data/content.json` — **старый формат**: `sections` = brands **вкл**, services/why/
  process/about **выкл**; brands 4, services 8, advantages 5, process 6, about без фото.
  Адрес строкой «г. Москва, ул. Кольская 14с7», Telegram задан, WhatsApp пуст.
- `data/crm.json` — **живое**: сотрудники 7 (admin 3, receiver 1, mechanic 3),
  заявки 13, записи 9 (8 привязаны к заявкам). Роли и статусы совпадают с движком,
  висячих ссылок и дублей логинов нет — импорт без потерь.
- Точка на карте — в `config/site.ts`: **55.86306, 37.647747**. В движке точка —
  в контенте; без переноса в дефолты карта уедет.
- `.env`: `ADMIN_LOGIN/PASSWORD/SECRET` — не менять (`ADMIN_SECRET` подписывает и
  куки админки, и куки ЛК).

Миграция контента lenkrad в движке **уже проверена** на копии боевого
`content.json` (34 проверки): порядок и видимость секций, якоря `#brands…#about`,
пункты услуг (по строке на пункт), преимущества → карточки, шаги → нумерованные
карточки, адрес → город + улица, плашки главного экрана, SEO, рабочие часы,
идемпотентность.

## Этапы

### 0. Подготовка
- `git status` в Lenkrad чистый; ветка `engine`.

### 1. Движок
```bash
cd C:\Users\ru\Documents\AIslop\doccar
node scripts/engine-sync.mjs ../Lenkrad             # отчёт: что заменится, что не так с брендом
node scripts/engine-sync.mjs ../Lenkrad --apply --prune
```
`--prune` уберёт в зонах движка файлы lenkrad, которых в движке нет (например
`lib/icons.ts` — конфликтует с `lib/icons.tsx`; `lib/content.ts` заменится движковым).
Удалённое остаётся в истории git. Затем `package.json` — выровнять по отчёту
(`next`, `qrcode-generator`, `@types/node ^24`, `engines.node >=24`), `npm install`.

### 2. Бренд lenkrad
1. **`config/brand.ts`** — `id: "lenkrad"`, `crmTitle: "LENKRAD · CRM"`, логин/пароль
   по умолчанию как были (`lenkrad` / `lenkrad-admin`), подсказки: `https://lenkrad.ru`,
   e-mail, `ул. Кольская 14с7`, `55.86306, 37.647747`.
2. **`config/content-defaults.ts`** — `DEFAULT_BLOCKS` с id и типами:
   `brands` (brands), `services` (services), `why` (cards, `numbered: false`),
   `process` (cards, `numbered: true`, `tone: "raised"` — тёмная полоса),
   `about` (text). Надзаголовки, заголовки, тексты, сноску марок — **перенести из
   текущих компонентов** (`BrandSection`, `Services`, `WhyUs`, `Process`, `About`):
   миграция берёт их отсюда по id, данные — из боевого контента. `menuLabel` — как в
   нынешнем меню. `DEFAULT_CONTENT`: бизнес из текущих дефолтов + `city: "Москва"`,
   `street: "ул. Кольская 14с7"`, `region: ""`, `geo: { lat: 55.86306, lng: 37.647747 }`;
   hero — текущий + `titleAccent: ""`, `image: ""`, текущие `badges`; `cta` — текст
   финального блока; `seo.url: "https://lenkrad.ru"`; рабочие часы как были.
3. **`components/Logo.tsx`** — `Logo`, `LogoMark`, `Wordmark`.
4. **`components/blocks/*`** — вёрстка **всех** типов движка в стиле lenkrad
   (основа — нынешние `BrandSection`/`Services`/`WhyUs`/`Process`/`About`; остальные
   типы — features, gallery, faq, prices, cta, reviews — в том же стиле).
   `index.tsx` — exhaustive switch (как в doccar). Учитывать `tone`, `eyebrow`,
   переносы строк; текст услуги = пункты по строке → рисовать списком, как раньше.
5. **Hero / Header / Footer / Contacts / MobileCTA / форма** — из контента:
   меню `navItems(content)` (вместо `nav` из `config/site.ts`), плашки hero с якорями
   (как `badgeHref`), карта и маршрут `mapLinks(business.geo)` из `lib/site.ts`,
   адрес `fullAddress(business)`, WhatsApp/Telegram, финальный блок `content.cta`.
   Форма записи → `POST /api/lead` (`service` — из `serviceTitles(content)`), окно
   записи по `#booking`.
6. **`app/page.tsx`** — Header → Hero → `content.blocks.filter(b => b.visible).map(BlockView)`
   → Contacts → Footer → MobileCTA → `JsonLd` (движковый).
7. **Тема** — `tailwind.config.ts`: `accent` из `--accent`, `on-accent`, тёмные
   `night/coal/steel/frost` (ЛК и онлайн-отчёт тёмные), `display`-шрифт, `content`
   с `./lib/**`, не затенять палитры Tailwind. `globals.css`: `.theme-dark` /
   `.theme-light` (`--accent` на белом — тёмнее `#008BD9` для читаемого текста,
   на тёмном — светлее), недостающие `.panel .btn-ghost .btn-outline-light .card`.
8. Удалить ставшее ненужным: `config/site.ts`, неиспользуемые старые секции.
9. Готово, когда: `node scripts/engine-sync.mjs ../Lenkrad` → «Движок актуален,
   контракт соблюдён», `npx tsc --noEmit -p .` и `npm run build` чистые; локально
   главная выглядит как сейчас (видна только секция марок), в админке — «Разделы»,
   «Клиенты», «Заказ-наряды».

### 3. Прогон на копии боевых данных (на сервере; ПДн с сервера не выносить)
- Исходники — во временный каталог (`/root/lenkrad-engine-src`), образ
  `docker build -t lenkrad-app:engine …`. Живой контейнер и `/opt/lenkrad` не трогать.
- `cp -a /opt/lenkrad/data /tmp/lenkrad-dryrun-data`;
  `docker run -d --name lenkrad-dryrun -v /tmp/lenkrad-dryrun-data:/app/data --env-file /opt/lenkrad/.env -p 127.0.0.1:3901:3000 lenkrad-app:engine`
  — **без** `--network lenkrad_web`.
- Проверить через `curl 127.0.0.1:3901`: вход прод-кредами; `crm.db` создан,
  `PRAGMA user_version` = 4, сотрудники/заявки/записи = 7/13/9, `crm.json` →
  `crm.json.imported`; главная — те же видимые секции, меню, плашки, карта;
  `/lk` 200 + noindex; `robots.txt` — Disallow `/admin`, `/r/`, `/lk`.
- `docker rm -f lenkrad-dryrun && rm -rf /tmp/lenkrad-dryrun-data /root/lenkrad-engine-src`.

### 4. Деплой
1. Бэкап: `tar czf /root/predeploy-lenkrad-<ts>/data-env.tgz data .env Caddyfile`;
   `docker tag lenkrad-app:latest lenkrad-app:prev`.
2. `diff` боевого `Caddyfile` с репо — если на сервере правили руками, сначала в репо.
3. Код: tar без `node_modules .next .git data .env*` → wipe `/opt/lenkrad` кроме
   `data` и `.env` → распаковать.
4. `docker compose build app` (в фоне, лог в файл, ~8 мин) →
   `docker compose up -d --no-deps app`. Caddy не пересоздавать; если `Caddyfile`
   менялся — `docker restart lenkrad-caddy` (bind-mount держит старый inode, reload не видит).
5. Проверки: `docker exec lenkrad-caddy nslookup app` и `… nslookup doccar` — по
   **одному** IP; lenkrad.ru и doccar.pro по 15 раз — 200; www → 301; база
   мигрировала (4, 7/13/9); вход в админку; тестовая заявка с сайта видна в «Запросах»
   (потом удалить); `/lk` 200; `/r/<мусор>` 404.
6. После: админка → «Контакты» — проверить точку на карте → сохранить (контент
   запишется в новом формате); «Заказ-наряды» — задать стоимость нормо-часа.

### 5. Откат
`docker tag lenkrad-app:prev lenkrad-app:latest && docker compose up -d --no-deps app`;
в `data/`: `crm.json.imported` → `crm.json`, удалить `crm.db*`; `content.json` — из
бэкапа (если уже сохранялся в новом формате).

### 6. Git и память
Коммит(ы) в Lenkrad вместе с `engine.lock.json`, push. Обновить память проекта
lenkrad: «на движке doccar, движок не править, sync из doccar».

## Если движку чего-то не хватает

Не дописывать в Lenkrad. Описать (что нужно и зачем) и передать в сессию doccar:
изменение делается там, проверяется на doccar, коммитится, затем
`engine-sync --apply`. Пример уже сделанного так: тип раздела «Марки», надзаголовок
раздела, плашки главного экрана, мессенджеры, разбор адреса одной строкой.
