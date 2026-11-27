import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4327';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20_000,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure' },
  workers: 2,
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4327',
    url: baseURL,
    env: {
      PORTFOLIO_TEST_FIXTURES: '1',
      PUBLIC_SITE_ORIGIN: baseURL,
      PUBLIC_TELEGRAM_BOT: 'portfolio_fixture_bot',
      PUBLIC_TELEGRAM_APP: 'portfolio',
      ASTRO_TELEMETRY_DISABLED: '1',
    },
    timeout: 90_000,
  },
});
