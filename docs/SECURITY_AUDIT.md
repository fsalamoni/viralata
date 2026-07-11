# SECURITY_AUDIT — Checklist de Pentest Manual

> **Fase 20 — Segurança Avançada (SHELTER_SECURITY_HARDENING)**
>
> Este documento é o checklist vivo de auditoria de segurança da
> plataforma Viralata. Foi desenhado para ser executado **manualmente**
> antes de cada release de produção e **automatizado** em CI quando
> possível. Cada item tem um `ID` (SEC-XX) para rastreabilidade em PRs e
> relatórios. A maioria dos checks tem como owner o time de plataforma;
> checks com tag `[PLATFORM_ADMIN]` precisam de credenciais de admin
> master.

---

## 0. Convenções

- **Frequência**: a cada release de produção + trimestral (auditoria
  manual).
- **Ferramentas**: Firestore Emulator Suite, Firebase App Check
  console, Cloud Run logs, GCP Security Command Center, OWASP ZAP (testes
  ativos contra o front público).
- **Severidade**:
  - **Crítica** — bloqueia release, corrige em ≤24h.
  - **Alta** — corrige em ≤1 semana.
  - **Média** — corrige em ≤1 mês.
  - **Baixa** — backlog.
- **Tags**:
  - `[AUTOMATED]` — coberto por teste automatizado (vitest / RLS test).
  - `[MANUAL]` — exige intervenção humana.
  - `[PLATFORM_ADMIN]` — exige credencial de admin master.

---

## 1. App Check (reCAPTCHA Enterprise)

| ID    | Check                                                                                  | Tipo            | Status |
|-------|----------------------------------------------------------------------------------------|-----------------|--------|
| SEC-1 | reCAPTCHA v3 site key configurado em produção (VITE_RECAPTCHA_SITE_KEY)                 | [MANUAL]        | ☐      |
| SEC-2 | App Check ativado para Auth / Firestore / Storage no console do Firebase               | [MANUAL]        | ☐      |
| SEC-3 | Token App Check presente em todas as chamadas client (`request.auth.token.app_check`)  | [AUTOMATED]     | ☐      |
| SEC-4 | Bypass local (`self.provider().appCheck.setTokenAutoRefreshEnabled(false)`) documentado para devs | [MANUAL] | ☐      |
| SEC-5 | Regras de Firestore exigem `app_check_token != null` em produção (em dev/testes: skip) | [AUTOMATED]     | ☐      |

### Procedimento SEC-1 a SEC-2
1. Acesse Firebase Console → App Check.
2. Para cada serviço (Authentication, Firestore, Storage, Functions),
   clique em "Get started" e selecione **reCAPTCHA Enterprise**.
3. Copie o `site key` e o `API key` para `.env`:
   ```bash
   VITE_RECAPTCHA_SITE_KEY=<site-key>
   FIREBASE_APP_CHECK_PROVIDER_KEY=<api-key>  # server-side
   ```
4. Em "Enforcement", ative o toggle para Firestore + Storage.

### Procedimento SEC-3
- Abra DevTools → Network → filtre `firestore.googleapis.com` →
  confirme header `X-Firebase-AppCheck: <token>`.
- Automatizado em `tests/security/rlsTest.js` (modo emulador).

---

## 2. Rate Limiting em Cloud Functions

| ID      | Check                                                                | Tipo         | Status |
|---------|----------------------------------------------------------------------|--------------|--------|
| SEC-10  | `googleFormsWebhook` envolto em `withRateLimit(...)`                  | [AUTOMATED]  | ☐      |
| SEC-11  | Bucket in-memory com window 60s / 100 req default (env overridable)   | [AUTOMATED]  | ☐      |
| SEC-12  | Headers `X-RateLimit-*` e `Retry-After` emitidos em todas as respostas | [AUTOMATED] | ☐      |
| SEC-13  | Bypass via `RATE_LIMIT_DISABLED=true` em testes E2E                  | [MANUAL]     | ☐      |
| SEC-14  | Logs estruturados quando limite é atingido (`logger.warn`)           | [MANUAL]     | ☐      |
| SEC-15  | `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` configuráveis por env var   | [AUTOMATED]  | ☐      |

### Procedimento SEC-14
1. Em staging, dispare 200 requests em 30s com `curl`:
   ```bash
   for i in $(seq 1 200); do
     curl -s -X POST $WEBHOOK_URL -d '{}' -H 'Content-Type: application/json' &
   done
   wait
   ```
