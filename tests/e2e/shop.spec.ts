import { expect, test } from '@playwright/test';

test('catalog filters survive reload and product details can be opened directly', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/demo/shop');
  const catalog = page.getByRole('region', { name: 'Каталог' });
  await expect(catalog.locator('article:visible')).toHaveCount(3);
  await catalog.getByRole('button', { name: 'Организация' }).click();
  await expect(catalog.locator('article:visible')).toHaveCount(1);
  await catalog.getByRole('searchbox').fill('коврик');
  await expect(catalog.getByText('Товары не найдены')).toBeVisible();
  await page.reload();
  await expect(catalog.getByRole('searchbox')).toHaveValue('коврик');
  await expect(catalog.getByRole('button', { name: 'Организация' })).toHaveAttribute('aria-pressed', 'true');
  await catalog.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await catalog.getByRole('searchbox').fill('дубовая');
  await expect(catalog.locator('article:visible')).toHaveCount(1);
  await catalog.getByRole('link', { name: 'Дубовая подставка «Уровень»', exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/shop\/oak-stand\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Дубовая подставка «Уровень»');
  await expect(page.getByRole('heading', { name: 'Характеристики' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('cart persists quantities and can finish a demo order without payment data', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/shop/desk-lamp');
  await page.getByRole('button', { name: 'Добавить в корзину' }).click();
  await expect(page.getByRole('link', { name: 'Корзина 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Открыть корзину' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Корзина');
  await page.getByRole('button', { name: /Увеличить количество/ }).click();
  await expect(page.locator('[data-cart-total]')).toHaveText('378 BYN');
  await page.reload();
  await expect(page.locator('[data-cart-quantity]:visible')).toHaveText('2');
  await page.getByRole('button', { name: 'Оформить демо-заказ' }).click();
  await expect(page.getByRole('heading', { name: 'Демо-заказ оформлен' })).toBeVisible();
  await expect(page.getByText('Итог заказа: 378 BYN')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Корзина пуста' })).toBeVisible();
});
