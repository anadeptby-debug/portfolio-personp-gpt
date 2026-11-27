# Портфолио IT-специалиста

Русскоязычное портфолио на Astro и TypeScript. Статические страницы, каталог и материалы общие для браузера и Telegram Mini App.

## Локальный запуск

Требуется Node.js 22.19 или новее.

```sh
npm ci
npm run dev
```

Astro укажет адрес в терминале. Кейс онлайн-записи доступен по пути `/projects/online_booking`, его демо — по `/demo/booking`. Кейс интернет-магазина доступен по пути `/projects/desk_shop`, его демо — по `/demo/shop`. Записи, журнал событий и корзина сохраняются в браузере. Технические фикстуры используются только в отдельной e2e-сборке `dist-fixtures/`.

### Каталог демо-магазина

Товары, описания, характеристики, категории и тестовые цены заданы в `src/features/shop/catalog.ts`. Новые изображения добавляются в `src/assets/shop/` и связываются с товарами в `src/features/shop/media.ts`.

Изображения в `src/assets/shop/` созданы встроенным ImageGen. Ниже приведены использованные промпты.

<details>
<summary>Промпты ImageGen</summary>

`desk-lamp.png`

> Use case: product-mockup. Asset: wide 3:2 hero photo for a Russian-language demo storefront of intentional desk accessories. Photoreal editorial product photograph. One small matte burnt-orange metal task lamp with a simple round weighted base, a single angular upright stem, and a conical shade, on a pale oak desktop and warm sand studio wall. Place the entire lamp slightly right of center, fully in frame, recognizable in a tight centered crop as well. Candid late-afternoon sunlight from the upper left, a gentle long window shadow, premium catalog quality, natural metal and wood textures. Very spare scene. No typography, logo, watermark, people, screens, or other products.

`oak-stand.png`

> Use case: product-mockup. Asset: editorial product tile for a demo desk accessory storefront. Photoreal catalog photo of an empty precision-cut warm oak laptop riser, two clean walnut-oak support cheeks and a simple slightly sloped platform, with rounded edges, placed on a pale sand backdrop. Single product centered and wholly in frame, 4:3 landscape, slightly elevated three-quarter camera angle. Directional soft afternoon sunlight from upper left, tactile open grain. Warm neutral modern furniture catalog. No laptops, other products, typography, logo, watermark, or people.

`felt-mat.png`

> Use case: product-mockup. Asset: editorial product tile for a demo desk accessory storefront. Photoreal catalog photo of a moss-gray felt rectangular desk mat with finely stitched rounded corners, with one corner slightly rolled to show thickness, centered entirely in frame on a pale oak desktop. Slightly elevated three-quarter top-down camera, 4:3 landscape, generous neutral margins for responsive cropping, soft directional natural light, premium understated design. Single subject only, no logos, people, typography, watermark, or other products.

</details>

## Профиль и кейсы

1. Заполните `src/content/profile.json` согласованными данными. В `telegramUsername` укажите публичное имя личного аккаунта без `@`. Необязательные поля оставьте равными `null`, пустому массиву или `hidden` по схеме.
2. Создайте Markdown-файл в `src/content/projects/`. Данные хранятся во frontmatter. Обязательны `id`, `slug`, `title`, `summary`, `kind`, `categories`, `tags`, `problem`, `solution`, `features`. Значения `kind` — `commercial`, `personal` или `demo`. Категории — `web`, `bots`, `ai`, `automation`, `integrations`, `data`. Добавьте 2–4 тега и 3–6 реализованных возможностей.
3. Храните разрешённые изображения в `src/assets/projects/`. В `cover` и элементах `gallery` укажите `image` с путём относительно файла кейса и содержательный `alt`. Для локального видео укажите имя `.mp4` или `.webm` в `video.asset`, а файл сохраните в `src/assets/projects/<slug>/`. Для готового публичного видео укажите прямой HTTPS URL или путь под `public/media/` в `video.src`. Для речи приложите субтитры WebVTT в `video.captions`. В `demoUrl` можно указать HTTPS URL или собственный маршрут `/demo/<название>`. Публичный репозиторий в `repositoryUrl` указывается по HTTPS.
4. Укажите `status: published` после проверки текста и прав на материалы. Пригодные для публикации метрики сопровождаются `evidenceNote`. Эта заметка служит проверке контента, в HTML попадают только подпись и значение. Черновики с закрытыми материалами храните вне публичной папки `public/`. Всё в этой папке хостинг раздаёт напрямую.
5. Сохраняйте slug после публикации. Если его нужно поменять, добавьте старый в `aliases`. Оба Telegram-параметра откроют актуальный кейс. Веб-псевдоним переходит на каноническую страницу через HTML; хостинг с поддержкой HTTP-редиректов может отдавать 301 для этого адреса.

`featured: true` выводит работу на главной. Сортировка использует `sortOrder`, затем slug. Подходящие кейсы определяются по общим категориям.

## Проверки

```sh
npm run check
npm test
npm run build
npm run check:release -- --artifact-only
npx playwright install chromium
npm run test:e2e
```

При необходимости браузер Playwright можно выбрать через `PLAYWRIGHT_CHANNEL`, например `msedge`. E2E запускает отдельную сборку на `127.0.0.1:4327` и проверяет веб-маршруты, мобильную вёрстку и имитацию Telegram API.

## Публичный выпуск

1. Скопируйте `.env.example` в `.env`. Укажите `PUBLIC_SITE_ORIGIN` с публичным HTTPS origin без пути, `PUBLIC_TELEGRAM_BOT` с username бота без `@`, `PUBLIC_TELEGRAM_APP` с short name. Эти значения видны браузеру. Токен бота и авторизация для публичного каталога не требуются.
2. Выполните `npm run build` и `npm run check:release`. Разместите **`dist/`** на статическом HTTPS-хостинге. Настройте адреса без расширений для вложенных страниц и `404.html` с HTTP 404.
3. В BotFather создайте или выберите бота и настройте именованную Mini App с URL `<origin>/telegram`. Проверьте адрес `t.me/<bot_username>/<short_name>`. Если нужна кнопка запуска в профиле, настройте Main Mini App с тем же URL. [Документация Telegram](https://core.telegram.org/bots/webapps#direct-link-mini-apps).
4. Откройте реальные ссылки на главную, кейс и категорию в Telegram на iOS, Android и Desktop. Проверьте светлую и тёмную темы, поворот экрана, возврат к подборке, открытие личного контакта, копирование и веб-превью. Отметьте фактические результаты в `PASS`, `FAIL` или `BLOCKED`. Мок SDK покрывает маршруты и API в браузере, проверка клиента Telegram проводится отдельно.