2. Verifique nos logs do Cloud Run entradas do tipo
   `rate_limit_hit` ou status 429 na resposta.
3. Confirme que um `security_alert` do tipo `rate_limit_hit` foi
   criado em `platform_security_alerts/`.

---

## 3. Firestore Rules Hardening

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-20 | Deny-by-default EXPLÍCITO (Firestore rules não permite nada fora de `match`)     | [MANUAL]        | ☐      |
| SEC-21 | Storage rules: deny-by-default + type-check `image/*` ou `video/*`               | [MANUAL]        | ☐      |
| SEC-22 | Funções helper terminam com `return` (sem fall-through)                           | [AUTOMATED]     | ☐      |
| SEC-23 | Toda coleção admin-only (`platform_*`, `audit_logs`) verificada                 | [AUTOMATED]     | ☐      |
| SEC-24 | `platform_security_alerts` é read-only para platform_admin / write = false      | [AUTOMATED]     | ☐      |
| SEC-25 | `isPlatformAdmin()` checa role no doc `users/{uid}` (não no token) — confirmado  | [MANUAL]        | ☐      |
| SEC-26 | Cross-user writes bloqueados (não-owners não editam pets/clubs de outros)        | [AUTOMATED]     | ☐      |
| SEC-27 | `firestore.indexes.json` NÃO declara single-field indexes (auto-criados)        | [MANUAL]        | ☐      |

### Procedimento SEC-22
```bash
grep -nE 'function (isAuth|isOwner|isPlatformAdmin|isClubMember)' firestore.rules
```
Cada função deve terminar com `return ...` explícito. Procurar por
`function isFooBar() { ... }` sem return no final.

### Procedimento SEC-25
1. Em produção, com 2 contas (admin + usuário comum), tente:
   - `db.collection('users').doc(adminUid).update({ role: 'platform_admin' })` — **deve falhar**.
   - `db.collection('platform_security_alerts').add({ ... })` — **deve falhar**.
2. Como admin, `db.collection('platform_security_alerts').get()` — **deve funcionar**.

### Procedimento SEC-26
Rodar `tests/security/rlsTest.js` no emulador:
```bash
FIRESTORE_EMULATOR_HOST=localhost:8080 \
  npm run test:security
```
Todos os casos em `EXPECTED_DENY_COLLECTIONS` devem ter `passed: true`.

---

## 4. Alertas de Admin

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-30 | `triggerSecurityAlert` Cloud Function onCall deployada                          | [MANUAL]        | ☐      |
| SEC-31 | Apenas `platform_admin` pode chamar (checa role via Admin SDK)                  | [AUTOMATED]     | ☐      |
| SEC-32 | Schema validado server-side (type/severity/source enums)                        | [AUTOMATED]     | ☐      |
| SEC-33 | `platform_security_alerts` só permite leitura para platform_admin               | [AUTOMATED]     | ☐      |
| SEC-34 | UI `/admin/security-alerts` lista, filtra e marca como resolvido                | [MANUAL]        | ☐      |
| SEC-35 | Alertas geram logs estruturados (severity, source, context)                      | [MANUAL]        | ☐      |

### Procedimento SEC-30 / SEC-31
```bash
# Como usuário comum (não-admin) — DEVE falhar
firebase functions:shell
> triggerSecurityAlert({ type: 'manual', severity: 'low' })
# Esperado: HttpsError: permission-denied
```

---

## 5. Audit Log

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-40 | `audit_logs` é write-only (apenas Admin SDK)                                    | [AUTOMATED]     | ☐      |
| SEC-41 | Helper `createAuditLog` enriquece com IP, user-agent (request context)          | [MANUAL]        | ☐      |
| SEC-42 | Retenção 6 meses (Marco Civil Art. 15) — TTL configurado                        | [MANUAL]        | ☐      |
| SEC-43 | Ações de `pet_timeline`, `community`, `club` registradas                        | [AUTOMATED]     | ☐      |
| SEC-44 | Logs sensíveis (senhas, tokens, PII completa) não vazam para o log             | [MANUAL]        | ☐      |

### Procedimento SEC-42
1. Firestore Console → `audit_logs` → "TTL Policy".
2. Campo `created_at_ms` → TTL 180 dias.
3. Confirmar periodicidade do job de purge (cron job documentado em
   `docs/SHELTER_MGMT_ROADMAP.md`).

---

