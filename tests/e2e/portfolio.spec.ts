import { expect, test, type Page } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';

const alpha = '/projects/test_alpha';
const beta = '/projects/test_beta';
const heading = 'Тестовый кейс с материалами';

async function mockClipboard(page: Page, succeeds: boolean) {
  await page.addInitScript((allowed) => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          if (!allowed) throw new Error('clipboard unavailable');
          document.body.dataset.copied = text;
        },
      },
    });
  }, succeeds);
}

async function mockTelegram(page: Page, start: string, supported = true) {
  await page.addInitScript(({ parameter, modern }) => {
    const handlers = new Map<string, () => void>();
    const field = (key: string, value: string) => { document.documentElement.dataset[key] = value; };
    const sdk = {
      platform: 'android',
      colorScheme: 'dark' as 'dark' | 'light',
      viewportStableHeight: 690,
      safeAreaInset: { bottom: 14 },
      contentSafeAreaInset: { bottom: 8 },
      initDataUnsafe: { start_param: parameter },
      ready: () => field('ready', 'true'),
      isVersionAtLeast: () => modern,
      onEvent: (type: string, fn: () => void) => handlers.set(type, fn),
      BackButton: {
        show: () => field('nativeBack', 'shown'),
        hide: () => field('nativeBack', 'hidden'),
        onClick: (fn: () => void) => window.addEventListener('fixture:back', fn),
      },
      openTelegramLink: (url: string) => field('contactOpened', url),
    };
    window.Telegram = { WebApp: sdk };
    window.addEventListener('fixture:light', () => {
      sdk.colorScheme = 'light';
      handlers.get('themeChanged')?.();
    });
  }, { parameter: start, modern: supported });
}

