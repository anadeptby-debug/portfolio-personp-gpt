import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { miniAppConfig } from './src/features/sharing/links.ts';

const fixtures = process.env.PORTFOLIO_TEST_FIXTURES === '1';
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, process.cwd(), ['PUBLIC_', 'BASE_PATH']);
const site = env.PUBLIC_SITE_ORIGIN || undefined;
// Подпапка для GitHub Pages, например /portfolio-personp-gpt. Пусто — сайт в корне домена.
const base = env.BASE_PATH && env.BASE_PATH !== '/' ? '/' + env.BASE_PATH.replace(/^\/+|\/+$/g, '') : undefined;
if (base && !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(base)) {
  throw new Error('BASE_PATH должен быть путём вида /portfolio-personp-gpt.');
}
const { PUBLIC_TELEGRAM_BOT: bot, PUBLIC_TELEGRAM_APP: app } = env;

if ((bot || app) && !miniAppConfig(bot, app)) {
  throw new Error('PUBLIC_TELEGRAM_BOT и PUBLIC_TELEGRAM_APP должны образовывать корректную ссылку Mini App.');
}

if (site) {
  const url = new URL(site);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if ((!isLocal && url.protocol !== 'https:') || !['http:', 'https:'].includes(url.protocol)
      || url.href !== url.origin + '/') {
    throw new Error('PUBLIC_SITE_ORIGIN должен содержать только origin сайта.');
  }
}

export default defineConfig({
  site,
  base,
  outDir: fixtures ? './dist-fixtures' : './dist',
  cacheDir: fixtures ? './node_modules/.cache/astro-fixtures' : './node_modules/.cache/astro',
  devToolbar: { enabled: false },
  vite: {
    define: { __PORTFOLIO_TEST_FIXTURES__: JSON.stringify(fixtures) },
  },
});
