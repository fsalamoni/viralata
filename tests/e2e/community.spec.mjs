import { test, expect } from '@playwright/test';
test('diretório de comunidades carrega', async ({ page }) => { await page.goto('/comunidades'); });
test('rota admin redireciona para /login', async ({ page }) => { await page.goto('/comunidades/amigos-do-rj/admin'); await expect(page).toHaveURL(/\/login/); });
