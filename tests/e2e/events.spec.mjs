import { test, expect } from '@playwright/test';
test('feed /eventos carrega', async ({ page }) => { await page.goto('/eventos'); });
test('admin de eventos redireciona para /login', async ({ page }) => { await page.goto('/eventos/admin'); await expect(page).toHaveURL(/\/login/); });
