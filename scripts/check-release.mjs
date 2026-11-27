import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const entries = await readdir(dist, { recursive: true, withFileTypes: true });
const issues = [];
const fixtures = /PORTFOLIO_DRAFT_SENTINEL_7241|portfolio_fixture_bot|fixture_contact|test_alpha|test-fixture-cover|draft-fixture-cover/;
const secrets = /https?:\/\/api\.telegram\.org\/bot\d+:[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

for (const entry of entries.filter((item) => item.isFile())) {
  const file = join(entry.parentPath, entry.name);
  if (fixtures.test(file)) issues.push('Тестовый файл в dist: ' + entry.name);
  if (!/\.(?:html|js|mjs|json|txt|map)$/.test(entry.name)) continue;
  const text = await readFile(file, 'utf8');
  if (fixtures.test(text)) issues.push('Тестовые данные в dist: ' + entry.name);
  if (secrets.test(text)) issues.push('Обнаружен секрет в dist: ' + entry.name);
}

const html = await readFile(new URL('index.html', dist), 'utf8');
for (const path of ['projects/index.html', 'about/index.html', 'telegram/index.html', '404.html']) {
  await readFile(new URL(path, dist));
}
if (!html.includes('lang="ru"')) issues.push('Главная страница отсутствует или неполная.');

if (!process.argv.includes('--artifact-only')) {
  const profile = JSON.parse(await readFile(new URL('src/content/profile.json', root), 'utf8'));
  const env = loadEnv('production', process.cwd(), 'PUBLIC_');
  if (!profile.displayName || !profile.headline || !profile.bio || !profile.competencies.length) {
    issues.push('Заполните согласованный профиль владельца.');
  }
  if (!profile.telegramUsername || profile.telegramUsername.toLowerCase() === env.PUBLIC_TELEGRAM_BOT?.toLowerCase()) {
    issues.push('Укажите публичный username личного Telegram владельца.');
  }
  if (!env.PUBLIC_TELEGRAM_BOT || !env.PUBLIC_TELEGRAM_APP) issues.push('Укажите username бота и short name Mini App.');
  if (!env.PUBLIC_SITE_ORIGIN?.startsWith('https://') || !html.includes('property="og:image" content="https://')) {
    issues.push('Укажите публичный HTTPS origin и пересоберите приложение.');
  }
  if (!entries.some((entry) => entry.isFile() && entry.name === 'index.html'
      && /[\\/]projects[\\/][a-z0-9_]+$/.test(entry.parentPath))) {
    issues.push('Добавьте хотя бы один утверждённый опубликованный кейс.');
  }
}

if (issues.length) {
  for (const issue of [...new Set(issues)]) console.error('• ' + issue);
  process.exitCode = 1;
} else {
  console.log('Статический артефакт прошёл проверку.');
}
