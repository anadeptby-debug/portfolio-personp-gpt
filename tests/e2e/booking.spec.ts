import { expect, test } from '@playwright/test';

test('visitor confirms a booking, sees it after reload and releases the time by cancelling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/booking');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Онлайн-запись');
  await expect(page.getByRole('button', { name: 'Подтвердить запись' })).toBeDisabled();
  await page.getByRole('button', { name: /Полное обслуживание/ }).click();
  await page.getByRole('button', { name: '12:00', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить запись' }).click();
  await expect(page.getByText(/^Запись подтверждена\. /)).toBeVisible();
  await expect(page.getByRole('button', { name: '13:00, занято' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: '12:00, занято' })).toBeDisabled();
  await page.getByRole('button', { name: 'Панель записей' }).click();
  await expect(page.getByRole('heading', { name: 'Панель записей' })).toBeVisible();
  await expect(page.getByText('Запись подтверждена', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Отменить запись/ }).click();
  await expect(page.getByText('Запись отменена', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Запись', exact: true }).click();
  await expect(page.getByRole('button', { name: '12:00', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
