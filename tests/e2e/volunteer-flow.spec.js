/**
 * @fileoverview Smoke tests para o fluxo completo de voluntários (TASK-280).
 *
 * Testa a estrutura de UI em 6 etapas do ciclo de voluntário, validando
 * que os elementos de permissão (canManageVolunteers) estão corretamente
 * visíveis ou ocultos conforme o papel do usuário.
 *
 * Rodar local:
 *   E2E_BASE_URL=https://viralata.web.app npx playwright test tests/e2e/volunteer-flow.spec.js
 */

import { test, expect } from '@playwright/test';

/** Mock auth via localStorage. */
async function mockAuth(page, role = 'user') {
  await page.addInitScript((r) => {
    window.localStorage.setItem('auth_mock', JSON.stringify({ uid: `mock-${r}-uid`, role: r }));
  }, role);
}

// ─── ETAPA 1: volunteer_signs_up_to_shelter ───────────────────────────────────

test('(1) volunteer_signs_up_to_shelter — /voluntarios/seja tem o formulário', async ({ page }) => {
  await page.goto('/voluntarios/seja', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const form = page.locator('form');
  await expect(form.or(page.getByRole('button', { name: /enviar|cadastrar|começar/i }))).toBeVisible({ timeout: 5000 });

  await expect(page.getByText(/termo|política|privacidad/i).first()).toBeVisible({ timeout: 3000 });
});

test('(1) /voluntarios/seja não expõe ações de admin', async ({ page }) => {
  await page.goto('/voluntarios/seja', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const adminActions = page.getByText(/aprovar|bloquear|remover voluntári|excluir/i);
  await expect(adminActions.first()).not.toBeVisible({ timeout: 3000 });
});

// ─── ETAPA 2: volunteer_signs_up — termo de voluntariado ──────────────────────

test('(2) /voluntarios/termo renderiza o documento e o aceite', async ({ page }) => {
  await page.goto('/voluntarios/termo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const conteudo = page.locator('article, main, [role="main"]');
  await expect(conteudo.first()).toBeVisible({ timeout: 5000 });

  const aceite = page.getByRole('checkbox', { name: /aceito|concordo/i })
    .or(page.getByRole('button', { name: /aceitar|assinar|aceito/i }));
  await expect(aceite.first()).toBeVisible({ timeout: 3000 });
});

// ─── ETAPA 3: admin_approves_application ─────────────────────────────────────

test('(3) admin_approves_application — admin vê ações de gestão na aba', async ({ page }) => {
  await mockAuth(page, 'admin');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const volunteersTab = page.getByRole('tab', { name: /voluntári|roster/i })
    .or(page.getByText(/voluntári/i));
  await expect(volunteersTab.first()).toBeVisible({ timeout: 5000 });

  const newBtn = page.getByRole('button', { name: /nova|novo|adicionar/i });
  await expect(newBtn.first()).toBeVisible({ timeout: 3000 });
});

test('(3) usuário normal não vê ações de gestão na aba de voluntários', async ({ page }) => {
  await mockAuth(page, 'user');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const newBtn = page.getByRole('button', { name: /nova participation/i });
  await expect(newBtn.first()).not.toBeVisible({ timeout: 3000 });
});

// ─── ETAPA 4: admin_assigns_to_event ─────────────────────────────────────────

test('(4) admin_assigns_to_event — lista de participations carrega', async ({ page }) => {
  await mockAuth(page, 'admin');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const partTab = page.getByRole('tab', { name: /participa/i })
    .or(page.getByText(/participa/i));
  await expect(partTab.first()).toBeVisible({ timeout: 5000 });
  await partTab.first().click();
  await page.waitForTimeout(1000);

  const card = page.getByText(/participations/i);
  await expect(card.first()).toBeVisible({ timeout: 3000 });
});

test('(4) voluntario não vê botões de exclusão em participations', async ({ page }) => {
  await mockAuth(page, 'user');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const partTab = page.getByRole('tab', { name: /participa/i }).or(page.getByText(/participa/i));
  if (await partTab.first().isVisible()) {
    await partTab.first().click();
    await page.waitForTimeout(1000);
  }

  const deleteBtn = page.getByRole('button', { name: /excluir/i });
  await expect(deleteBtn.first()).not.toBeVisible({ timeout: 3000 });
});

// ─── ETAPA 5: volunteer_checks_in ─────────────────────────────────────────────

test('(5) volunteer_checks_in — voluntario consegue fazer check-in (ou empty state)', async ({ page }) => {
  await mockAuth(page, 'user');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const checkInBtn = page.getByRole('button', { name: /check-in/i });
  if (await checkInBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await checkInBtn.first().click();
    await page.waitForTimeout(1500);
    const feedback = page.getByText(/✓|sucesso|feito/i);
    await expect(feedback.first()).toBeVisible({ timeout: 3000 });
  } else {
    const emptyState = page.getByText(/nenhuma|nenhum|carregando/i);
    await expect(emptyState.first()).toBeVisible({ timeout: 2000 });
  }
});

// ─── ETAPA 5b: shelter_receives_digest ────────────────────────────────────────

test('(5b) shelter_receives_digest — admin vê badge de total de horas', async ({ page }) => {
  await mockAuth(page, 'admin');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const partTab = page.getByRole('tab', { name: /participa/i }).or(page.getByText(/participa/i));
  await expect(partTab.first()).toBeVisible({ timeout: 5000 });
  await partTab.first().click();
  await page.waitForTimeout(1000);

  const hoursBadge = page.getByText(/\d+[.,]\d+h|total/i);
  await expect(hoursBadge.first()).toBeVisible({ timeout: 3000 });
});

// ─── ETAPA 6: volunteer_erases_data (LGPD) ────────────────────────────────────

test('(6) volunteer_erases_data — página de perfil tem link de exclusão LGPD', async ({ page }) => {
  await mockAuth(page, 'user');
  await page.goto('/perfil', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const eraseLink = page.getByText(/excluir conta|apagar dados|exclusão|direito.*apagar|lgpd/i);
  await expect(eraseLink.first()).toBeVisible({ timeout: 5000 });
});

// ─── CROSS-ROLE: FosterList gating ────────────────────────────────────────────

test('FosterList — admin vê ações de placement', async ({ page }) => {
  await mockAuth(page, 'admin');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const laresTab = page.getByText(/lar|placement/i);
  if (await laresTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    const actionBtn = page.getByRole('button', { name: /prorrogar|finalizar/i });
    await expect(actionBtn.first()).toBeVisible({ timeout: 3000 });
  }
});

test('FosterList — non-admin não vê ações de placement', async ({ page }) => {
  await mockAuth(page, 'user');
  await page.goto('/abrigo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const laresTab = page.getByText(/lar|placement/i);
  if (await laresTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    const actionBtn = page.getByRole('button', { name: /prorrogar|finalizar/i });
    await expect(actionBtn.first()).not.toBeVisible({ timeout: 3000 });
  }
});
