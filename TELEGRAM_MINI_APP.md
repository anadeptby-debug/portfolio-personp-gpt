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

## Шаг 3. Включите GitHub Pages

В репозитории уже есть workflow `.github/workflows/deploy-pages.yml`. При каждом пуше в `main` он собирает сайт, прогоняет тесты и выкладывает его на GitHub Pages.

1. Откройте репозиторий на GitHub → **Settings → Pages**.
2. В **Build and deployment → Source** выберите **GitHub Actions**.
3. Откройте **Settings → Secrets and variables → Actions → вкладка Variables** и добавьте:

   | Переменная | Значение |
   |---|---|
   | `PUBLIC_TELEGRAM_BOT` | username бота без `@`, например `anadept_portfolio_bot` |
   | `PUBLIC_TELEGRAM_APP` | short name Mini App, например `portfolio` |

   Это переменные (**Variables**), а не секреты: они публичные и видны в браузере. Задайте обе сразу или ни одной — по одной сборка остановится с ошибкой.
4. Откройте вкладку **Actions** → **Deploy to GitHub Pages** → **Run workflow**. Дальше сайт будет пересобираться сам после каждого пуша.

Через 1–2 минуты сайт будет доступен по адресу:

**https://anadeptby-debug.github.io/portfolio-personp-gpt/**

Адрес сайта и подпапку workflow подставляет сам — `PUBLIC_SITE_ORIGIN` и `BASE_PATH` задавать не нужно.

Проверьте, что открываются главная, `…/projects`, `…/projects/qr_workshop`, `…/demo/shop` и `…/telegram`, а на несуществующем адресе показывается страница 404.

### Свой домен (по желанию)

Например, `cases.anadept.by` вместо длинного адреса `github.io`:

1. У регистратора домена добавьте CNAME-запись `cases` → `anadeptby-debug.github.io`.
2. **Settings → Pages → Custom domain**: введите `cases.anadept.by`, сохраните и включите **Enforce HTTPS**.
3. В **Variables** добавьте `PUBLIC_SITE_ORIGIN` = `https://cases.anadept.by` и `BASE_PATH` = `/`.
4. Перезапустите workflow. После этого во всех адресах ниже используйте свой домен без `/portfolio-personp-gpt`.

### Локальная сборка в режиме GitHub Pages

```sh
BASE_PATH=/portfolio-personp-gpt PUBLIC_SITE_ORIGIN=https://anadeptby-debug.github.io npm run build
```

В Git Bash на Windows добавьте в начало `MSYS_NO_PATHCONV=1`, иначе путь `/portfolio-personp-gpt` превратится в путь Windows.

## Шаг 4. Подключите Mini App к боту

В @BotFather:

1. Отправьте `/newapp` и выберите своего бота.
2. **Title**: «Anadept — кейсы».
3. **Description**: например, «Автоматизация и ИИ для бизнеса: кейсы с цифрами до и после».
4. **Photo**: картинка 640×360. Возьмите `public/portfolio-preview.png` (1200×630 в стиле Anadept) и подгоните её под 640×360: уменьшите и слегка обрежьте края.
5. **GIF**: отправьте `/empty`, чтобы пропустить.
6. **Web App URL**: `https://anadeptby-debug.github.io/portfolio-personp-gpt/telegram`. Обязательно с `/telegram` в конце.
7. **Short name**: то же значение, что в `PUBLIC_TELEGRAM_APP`, например `portfolio`.

Дополнительно, чтобы приложение открывалось из профиля бота и кнопкой рядом с полем ввода:

- `/mybots` → ваш бот → **Bot Settings → Configure Mini App → Enable Mini App**, URL тот же: `https://anadeptby-debug.github.io/portfolio-personp-gpt/telegram`.
- `/mybots` → ваш бот → **Bot Settings → Menu Button** → тот же URL, текст «Кейсы».

## Шаг 5. Проверьте в Telegram

Откройте ссылки в Telegram на телефоне (iOS/Android) и на компьютере:

- `https://t.me/<бот>/<short_name>` — главная.
- `https://t.me/<бот>/<short_name>?startapp=case_desk_shop` — кейс магазина.
- `https://t.me/<бот>/<short_name>?startapp=case_online_booking` — кейс онлайн-записи.
- `https://t.me/<бот>/<short_name>?startapp=case_qr_workshop` — реальный кейс.
- `https://t.me/<бот>/<short_name>?startapp=cat_ai` — подборка «ИИ и LLM».

Что проверить:

- [ ] Тема совпадает с темой Telegram (переключите светлую/тёмную).
- [ ] На кейсе есть кнопка «Назад» в шапке Telegram, и она возвращает к списку.
- [ ] Нижняя кнопка Telegram «Обсудить проект» открывает чат `@anadept`.
- [ ] «Поделиться → ссылка Telegram» копирует ссылку `t.me/...`.
- [ ] Демо `/demo/shop` и `/demo/booking` работают, вёрстка не уезжает под вырез экрана.
- [ ] При повороте экрана ничего не ломается.

## Шаг 6 (необязательно). Финальная проверка локально

Создайте `.env` по образцу `.env.example` с теми же значениями, что в GitHub (для Pages: `PUBLIC_SITE_ORIGIN=https://anadeptby-debug.github.io` и `BASE_PATH=/portfolio-personp-gpt`), и выполните:

```sh
npm run build
npm run check:release
```

Если команда пишет «Статический артефакт прошёл проверку», всё готово.

> Для проекта нужен Node.js 22.19 или новее (`package.json → engines`). Локально сейчас стоит 22.16. Сборка на нём проходит, но лучше обновиться.

## Как обновлять

Любой `git push` в `main` запускает пересборку на GitHub Pages: ход сборки виден во вкладке **Actions**. Mini App в Telegram сразу показывает новую версию: в BotFather ничего менять не нужно.