test('web catalog, deep link, refresh and history work without Telegram', async ({ page }) => {
  const sdkRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (request.url().includes('telegram-web-app.js')) sdkRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/projects?category=ai');
  const card = page.getByRole('link', { name: new RegExp(heading) });
  await expect(card).toBeVisible();
  await expect(page.getByRole('link', { name: /Тестовый кейс без материалов/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ИИ и LLM' })).toHaveAttribute('aria-current', 'true');
  const documentMarker = await page.evaluate(() => performance.timeOrigin);
  await card.click();
  await expect(page).toHaveURL(new RegExp(alpha + '/?$'));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentMarker);
  await page.getByRole('link', { name: 'К подборке' }).click();
  await expect(page).toHaveURL(/\/projects\/?\?category=ai$/);
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  await expect(page.getByRole('link', { name: 'Обсудить похожий проект' })).toHaveAttribute('href', 'https://t.me/fixture_contact');
  expect(sdkRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('case previews, legacy slugs and 404 work directly on the static host', async ({ page, request }) => {
  const response = await request.get(alpha);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('property="og:title" content="' + heading + '"');
  expect(html).toContain('property="og:image" content="http://127.0.0.1:4327/');
  await page.goto('/projects/test_former');
  await expect(page).toHaveURL(new RegExp(alpha + '/?$'));
  expect((await page.goto('/projects/unknown_case'))?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'К проектам' })).toBeVisible();
  await page.goto(beta);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Тестовый кейс без материалов');
  for (const label of ['Открыть демо', 'Исходный код', 'Скриншоты', 'Результаты', 'Видео работы']) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  }
});

test('published case and category share both formats', async ({ page }) => {
  await mockClipboard(page, true);
  await page.goto(alpha);
  await page.getByText('Поделиться', { exact: true }).click();
  await page.getByRole('button', { name: 'Копировать веб-ссылку' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-copied', 'http://127.0.0.1:4327' + alpha);
  await expect(page.getByText('Ссылка скопирована')).toBeVisible();
  await page.getByRole('button', { name: 'Копировать Telegram-ссылку' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-copied', /startapp=case_test_alpha$/);
  await page.goto('/projects?category=bots');
  await page.getByText('Поделиться', { exact: true }).click();
  await page.getByRole('button', { name: 'Копировать Telegram-ссылку' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-copied', /startapp=cat_bots$/);
});

test('manual copy, accessible gallery and media fallback', async ({ page }) => {
  await mockClipboard(page, false);
  await page.goto(alpha);
  const screenshot = page.getByRole('link', { name: /Увеличить/ });
  await screenshot.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('alt', 'Изображение для проверки галереи');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(screenshot).toBeFocused();
  await page.getByText('Поделиться', { exact: true }).click();
  await page.getByRole('button', { name: 'Копировать веб-ссылку' }).click();
  await expect(page.getByLabel('Ссылка для ручного копирования')).toHaveValue('http://127.0.0.1:4327' + alpha);
  await page.route('**/_astro/test-fixture-cover*', (route) => route.abort());
  await page.reload();
  await expect(page.locator('.case-cover')).toHaveAttribute('data-media-error', '');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
});

test('case video plays after client navigation', async ({ page }) => {
  await page.route('**/media/fixture-video.webm', (route) => route.fulfill({
    path: 'tests/fixtures/fixture-video.webm',
    contentType: 'video/webm',
  }));
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(heading) }).click();
  await expect(page).toHaveURL(new RegExp(alpha + '/?$'));
  const video = page.getByRole('region', { name: 'Видео работы' }).locator('video');
  await expect(video).toBeVisible();
  const duration = await video.evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error('Expected the case video');
    element.muted = true;
    await element.play();
    const duration = element.duration;
    element.pause();
    return duration;
  });
  expect(duration).toBeGreaterThan(0);
});

test('Telegram starts the case once, applies theme and insets, then opens personal chat and returns to catalog', async ({ page }) => {
  await mockTelegram(page, 'case_test_alpha');
  await page.goto('/telegram?tgWebAppStartParam=cat_bots');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  await expect(page.locator('html')).toHaveAttribute('data-environment', 'telegram');
  await expect(page.locator('html')).toHaveAttribute('data-native-back', 'shown');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('style', /--portfolio-device-bottom: 14px/);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:light')));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: 'Обсудить похожий проект' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-contact-opened', 'https://t.me/fixture_contact');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:back')));
  await expect(page.getByRole('heading', { name: 'Кейсы', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Главная' }).click();
  await expect(page.getByRole('heading', { name: 'Проверка интерфейса портфолио' })).toBeVisible();
});

test('Telegram query fallback and unknown destination are safe without an SDK', async ({ page }) => {
  await page.route('https://telegram.org/js/**', (route) => route.abort());
  await page.goto('/telegram?tgWebAppStartParam=cat_bots');
  await expect(page.getByRole('link', { name: 'Боты и Mini Apps' })).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-project-card]:visible')).toHaveCount(1);
  await page.goto('/telegram?tgWebAppStartParam=case_test_draft');
  await expect(page.getByText('Проект или подборка недоступны.')).toBeVisible();
  await expect(page.locator('[data-project-card]:visible')).toHaveCount(2);
  await page.goto('/telegram');
  await expect(page.getByRole('heading', { name: 'Проверка интерфейса портфолио' })).toBeVisible();
});

test('older Telegram keeps screen navigation and applies supported presentation', async ({ page }) => {
  await mockTelegram(page, 'case_test_beta', false);
  await page.goto('/telegram');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Тестовый кейс без материалов');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('html').getAttribute('data-native-back')).toBeNull();
  await page.getByRole('link', { name: 'Все проекты' }).click();
  await expect(page.getByRole('heading', { name: 'Кейсы', exact: true })).toBeVisible();
});

test('page layout stays in bounds from 320px to desktop', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    for (const path of ['/', '/projects?category=integrations', alpha, '/about']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
});

test('test build exposes no draft data or images', async ({ request }) => {
  expect((await request.get('/projects/test_draft')).status()).toBe(404);
  const files = await readdir('dist-fixtures', { recursive: true });
  expect(files.some((file) => /draft-fixture-cover|test_draft/.test(file))).toBe(false);
  for (const file of files.filter((name) => /\.(html|js|json)$/.test(name))) {
    expect(await readFile('dist-fixtures/' + file, 'utf8')).not.toContain('PORTFOLIO_DRAFT_SENTINEL_7241');
  }
});
