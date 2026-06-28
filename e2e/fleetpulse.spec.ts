import { expect, test } from '@playwright/test';

/**
 * Key user flow: load the dashboard → open a device → acknowledge an alert.
 */
test('load dashboard, open a device, and acknowledge an alert', async ({ page }) => {
  // 1. Dashboard loads with KPIs.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fleet Overview' })).toBeVisible();
  await expect(page.getByText('Total devices')).toBeVisible();

  // 2. Open the device list and drill into the first device.
  await page.getByRole('link', { name: 'Devices' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Devices' })).toBeVisible();

  const firstRow = page.locator('.row--data').first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();
  await expect(page.getByText('Predictive maintenance')).toBeVisible();

  // 3. Go to the alerts feed and acknowledge the first open alert.
  await page.getByRole('link', { name: 'Alerts' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Alerts' })).toBeVisible();

  // Wait for the feed to load before counting (the mock API has latency).
  const openAlerts = page
    .locator('app-alert-item')
    .filter({ has: page.getByRole('button', { name: 'Acknowledge' }) });
  await expect(openAlerts.first()).toBeVisible();
  const openCountBefore = await openAlerts.count();
  expect(openCountBefore).toBeGreaterThan(0);

  await openAlerts.first().getByRole('button', { name: 'Acknowledge' }).click();

  // Acknowledging removes the action from that alert, so one fewer remains open.
  await expect(openAlerts).toHaveCount(openCountBefore - 1);
});
