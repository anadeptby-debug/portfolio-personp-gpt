type TelegramEvent = 'themeChanged' | 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged';
type Insets = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;

type TelegramBack = {
  show(): void;
  hide(): void;
  onClick(handler: () => void): void;
};

type TelegramMainButton = {
  setText(text: string): void;
  show(): void;
  hide(): void;
  onClick(handler: () => void): void;
  setParams?(params: { color?: string; text_color?: string; is_visible?: boolean }): void;
};

type TelegramHaptics = {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  selectionChanged(): void;
};

type TelegramWebApp = {
  platform?: string;
  version?: string;
  colorScheme?: 'light' | 'dark';
  initDataUnsafe?: { start_param?: unknown };
  viewportStableHeight?: number;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  BackButton?: TelegramBack;
  MainButton?: TelegramMainButton;
  HapticFeedback?: TelegramHaptics;
  expand?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  onEvent?(event: TelegramEvent, handler: () => void): void;
  ready?(): void;
  isVersionAtLeast?(version: string): boolean;
  openTelegramLink?(url: string): void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SDK = 'https://telegram.org/js/telegram-web-app.js?65';
const sessionKey = 'portfolio:telegram';
let app: TelegramWebApp | undefined;
let mounted: Promise<void> | undefined;
let navigateBack: () => void = () => {};
let mainAction: (() => void) | undefined;
let readyRequested = false;
let readySent = false;

function sessionEnabled() {
  try { return sessionStorage.getItem(sessionKey) === '1'; } catch { return false; }
}

function getApp() {
  const candidate = window.Telegram?.WebApp;
  if (candidate && candidate.platform && candidate.platform !== 'unknown') return candidate;
}

function loadScript() {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(resolve, 1600);
    const done = () => {
      window.clearTimeout(timeout);
      attachBridge();
      resolve();
    };
    script.src = SDK;
    script.async = true;
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', done, { once: true });
    document.head.prepend(script);
  });
}

function supports(version: string) {
  return app?.isVersionAtLeast?.(version) === true;
}

export function syncTelegramLayout() {
  if (!app) return;
  const root = document.documentElement;
  root.dataset.environment = 'telegram';
  if (app.colorScheme === 'light' || app.colorScheme === 'dark') {
    root.dataset.theme = app.colorScheme;
  }
  applyChromeColors();
  const height = app.viewportStableHeight;
  if (typeof height === 'number' && height > 0) root.style.setProperty('--portfolio-stable-height', height + 'px');
  if (supports('8.0')) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const device = app.safeAreaInset?.[side];
      const content = app.contentSafeAreaInset?.[side];
      if (typeof device === 'number' && device >= 0) root.style.setProperty('--portfolio-device-' + side, device + 'px');
      if (typeof content === 'number' && content >= 0) root.style.setProperty('--portfolio-content-' + side, content + 'px');
    }
  }
}

function attachBridge() {
  if (app) return;
  app = getApp();
  if (!app) return;
  try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Storage is optional. */ }
  app.onEvent?.('themeChanged', syncTelegramLayout);
  app.onEvent?.('viewportChanged', syncTelegramLayout);
  if (supports('8.0')) {
    app.onEvent?.('safeAreaChanged', syncTelegramLayout);
    app.onEvent?.('contentSafeAreaChanged', syncTelegramLayout);
  }
  if (supports('6.1')) app.BackButton?.onClick(() => navigateBack());
  app.MainButton?.onClick(() => mainAction?.());
  try { app.expand?.(); } catch { /* Older clients may not support expand. */ }
  syncTelegramLayout();
  syncTelegramBack(document.body.dataset.page === 'case');
  if (readyRequested) readyTelegram();
}

export function mountTelegram(isLaunch: boolean, onBack: () => void) {
  if (!isLaunch && !sessionEnabled() && !getApp()) return Promise.resolve();
  navigateBack = onBack;
  attachBridge();
  if (app) return Promise.resolve();
  mounted ??= loadScript();
  return mounted;
}

export function launchParameter(url: URL) {
  const sdkValue = app?.initDataUnsafe?.start_param;
  if (typeof sdkValue === 'string' && sdkValue !== '') return sdkValue;
  const values = url.searchParams.getAll('tgWebAppStartParam');
  return values.length > 1 ? 'invalid' : values[0];
}

export function readyTelegram() {
  readyRequested = true;
  if (!readySent && app?.ready) {
    readySent = true;
    app.ready();
  }
}

export function telegramMounted() {
  return !!app;
}

export function syncTelegramBack(show: boolean) {
  if (!supports('6.1')) return;
  if (show) app?.BackButton?.show();
  else app?.BackButton?.hide();
}

export function openContact(url: string) {
  if (!supports('6.1') || !app?.openTelegramLink) return false;
  try {
    app.openTelegramLink(url);
    return true;
  } catch {
    return false;
  }
}

function applyChromeColors() {
  if (!app) return;
  const background = getComputedStyle(document.body).backgroundColor;
  const hex = toHex(background);
  if (!hex) return;
  try {
    if (supports('6.1')) app.setBackgroundColor?.(hex);
    if (supports('6.9')) app.setHeaderColor?.(hex);
    else if (supports('6.1')) app.setHeaderColor?.('bg_color');
    if (supports('7.10')) app.setBottomBarColor?.(hex);
  } catch { /* Colors are cosmetic. */ }
}

function toHex(color: string) {
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return;
  return '#' + match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('');
}

/** Нативная кнопка внизу экрана Telegram. `undefined` скрывает её. */
export function syncTelegramMainButton(text: string | undefined, action?: () => void) {
  const button = app?.MainButton;
  if (!button) return;
  mainAction = action;
  if (!text) {
    button.hide();
    return;
  }
  button.setText(text);
  button.setParams?.({ color: '#ff9b7d', text_color: '#121722' });
  button.show();
}

export function haptic(kind: 'selection' | 'impact') {
  if (!supports('6.1') || !app?.HapticFeedback) return;
  try {
    if (kind === 'selection') app.HapticFeedback.selectionChanged();
    else app.HapticFeedback.impactOccurred('light');
  } catch { /* Haptics are optional. */ }
}
