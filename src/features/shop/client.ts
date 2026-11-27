import { departments, priceLabel, products, searchText, type ProductId } from './catalog';

const storageKey = 'portfolio:desk-shop:cart:v1';
const maxQuantity = 9;
type Cart = Partial<Record<ProductId, number>>;
const findProduct = (id: string | undefined) => products.find((product) => product.id === id);
const select = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const input = select<HTMLInputElement>('[data-shop-search]');
let cart: Cart = {};
let storageAvailable = true;
let feedbackTimeout: number | undefined;

function readCart(): Cart {
  if (!storageAvailable) return cart;
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown> | null;
    const result: Cart = {};
    for (const { id } of products) {
      const count = data?.[id];
      if (typeof count === 'number' && Number.isInteger(count) && count >= 1) result[id] = Math.min(maxQuantity, count);
    }
    return result;
  } catch {
    return cart;
  }
}

function saveCart(next: Cart) {
  cart = next;
  if (!storageAvailable) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch {
    storageAvailable = false;
  }
}

async function updateCart(edit: (next: Cart) => void) {
  const apply = () => {
    const next = { ...readCart() };
    edit(next);
    saveCart(next);
    renderCart();
  };
  if (navigator.locks) await navigator.locks.request(storageKey, apply);
  else apply();
}

function total() {
  return products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0);
}

function announce(message: string, visible = false) {
  const target = select('[data-shop-announce]');
  if (target) target.textContent = message;
  if (!visible) return;
  const feedback = select('[data-shop-feedback]');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = false;
  window.clearTimeout(feedbackTimeout);
  feedbackTimeout = window.setTimeout(() => { feedback.hidden = true; }, 2600);
}

function renderCart() {
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const badge = select('[data-cart-count]');
  if (badge) badge.textContent = String(count);
  const layout = select('[data-cart-layout]');
  const empty = select('[data-cart-empty]');
  const confirmed = select('[data-cart-confirmed]');
  if (!layout || !empty || !confirmed) return;
  if (count > 0) confirmed.hidden = true;
  layout.hidden = count === 0;
  empty.hidden = count > 0 || !confirmed.hidden;
  for (const line of document.querySelectorAll<HTMLElement>('[data-cart-line]')) {
    const product = findProduct(line.dataset.cartLine);
    if (!product) continue;
    const quantity = cart[product.id] ?? 0;
    line.hidden = quantity === 0;
    const output = line.querySelector('[data-cart-quantity]');
    const subtotal = line.querySelector('[data-cart-subtotal]');
    const decrease = line.querySelector<HTMLButtonElement>('[data-cart-adjust="-1"]');
    const increase = line.querySelector<HTMLButtonElement>('[data-cart-adjust="1"]');
    if (output) output.textContent = String(quantity);
    if (subtotal) subtotal.textContent = priceLabel(product.price * quantity);
    if (decrease) decrease.disabled = quantity <= 1;
    if (increase) increase.disabled = quantity >= maxQuantity;
  }
  const cartTotal = select('[data-cart-total]');
  if (cartTotal) cartTotal.textContent = priceLabel(total());
}

let department = '';

function updateCatalog(updateAddress = true) {
  if (!input) return;
  const query = searchText(input.value);
  let visible = 0;
  for (const card of document.querySelectorAll<HTMLElement>('[data-shop-product]')) {
    const product = findProduct(card.dataset.shopProduct);
    if (!product) continue;
    const haystack = searchText([product.name, product.description, product.finish, departments[product.department]].join(' '));
    card.hidden = (!!department && product.department !== department)
      || !query.split(/\s+/).every((word) => haystack.includes(word));
    if (!card.hidden) visible++;
  }
  for (const control of document.querySelectorAll<HTMLButtonElement>('[data-shop-category]')) {
    control.setAttribute('aria-pressed', String(control.dataset.shopCategory === department));
  }
  const empty = select('[data-shop-empty]');
  const grid = select('[data-shop-grid]');
  if (empty) empty.hidden = visible > 0;
  if (grid) grid.hidden = visible === 0;
  announce(visible > 0 ? 'Найдено товаров: ' + visible : 'Товары не найдены');
  if (updateAddress) {
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    if (department) url.searchParams.set('category', department);
    else url.searchParams.delete('category');
    history.replaceState(history.state, '', url);
  }
}

function restoreFilters() {
  if (!input) return;
  const url = new URL(location.href);
  input.value = (url.searchParams.get('q') ?? '').slice(0, 80);
  const category = url.searchParams.get('category');
  department = category && Object.hasOwn(departments, category) ? category : '';
  updateCatalog(false);
}

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest('button');
  if (!control) return;
  try {
    if (control.hasAttribute('data-shop-category')) {
      department = control.dataset.shopCategory ?? '';
      updateCatalog();
    } else if (control.hasAttribute('data-shop-clear') && input) {
      department = '';
      input.value = '';
      updateCatalog();
      input.focus();
    } else if (control.dataset.addProduct) {
      const product = findProduct(control.dataset.addProduct);
      if (!product) return;
      await updateCart((next) => {
        const quantity = next[product.id] ?? 0;
        if (quantity >= maxQuantity) {
          announce('В корзине уже ' + maxQuantity + ' шт. этого товара.', true);
          return;
        }
        next[product.id] = quantity + 1;
        announce('В корзине: ' + product.name, true);
      });
    } else if (control.dataset.cartAdjust) {
      const product = findProduct(control.closest<HTMLElement>('[data-cart-line]')?.dataset.cartLine);
      if (!product) return;
      const change = Number(control.dataset.cartAdjust);
      let removed = false;
      await updateCart((next) => {
        const quantity = next[product.id];
        if (!quantity) return;
        if (change === 0) {
          delete next[product.id];
          removed = true;
        } else {
          next[product.id] = Math.min(maxQuantity, Math.max(1, quantity + change));
        }
      });
      if (removed) {
        announce(product.name + ' удалён из корзины.');
        select<HTMLElement>('.cart-line:not([hidden]) .remove, [data-cart-empty]:not([hidden]) a')?.focus();
      }
    } else if (control.hasAttribute('data-cart-checkout')) {
      let orderTotal = 0;
      await updateCart((next) => {
        for (const product of products) {
          orderTotal += product.price * (next[product.id] ?? 0);
          delete next[product.id];
        }
      });
      const confirmed = select('[data-cart-confirmed]');
      const message = select('[data-order-total]');
      if (!confirmed || !message || orderTotal === 0) return;
      message.textContent = 'Итог заказа: ' + priceLabel(orderTotal);
      confirmed.hidden = false;
      renderCart();
      select('#order-confirmed')?.focus();
    }
  } catch {
    announce('Не удалось обновить корзину. Попробуйте ещё раз.', true);
  }
});

input?.addEventListener('input', () => updateCatalog());
window.addEventListener('popstate', restoreFilters);
window.addEventListener('storage', ({ key }) => {
  if (key === storageKey || key === null) {
    cart = readCart();
    renderCart();
  }
});
window.addEventListener('pageshow', () => {
  cart = readCart();
  renderCart();
  restoreFilters();
});
cart = readCart();
renderCart();
restoreFilters();
