import { navigate } from 'astro:transitions/client';
import { catalogPath, categoryFromUrl, resolveStart, stripBase, type ProjectRoute } from './portfolio/routes';
import { miniAppConfig, shareTarget, telegramShare } from './sharing/links';
import {
  haptic, launchParameter, mountTelegram, openContact, readyTelegram, syncTelegramBack,
  syncTelegramLayout, syncTelegramMainButton, telegramMounted,
} from './telegram/adapter';

const configuredTelegram = miniAppConfig(import.meta.env.PUBLIC_TELEGRAM_BOT, import.meta.env.PUBLIC_TELEGRAM_APP);
const siteOrigin = import.meta.env.PUBLIC_SITE_ORIGIN || location.origin;
const pathname = (url: URL) => stripBase(url.pathname.replace(/\/$/, '')) || '/';
const isCase = (url: URL) => /^\/projects\/[^/]+$/.test(pathname(url));
let incomingCatalog: string | undefined;
let launchHandled = false;

function projectCount(count: number) {
  const last = count % 10;
  const tens = count % 100;
  const noun = tens >= 11 && tens <= 14 ? 'проектов' : last === 1 ? 'проект' : last >= 2 && last <= 4 ? 'проекта' : 'проектов';
  return count + ' ' + noun;
}

function updateCatalog() {
  const catalog = document.querySelector<HTMLElement>('[data-catalog]');
  if (!catalog) return;
  const url = new URL(location.href);
  const category = categoryFromUrl(url);
  if (!category && url.searchParams.has('category')) {
    url.searchParams.delete('category');
    history.replaceState(history.state, '', url);
  }
  for (const filter of catalog.querySelectorAll<HTMLAnchorElement>('[data-category]')) {
    if (filter.dataset.category === (category ?? '')) filter.setAttribute('aria-current', 'true');
    else filter.removeAttribute('aria-current');
  }
  revealActiveFilter(catalog);
  const cards = Array.from(catalog.querySelectorAll<HTMLElement>('[data-project-card]'));
  for (const card of cards) {
    card.hidden = !!category && !card.dataset.categories?.split(' ').includes(category);
  }
  const count = cards.filter((card) => !card.hidden).length;
  const emptyCatalog = catalog.querySelector<HTMLElement>('[data-empty-catalog]');
  const emptyCategory = catalog.querySelector<HTMLElement>('[data-empty-category]');
  const grid = catalog.querySelector<HTMLElement>('[data-project-grid]');
  const error = catalog.querySelector<HTMLElement>('[data-link-error]');
  const counter = catalog.querySelector<HTMLElement>('[data-catalog-count]');
  const share = catalog.querySelector<HTMLDetailsElement>('[data-share]');
  if (emptyCatalog) emptyCatalog.hidden = cards.length > 0 || !!category;
  if (emptyCategory) emptyCategory.hidden = !category || count > 0;
  if (grid) grid.hidden = count === 0;
  if (error) error.hidden = url.searchParams.get('status') !== 'unavailable';
  if (counter) counter.textContent = count > 0 ? projectCount(count) : '';
  if (share) {
    share.hidden = !category;
    share.dataset.value = category ?? '';
  }
}

/** На телефоне фильтры — горизонтальная лента: прокручиваем её к выбранному. */
function revealActiveFilter(catalog: HTMLElement) {
  const active = catalog.querySelector<HTMLElement>('[data-category][aria-current]');
  const strip = active?.closest<HTMLElement>('ul');
  if (!active || !strip || strip.scrollWidth <= strip.clientWidth) return;
  const offset = active.getBoundingClientRect().left - strip.getBoundingClientRect().left;
  strip.scrollLeft += offset - parseFloat(getComputedStyle(strip).paddingInlineStart || '0');
}

function updateShare() {
  const share = document.querySelector<HTMLDetailsElement>('[data-share]');
  const telegram = share?.querySelector<HTMLButtonElement>('[data-copy="telegram"]');
  const web = share?.querySelector<HTMLButtonElement>('[data-copy="web"]');
  if (!telegram || !web) return;
  telegram.hidden = !configuredTelegram;
  if (telegramMounted()) web.before(telegram);
}

function returnTarget() {
  const target: unknown = history.state?.portfolioCatalog;
  if (typeof target !== 'string') return;
  const url = new URL(target, location.origin);
  if (url.origin !== location.origin || pathname(url) !== '/projects') return;
  return catalogPath(categoryFromUrl(url));
}

function updateCaseBack() {
  const link = document.querySelector<HTMLAnchorElement>('[data-case-back]');
  if (!link) return;
  const target = returnTarget();
  link.href = target ?? catalogPath();
  link.textContent = target?.includes('?') ? 'К подборке' : 'Все проекты';
}

function telegramBack() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-gallery-dialog][open]');
  if (dialog) {
    dialog.close();
    return;
  }
  if (returnTarget()) history.back();
  else void navigate(catalogPath(), { history: 'replace' });
}

function initializeCaseVideos() {
  // The router parses the next page in a detached document before replacing the current one.
  for (const video of document.querySelectorAll<HTMLVideoElement>('video[data-video-src]:not([src])')) {
    const source = video.dataset.videoSrc;
    if (!source) continue;
    video.src = source;
    video.hidden = false;
  }
}

function updateMainButton() {
  const page = document.body.dataset.page;
  const contact = document.querySelector<HTMLAnchorElement>('a[data-telegram-contact]');
  if (!contact || page === 'telegram' || page === 'alias') {
    syncTelegramMainButton(undefined);
    return;
  }
  const href = contact.href;
  syncTelegramMainButton(page === 'case' ? 'Обсудить похожий проект' : 'Обсудить проект', () => {
    haptic('impact');
    if (!openContact(href)) location.href = href;
  });
}

