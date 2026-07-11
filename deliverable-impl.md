# Deliverable — Fase 20 — Segurança Avançada (SHELTER_SECURITY_HARDENING)

> Snapshot local (worktree). O deliverable canônico vive em
> `/workspace/.mavis/plans/plan_5504e459/outputs/security-impl/deliverable.md`.

## Summary

Implementação completa do pacote de segurança avançada do Sistema
de Gestão do Abrigo, gateado pela feature flag `SHELTER_SECURITY_HARDENING`
(default OFF). Cobre 6 camadas de defesa em profundidade: Firebase
App Check (config), rate limiting em Cloud Functions, Firestore +
Storage rules com deny-by-default e type-check, alertas de segurança
em tempo real, script de validação RLS e checklist vivo de pentest.

**61 testes novos** (12 functions + 13 functions + 25 client + 11
security), **648+ testes totais passando**, lint limpo, build OK.

## Worktree

- Branch: `feat/shelter-20-security-hardening`
- Worktree path: `/workspace/viralata/.worktrees/feat-shelter-20-security-hardening`
- Base: `origin/main` @ `c4fff3b`
- Commit: `bd8d1e9` (NÃO pushed)
- Bundle hash: `bd8d1e9`

## Changed files

### Created (10)
- `functions/middleware/rateLimit.js` + `rateLimit.test.js` (12 testes)
- `functions/securityAlerts.js` + `securityAlerts.test.js` (13 testes)
- `functions/securityAlertsCore.js` (núcleo puro testável)
- `src/core/services/securityAlertsService.js` + `.test.js` (25 testes)
- `src/modules/admin/pages/SecurityAlerts.jsx`
- `tests/security/rlsTest.js` + `rlsTest.test.js` (11 testes)
- `docs/SECURITY_AUDIT.md`

### Modified (10)
- `functions/index.js` (withRateLimit no googleFormsWebhook + export triggerSecurityAlert)
- `functions/package.json` (comentário sobre express-rate-limit opcional)
- `functions/vitest.config.js` (alias para firebase-admin mock)
- `firestore.rules` (match /platform_security_alerts)
- `storage.rules` (deny-by-default explícito + type-check image/*|video/*)
- `src/App.jsx` (rota /admin/security-alerts)
- `src/modules/admin/pages/AdminDashboard.jsx` (link no painel)
- `.env.example` (App Check + Rate Limit vars)
- `.gitignore` (.mavis/)
- `vite.config.js` (vitest include tests/)

## Tests

| Suite | Tests | Status |
|------|------:|:------:|
| `functions/middleware/rateLimit.test.js` | 12 | ✅ |
| `functions/securityAlerts.test.js` | 13 | ✅ |
| `src/core/services/securityAlertsService.test.js` | 25 | ✅ |
| `tests/security/rlsTest.test.js` | 11 | ✅ |
| **New total** | **61** | ✅ |
| Full suite | 648+ | ✅ (1 flaky pre-existing) |
| `npm run lint` | — | ✅ |
| `npm run build` | — | ✅ |

## Definition of Done

- ✅ Rate limiting em Cloud Functions
- ✅ Security alerts (collection + service + UI)
- ✅ Storage rules deny-by-default
- ✅ RLS validation script
- ✅ Pentest checklist doc
- ✅ Lint limpo, 648+ testes passando, build OK
- ✅ `git commit` (NÃO push): `bd8d1e9`

Ver `/workspace/.mavis/plans/plan_5504e459/outputs/security-impl/deliverable.md`
para detalhes completos e notes para o verificador.
