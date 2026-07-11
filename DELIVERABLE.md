# DELIVERABLE · wt/e79e15ca @ 87d84b7

> Fix crítico do OrganizationAdminPanel + defensive coding + pacote legal v2
> Sessão: `mvs_311d078987d0414a90f57ef28b789b18` (Mavis root)
> Data: 2026-07-11 14:43 (America/Sao_Paulo)
> Worktree: `D:\viralata\.worktrees\wt-e79e15ca`
> Branch: `wt/e79e15ca` (3 commits ahead of main c0d2ffd)
> Push: OK (a66e030..87d84b7)

## 1. Scope

Resolver 3 problemas críticos reportados em produção + preparar a casa pra um sprint de 122 tasks granulares:

1. **TypeError "G is not a function"** em `/organizacoes/{id}/admin` (TASK-056)
2. **FirebaseError "query requires an index"** em `/comunidade/{id}` aba Eventos (TASK-057)
3. **Falta de defensive coding** no painel admin (TASK-068, TASK-069)

## 2. Arquivos modificados (628 inserções, 106 deleções)

| Arquivo | Mudança | Tasks |
|---|---|---|
| `src/modules/organizations/pages/OrganizationAdminPanel.jsx` | remove destructuring `useFeatureFlag`, adiciona `safeTabs` + `TabErrorBoundary` + `SafeTab` | 056, 068, 069 |
| `src/modules/organizations/pages/OrganizationAdminPanel.test.jsx` | mock `useFeatureFlag` corrigido (bool direto, não tuple) | 071 |
| `firestore.indexes.json` | composite index `community_events (community_id + starts_at)` | 057 |
| `src/modules/shelter/components/legal/SingleAcceptanceDialog.jsx` (novo) | modal genérico de aceite (texto + checkbox + assinatura + hash via Web Crypto) | 105 |
| `src/modules/organizations/pages/CreateClub.jsx` | integra SingleAcceptanceDialog + shelterOnboardingTerms no cadastro de abrigo | 104 partial |
| `src/modules/shelter/components/FostersList.jsx` | substitui `window.prompt` por SingleAcceptanceDialog | 104 partial |
| `src/modules/pets/components/AdoptionFormFill.jsx` | alinhamento com novo fluxo de aceite | 104 partial |

**Outros commits (a66e030, 5da437b, 6bab531)** já traziam o pacote legal v2 (5 páginas legais novas, LEGAL_PAGES 6→11, auditService com 8 actions, Onboarding com 3 checkboxes). Veja `git log wt/e79e15ca`.

## 3. Testes

| Comando | Resultado |
|---|---|
| `npm test` | 1359 / 1361 passando |
| Falhas pré-existentes | 2 em `formatExhibitionDateTime` (fuso horário) — não relacionadas |
| `npm run lint` | 0 erros |
| `npm run typecheck` | 0 erros |
| `npm run build` | success em 10.76s, 111 entries precache, 4287.81 KiB |
| Bundle hash | `index-BplvbLkP.js` (140.44 kB gzip 44.13 kB) |

## 4. Validação em produção

**Smoke test manual** (a fazer com flag OFF, antes de ativar SHELTER_LEGAL_TERMS_V1):

- [ ] Acessar `/organizacoes/TM9MBn5aFXgObfRZ39m9/admin` autenticado como admin
- [ ] Verificar que painel carrega sem erro de console
- [ ] Clicar em cada aba (overview, general, animals, feed, donations, finance, team, settings)
- [ ] Se `SHELTER_FOUNDATION + SHELTER_DASHBOARD/KANBAN/etc` ON, clicar nas tabs shelter
- [ ] Verificar que se uma tab quebrar, as outras continuam funcionando (TestErrorBoundary)

## 5. Reverter

```bash
git revert 87d84b7
# ou, para reverter todos os 3 commits à frente do main:
git reset --hard c0d2ffd  # CUIDADO: perde 87d84b7, a66e030, 5da437b
```

## 6. Próximos passos

| ID | Task | Status |
|---|---|---|
| TASK-073 a 075 | Deploy do firestore index `community_events` | ready |
| TASK-076 | Este DELIVERABLE.md | done (agora) |
| TASK-079 a 088 | Bloco E: legal docs v2 (12 docs completos, 5 já entregues) | 3 ready, 5 in_progress, 4 pending |
| TASK-089 a 098 | Bloco F: checkboxes + audit_log | ready (90% já feito pelo a66e030) |
| TASK-099 a 102 | Bloco H: footer links (5 de 6 prontos, falta "cookies") | ready |
| TASK-103 a 107 | Bloco I: clickwrap em 4 ações (1 de 4 pronto via SingleAcceptanceDialog) | ready |
| TASK-108 a 112 | Bloco J: CookieBanner audit | ready |
| TASK-113 a 117 | Bloco K: varredura completa LGPD | ready |
| TASK-118 a 125 | Bloco L: Smart Search Fase 18 | ready |

## 7. Coordination

- **Mensagem enviada a `mvs_f1e04f28717d42cdba05e221b7b4b6f3` (Viralata Coder)** confirmando subdivisão do board (122 tasks, 12 blocos). Coder mantém wt-legal-v2 em paralelo.
- **Mensagem enviada a `mvs_44f2762343f94f28b506f2f4c8c12eae` (wt-17ff480a)** confirmando in-sync com main + RISK-002 reduzido (wt-17ff480a é o próximo merge candidate).
- **RISK-002 atualizado**: probabilidade reduzida para medium (após cherry-pick de wt/e79e15ca em main).

## 8. Lições aprendidas

1. **Mock vs produção**: o test de OrgAdminPanel passou por meses porque o mock retornava tuple, mas produção retornava bool. Lição: contratos de hook DEVEM ser documentados e o mock deve refletir o contrato exato. TASK-071 mitigou com comentário inline.
2. **Defensive coding é barato**: o `safeTabs` helper custa 14 linhas e evita o tipo de crash que só aparece em produção (não em test). Vale o investimento.
3. **TabErrorBoundary > um único ErrorBoundary global**: erros em uma aba não devem derrubar o resto. Padrão a replicar em outros painéis (TASK-113).
4. **Subdivisão granular do board**: 55 → 122 tasks com 12 blocos dá visibilidade real. O usuário pediu literalmente "uma a uma em blocos independentes" e isso é o que foi entregue.

---

**Refs**: TASK-056, TASK-057, TASK-068, TASK-069, TASK-070, TASK-071, TASK-072, TASK-104, TASK-105, TASK-076
**FLAG**: SHELTER_LEGAL_TERMS_V1 (default OFF, não muda comportamento existente)
**Worktree**: wt/e79e15ca
**Bundle**: index-BplvbLkP.js
