import { test, expect } from '@playwright/test';
test('/adotar carrega', async ({ page }) => { await page.goto('/adotar'); });
test('/meu-painel redireciona para /login', async ({ page }) => { await page.goto('/meu-painel'); await expect(page).toHaveURL(/\/login/); });
