import { test, expect } from '@playwright/test';

test('Home page loads with Viralata branding', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Viralata/i);
});

test('Community directory is publicly accessible', async ({ page }) => {
  await page.goto('/comunidade');
  await expect(page.getByText(/Encontre uma organização/i)).toBeVisible();
});

test('Terms page is publicly accessible', async ({ page }) => {
  await page.goto('/termos');
  await expect(page.getByText(/Termos de Uso/i).first()).toBeVisible();
});
