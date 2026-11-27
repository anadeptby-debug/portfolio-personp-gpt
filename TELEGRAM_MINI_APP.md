# Запуск портфолио как Telegram Mini App

Пошаговая инструкция: от репозитория на GitHub до кнопки «Открыть» в Telegram.

## Что уже готово в коде

- Страница входа `/telegram`. Telegram открывает её первой, она подключает Telegram SDK и переводит пользователя на нужную страницу.
- Тема (светлая/тёмная), высота экрана и безопасные отступы берутся из Telegram.
- Системная кнопка «Назад» на страницах кейсов.
- Глубокие ссылки: `?startapp=case_<slug>` открывает кейс, `?startapp=cat_<категория>` открывает подборку.
- Кнопки «Поделиться» копируют ссылку на Mini App.
- Кнопка «Написать в Telegram» внутри Mini App открывает чат нативно.
- Нативная кнопка Telegram «Обсудить проект» внизу экрана, вибро-отклик на нажатия, цвет шапки Telegram под тему сайта.
- Системная кнопка «Назад» работает и в демо магазина и записи.
- Токен бота **не нужен**: это статический сайт без сервера.

Проверено локально: `npm run check` (0 ошибок), `npm test` (11/11), `npm run build`, `npm run check:release -- --artifact-only` проходят.

## Что уже заполнено

Профиль `src/content/profile.json` заполнен данными с сайта Anadept: название, описание, компетенции, Telegram `@anadept` и почта `hello@anadept.by`. Проверьте, что `telegramUsername` — это аккаунт, куда должны приходить сообщения клиентов. Не указывайте там бота.

`npm run check:release` после этого будет требовать только две вещи: данные бота и публичный HTTPS-адрес.

## Шаг 1. Проверьте кейсы

Кейсы лежат в `src/content/projects/`:

| Файл | Тип | Откуда |
|---|---|---|
| `qr_workshop.md`, `piecework_payroll.md` | Реальный проект | Кейсы с сайта |
| `ai_requests.md`, `ai_documents.md`, `supplier_orders.md`, `spec_check.md` | Типовой сценарий | Сценарии «до и после» с сайта, оценки по усреднённым нормам |
| `online_booking.md`, `desk_shop.md` | Интерактивное демо | Работают прямо в Mini App |

Чтобы скрыть кейс, поставьте `status: draft`. Чтобы убрать его с главной — `featured: false`.

## Шаг 2. Создайте бота

1. В Telegram откройте [@BotFather](https://t.me/BotFather) и отправьте `/newbot`.
2. Задайте имя и username. Username должен заканчиваться на `bot`, например `anadept_portfolio_bot`.
3. BotFather пришлёт токен. **В проект его не добавляйте и никому не показывайте:** для портфолио он не нужен.

Сразу придумайте **short name** для Mini App: латиница, цифры, `_`, от 3 до 30 символов, например `portfolio`.
Ссылка на приложение будет такой: `https://t.me/anadept_portfolio_bot/portfolio`.

## Шаг 3. Разместите сайт на HTTPS-хостинге

Нужен хостинг, который отдаёт сайт **из корня домена**. Все ссылки в сборке абсолютные (`/projects`, `/_astro/...`), поэтому GitHub Pages с адресом `username.github.io/portfolio-personp-gpt/` **не подходит**.

Проще всего Vercel (или Cloudflare Pages, Netlify — настройки те же):

1. Зайдите на [vercel.com](https://vercel.com) через GitHub и нажмите **Add New → Project**.
2. Выберите репозиторий `anadeptby-debug/portfolio-personp-gpt`.
3. Настройки сборки:
   - Framework Preset: **Astro**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version (Settings → General): **22.x**
4. Нажмите **Deploy**. После сборки вы получите адрес вида `https://portfolio-personp-gpt.vercel.app`.
5. Откройте **Settings → Environment Variables** и добавьте:

   | Переменная | Значение (пример) |
   |---|---|
   | `PUBLIC_SITE_ORIGIN` | `https://portfolio-personp-gpt.vercel.app` (без `/` в конце) |
   | `PUBLIC_TELEGRAM_BOT` | `anadept_portfolio_bot` (без `@`) |
   | `PUBLIC_TELEGRAM_APP` | `portfolio` |

6. **Deployments → … → Redeploy**: переменные применяются только при новой сборке.

Проверьте в браузере, что открываются `/`, `/projects`, `/projects/desk_shop`, `/telegram`, а несуществующий адрес показывает страницу 404.

> Если в вашей стране домены `*.vercel.app` открываются нестабильно, подключите собственный домен (Settings → Domains) и укажите его в `PUBLIC_SITE_ORIGIN`.

## Шаг 4. Подключите Mini App к боту

В @BotFather:

1. Отправьте `/newapp` и выберите своего бота.
2. **Title**: «Портфолио».
3. **Description**: одно предложение о себе.
4. **Photo**: картинка 640×360. Возьмите `public/portfolio-preview.png` (1200×630 в стиле Anadept) и подгоните её под 640×360: уменьшите и слегка обрежьте края.
5. **GIF**: отправьте `/empty`, чтобы пропустить.
6. **Web App URL**: `https://<ваш-домен>/telegram`. Обязательно с `/telegram` в конце.
7. **Short name**: то же значение, что в `PUBLIC_TELEGRAM_APP`, например `portfolio`.

Дополнительно, чтобы приложение открывалось из профиля бота и кнопкой рядом с полем ввода:

- `/mybots` → ваш бот → **Bot Settings → Configure Mini App → Enable Mini App**, URL тот же: `https://<ваш-домен>/telegram`.
- `/mybots` → ваш бот → **Bot Settings → Menu Button** → URL `https://<ваш-домен>/telegram`, текст «Портфолио».

## Шаг 5. Проверьте в Telegram

Откройте ссылки в Telegram на телефоне (iOS/Android) и на компьютере:

- `https://t.me/<бот>/<short_name>` — главная.
- `https://t.me/<бот>/<short_name>?startapp=case_desk_shop` — кейс магазина.
- `https://t.me/<бот>/<short_name>?startapp=case_online_booking` — кейс онлайн-записи.
- `https://t.me/<бот>/<short_name>?startapp=cat_web` — подборка «Веб».

Что проверить:

- [ ] Тема совпадает с темой Telegram (переключите светлую/тёмную).
- [ ] На кейсе есть кнопка «Назад» в шапке Telegram, и она возвращает к списку.
- [ ] Кнопка «Написать в Telegram» открывает ваш личный чат.
- [ ] «Поделиться → ссылка Telegram» копирует ссылку `t.me/...`.
- [ ] Демо `/demo/shop` и `/demo/booking` работают, вёрстка не уезжает под вырез экрана.
- [ ] При повороте экрана ничего не ломается.

## Шаг 6 (необязательно). Финальная проверка локально

Создайте `.env` по образцу `.env.example` с теми же значениями, что на хостинге, и выполните:

```sh
npm run build
npm run check:release
```

Если команда пишет «Статический артефакт прошёл проверку», всё готово.

> Для проекта нужен Node.js 22.19 или новее (`package.json → engines`). Локально сейчас стоит 22.16. Сборка на нём проходит, но лучше обновиться.

## Как обновлять

Любой `git push` в `main` запускает пересборку на Vercel. Mini App в Telegram сразу показывает новую версию: в BotFather ничего менять не нужно.
