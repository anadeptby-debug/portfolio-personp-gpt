import { describe, expect, it } from 'vitest';
import { categoryFromUrl, isSlug, resolveStart } from '../../src/features/portfolio/routes';
import { miniAppConfig, shareTarget, telegramContact, telegramShare } from '../../src/features/sharing/links';

const published = [{ slug: 'published_case', aliases: ['old_case'] }];

describe('Telegram routes', () => {
  it('handles the home, a case, a former slug and a category', () => {
    expect(resolveStart(undefined, published)).toBe('/');
    expect(resolveStart('case_published_case', published)).toBe('/projects/published_case');
    expect(resolveStart('case_old_case', published)).toBe('/projects/published_case');
    expect(resolveStart('cat_ai', published)).toBe('/projects?category=ai');
  });

  it.each(['case_draft', 'cat_unknown', 'cat_toString', 'case_../about', 'case_//example.org', 'https://example.org'])(
    'falls back for %s',
    (value) => expect(resolveStart(value, published)).toBe('/projects?status=unavailable'),
  );

  it('bounds and validates slugs', () => {
    expect(isSlug('case_name_42')).toBe(true);
    expect(isSlug('_case')).toBe(false);
    expect(isSlug('Case')).toBe(false);
    expect(isSlug('a'.repeat(65))).toBe(false);
  });
});

describe('Web filters and sharing', () => {
  it('accepts one known category', () => {
    expect(categoryFromUrl(new URL('https://example.org/projects?category=web'))).toBe('web');
    expect(categoryFromUrl(new URL('https://example.org/projects?category=web&category=ai'))).toBeUndefined();
  });

  it('shares public targets on the right Telegram app', () => {
    const config = miniAppConfig('fixture_bot', 'portfolio_app');
    const share = shareTarget('case', 'public_case');
    expect(share).toEqual({ path: '/projects/public_case', start: 'case_public_case' });
    expect(telegramShare(config!, share!.start)).toBe('https://t.me/fixture_bot/portfolio_app?startapp=case_public_case');
    expect(shareTarget('category', 'bots')).toEqual({ path: '/projects?category=bots', start: 'cat_bots' });
    expect(shareTarget('category', '../about')).toBeUndefined();
  });

  it('omits unconfigured and malformed contacts', () => {
    expect(miniAppConfig('fixture_bot')).toBeUndefined();
    expect(miniAppConfig('fixture_bot', 'other/site')).toBeUndefined();
    expect(telegramContact(null)).toBeUndefined();
    expect(telegramContact('user?startapp')).toBeUndefined();
    expect(telegramContact('fixture_contact')).toBe('https://t.me/fixture_contact');
  });
});