## 6. Storage Hardening

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-50 | Deny-by-default explícito no topo de `storage.rules`                             | [MANUAL]        | ☐      |
| SEC-51 | Aceita somente `image/*` e `video/*` (bloqueia PDF, EXE, scripts)                | [MANUAL]        | ☐      |
| SEC-52 | Limite de tamanho respeitado (uploads 25MB, pets 10MB, avatares 5MB)            | [MANUAL]        | ☐      |
| SEC-53 | CORS configurado para origens confiáveis (`storage.cors.json`)                   | [MANUAL]        | ☐      |
| SEC-54 | `request.auth.token.role == 'platform_admin'` lido onde aplicável               | [AUTOMATED]     | ☐      |

### Procedimento SEC-51
1. Como usuário autenticado, tente upload de um PDF em
   `uploads/{uid}/docs/test.pdf` via console do Firebase Storage.
2. Esperado: **rejeição** com `storage/unauthorized` ou similar.
3. Tente upload de `image/png` no mesmo path — esperado: **aceito**.

---

## 7. Autenticação & Sessão

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-60 | Senha mínima 8 caracteres + política de complexidade                            | [MANUAL]        | ☐      |
| SEC-61 | MFA disponível para platform_admin (recomendado: TOTP)                           | [PLATFORM_ADMIN]| ☐      |
| SEC-62 | Session cookie `__session` é `Secure`, `HttpOnly`, `SameSite=Lax`                | [MANUAL]        | ☐      |
| SEC-63 | `auth/users/{uid}` não expõe PII (telefone, email) via read público              | [AUTOMATED]     | ☐      |
| SEC-64 | Conta deletada tem `deleted_at` setado + PII removido (LGPD)                     | [MANUAL]        | ☐      |
| SEC-65 | Login suspeito (5 falhas em 5min) gera `security_alert`                          | [MANUAL]        | ☐      |

### Procedimento SEC-65
1. Tente login com senha errada 5 vezes em 5min.
2. Verifique se aparece alerta em `/admin/security-alerts` (após
   integração com Cloud Function `onUserLoginFailed` — backlog).

---

## 8. Billing & Custódia

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-70 | Budget alert GCP configurado (R$ 500/dia)                                        | [PLATFORM_ADMIN]| ☐      |
| SEC-71 | Cloud Function `materializePostAdoptionTasks` materializa só `scheduled_for <= now+90d` | [AUTOMATED] | ☐      |
| SEC-72 | Storage: lifecycle rule para mover arquivos frios para Coldline após 90 dias     | [MANUAL]        | ☐      |
| SEC-73 | Cloud Scheduler jobs auditados mensalmente                                       | [PLATFORM_ADMIN]| ☐      |

---

## 9. Dependências & Supply Chain

| ID     | Check                                                                            | Tipo            | Status |
|--------|----------------------------------------------------------------------------------|-----------------|--------|
| SEC-80 | `npm audit` roda no CI, falhas críticas bloqueiam merge                          | [AUTOMATED]     | ☐      |
| SEC-81 | Dependabot / Renovate ativo (PRs de upgrade automáticos)                         | [MANUAL]        | ☐      |
| SEC-82 | Lockfile (`package-lock.json`) commitado                                         | [MANUAL]        | ☐      |
| SEC-83 | `functions/package.json` com `engines.node` fixado (Node 20)                     | [MANUAL]        | ☐      |

---

## 10. Checklist de Pré-Release (resumo executivo)

Para cada release de produção, os seguintes itens são **obrigatórios**:

- [ ] SEC-1 / SEC-2: App Check ativado em produção.
- [ ] SEC-10 / SEC-11: rate limit testado em staging.
- [ ] SEC-22: Firestore rules sem fall-through.
- [ ] SEC-24: `platform_security_alerts` RLS correto.
- [ ] SEC-40: audit_logs write-only.
- [ ] SEC-50 / SEC-51: storage hardening.
- [ ] SEC-60: política de senha validada.
- [ ] SEC-80: `npm audit` sem vulnerabilidades críticas.
- [ ] `npm test` verde (≥ 719 testes).
- [ ] `npm run lint` verde.
- [ ] `npm run build` verde.

---

## 11. Histórico de Auditorias

| Data       | Auditor            | Achados | Ações                                                |
|------------|--------------------|---------|------------------------------------------------------|
| 2026-07-11 | Viralata Coder (Fase 20) | —       | Estrutura inicial + rlsTest + storage rules + alerts |

> Adicione uma linha por auditoria. Achados críticos viram issues
> com label `security` e milestone da próxima release.