async function onPage() {
  initializeCaseVideos();
  const launch = document.querySelector<HTMLElement>('[data-telegram-launch]');
  await mountTelegram(!!launch, telegramBack);
  if (launch?.isConnected && !launchHandled) {
    launchHandled = true;
    const published = JSON.parse(launch.dataset.projects ?? '[]') as ProjectRoute[];
    await navigate(resolveStart(launchParameter(new URL(location.href)), published), { history: 'replace' });
  }
  syncTelegramLayout();
  syncTelegramBack(document.body.dataset.page === 'case');
  updateMainButton();
  updateCatalog();
  updateShare();
  updateCaseBack();
  for (const image of document.querySelectorAll<HTMLImageElement>('[data-media] img[src]')) {
    if (image.complete && image.naturalWidth === 0) markMediaUnavailable(image);
  }
  readyTelegram();
}

document.addEventListener('astro:before-preparation', (event) => {
  incomingCatalog = pathname(event.from) === '/projects' && isCase(event.to) && event.direction === 'forward'
    ? catalogPath(categoryFromUrl(event.from))
    : undefined;
});

document.addEventListener('astro:after-swap', () => {
  if (incomingCatalog && document.body.dataset.page === 'case') {
    history.replaceState({ ...history.state, portfolioCatalog: incomingCatalog }, '');
  }
  incomingCatalog = undefined;
  initializeCaseVideos();
  syncTelegramLayout();
  updateCatalog();
  updateCaseBack();
});

document.addEventListener('astro:page-load', () => { void onPage(); });

async function copyLink(button: HTMLButtonElement) {
  const share = button.closest<HTMLDetailsElement>('[data-share]');
  const kind = share?.dataset.kind;
  if (kind !== 'case' && kind !== 'category') return;
  const target = shareTarget(kind, share?.dataset.value ?? '');
  if (!target) return;
  const type = button.dataset.copy;
  if (type === 'telegram' && !configuredTelegram) return;
  const url = type === 'telegram' && configuredTelegram
    ? telegramShare(configuredTelegram, target.start)
    : new URL(target.path, siteOrigin).href;
  const status = share?.querySelector<HTMLElement>('[data-share-status]');
  const fallback = share?.querySelector<HTMLLabelElement>('[data-copy-fallback]');
  const field = fallback?.querySelector('input');
  if (!status || !fallback || !field) return;
  status.textContent = '';
  try {
    await navigator.clipboard.writeText(url);
    fallback.hidden = true;
    status.textContent = 'Ссылка скопирована';
  } catch {
    fallback.hidden = false;
    field.value = url;
    field.focus();
    field.select();
    status.textContent = 'Ссылку можно скопировать вручную.';
  }
}

function openGallery(link: HTMLAnchorElement) {
  const dialog = document.querySelector<HTMLDialogElement>('[data-gallery-dialog]');
  const image = dialog?.querySelector<HTMLImageElement>('[data-gallery-image]');
  const error = dialog?.querySelector<HTMLElement>('[data-gallery-error]');
  if (!dialog?.showModal || !image || !error) return false;
  error.hidden = true;
  image.hidden = false;
  image.alt = link.dataset.alt ?? '';
  image.src = link.href;
  dialog.showModal();
  dialog.addEventListener('close', () => link.focus(), { once: true });
  return true;
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;
  if (telegramMounted()) {
    if (event.target.closest('.filters a')) haptic('selection');
    else if (event.target.closest('.button, .card-link, .service-link, .site-nav a')) haptic('impact');
  }
  const copy = event.target.closest<HTMLButtonElement>('button[data-copy]');
  if (copy) void copyLink(copy);
  const contact = event.target.closest<HTMLAnchorElement>('a[data-telegram-contact]');
  if (contact && openContact(contact.href)) event.preventDefault();
  const back = event.target.closest<HTMLAnchorElement>('a[data-case-back]');
  if (back && returnTarget()) {
    event.preventDefault();
    history.back();
  }
  const screenshot = event.target.closest<HTMLAnchorElement>('a[data-gallery-link]');
  if (screenshot && openGallery(screenshot)) event.preventDefault();
  const close = event.target.closest<HTMLButtonElement>('button[data-gallery-close]');
  if (close) close.closest<HTMLDialogElement>('dialog')?.close();
  if (event.target instanceof HTMLDialogElement && event.target.matches('[data-gallery-dialog]')) event.target.close();
}, { capture: true });

function markMediaUnavailable(media: HTMLImageElement | HTMLVideoElement) {
  if (media instanceof HTMLImageElement && media.matches('[data-gallery-image]')) {
    media.hidden = true;
    const message = media.parentElement?.querySelector<HTMLElement>('[data-gallery-error]');
    if (message) message.hidden = false;
    return;
  }
  const container = media.closest<HTMLElement>('[data-media]');
  if (!container) return;
  media.hidden = true;
  container.dataset.mediaError = '';
  const message = container.querySelector<HTMLElement>('.media-error');
  if (message) message.hidden = false;
}

document.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) markMediaUnavailable(event.target);
}, { capture: true });

function updateKeyboard() {
  const focus = document.activeElement;
  const editable = (focus instanceof HTMLInputElement && !focus.readOnly)
    || focus instanceof HTMLTextAreaElement || (focus instanceof HTMLElement && focus.isContentEditable);
  const viewport = window.visualViewport;
  const keyboard = !!(editable && viewport && window.innerHeight - viewport.height > 120);
  document.documentElement.toggleAttribute('data-keyboard', keyboard);
}

window.visualViewport?.addEventListener('resize', updateKeyboard);
document.addEventListener('focusin', updateKeyboard);
document.addEventListener('focusout', () => requestAnimationFrame(updateKeyboard));
