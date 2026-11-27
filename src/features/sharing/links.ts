import { catalogPath, isCategory, isSlug, projectPath } from '../portfolio/routes';

export const ownerUsernamePattern = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
const botPattern = /^[A-Za-z][A-Za-z0-9_]{1,28}bot$/i;
const appPattern = /^[A-Za-z0-9_]{3,30}$/;

export type TelegramLinkConfig = { bot: string; app: string };

export function miniAppConfig(bot?: string, app?: string): TelegramLinkConfig | undefined {
  return bot && app && botPattern.test(bot) && appPattern.test(app) ? { bot, app } : undefined;
}

export function telegramContact(username: string | null) {
  return username && ownerUsernamePattern.test(username) ? 'https://t.me/' + username : undefined;
}

export function shareTarget(kind: 'case' | 'category', value: string) {
  if (kind === 'case' && isSlug(value)) return { path: projectPath(value), start: 'case_' + value };
  if (kind === 'category' && isCategory(value)) return { path: catalogPath(value), start: 'cat_' + value };
}

export function telegramShare(config: TelegramLinkConfig, start: string) {
  const url = new URL('https://t.me/' + config.bot + '/' + config.app);
  url.searchParams.set('startapp', start);
  return url.href;
}
