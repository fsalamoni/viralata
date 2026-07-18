# V3 Redesign Loop — Cron Auto-Trigger

> **OBJETIVO**: Refazer cada página da plataforma, uma a uma, no padrão V3
> (DS-V2, flag própria por página, lazy load, doc de regência, anti-fachada).

## REGRAS INVARIÁVEIS (NUNCA VIOLAR)

1. **Worktree SEMPRE**: criar branch `v3-redesign/<page>-task-<n>` antes de mexer.
2. **Anti-fachada INVIOLÁVEL**: diff < 10 linhas OU < 2 arquivos = REJEITADO.
3. **Feature flag por página**: 1 flag `V3_PAGE_<KEY>` já existe (NÃO criar nova).
4. **Lazy load OBRIGATÓRIO** (D-VITE-LAZY-01): `React.lazy()` com dynamic import.
5. **Doc de regência OBRIGATÓRIO** (D-DOC-REGENCY-01): `docs/REGENCY_<PAGE>_V3.md` (12+ seções).
6. **Análise FUNCIONALIDADE POR FUNCIONALIDADE** antes de implementar.
7. **PWA SW bump** OBRIGATÓRIO: `sw-v<N> → sw-v<N+1>` em `vite.config.js`.
8. **SEMPRE validar build local** antes de commit (anti HOTFIX-003).
9. **SEMPRE validar deploy** com `curl` + checar `index-XXX.js` hash mudou.
10. **SCRUM update** OBRIGATÓRIO: `node .harness/scrum.cjs done/start/review` + `sync.cjs --fix`.

## WORKFLOW POR PÁGINA (REPETIR)

### Passo 1: Análise (NUNCA pular)
- Ler a página V1 INTEIRA (`src/.../pages/<Page>.jsx`)
- Ler o doc de funcionalidade relacionado (`docs/SHELTER_MGMT_ROADMAP.md`, `docs/PLAN_*.md`, etc)
- Identificar TODAS as features que DEVEM estar lá
- Para cada feature: já existe? está completa? há lacuna? está quebrada?
- Criar `docs/V3_<PAGE>_QUESTIONS.md` com Q&A + decisões D1-D12

### Passo 2: Implementar V3
- Criar `<Page>.v3.jsx` (componente novo, do zero, seguindo DS-V2)
- Criar `src/components/<page>/` com sub-componentes (se necessário)
- Atualizar `<Page>.jsx` wrapper com `React.lazy` + flag `V3_PAGE_<KEY>`
- Renomear V1 atual para `<Page>.v1.jsx` (cuidado com `git mv`)

### Passo 3: Regência
- Criar `docs/REGENCY_<PAGE>_V3.md` (12+ seções obrigatórias):
  0. Identidade (rota, componente, flag, auth)
  1. Estrutura visual (mobile-first, 1 col → 2 col md+)
  2. Funcionalidades (V1 mantidas + V3 novas)
  3. Componentes utilizados (V3 novos + DS_V2)
  4. Camadas de dados (data layer)
  5. UX/UI (decisões)
  6. Estados (loading/empty/error)
  7. Acessibilidade WCAG 2.1 AA
  8. Performance
  9. Padrões de design
  10. Risks & Mitigations
  11. Métricas de sucesso
  12. Próximas evoluções

### Passo 4: Testes
- Mínimo 10 testes novos para o `<Page>.v3.jsx`
- Cobrir: render básico, fallback, loading, error, edge cases
- Rodar `npx vitest run src/.../<Page>.v3*` local até verde

### Passo 5: Build + Commit
- `npm run build` local — VALIDAR que termina com "built in" sem erros
- Checar `dist/assets/<Page>-XXX.js` existe e tem conteúdo
- `git add -A` + commit descritivo

### Passo 6: Push + Deploy
- `git push origin main` (workflow do GitHub Actions faz build+deploy)
- Esperar 5-10min
- Validar com `curl https://viralata.web.app/<rota>` + checar `index-XXX.js` mudou

### Passo 7: SCRUM
- `node .harness/scrum.cjs done TASK-XXX`
- `node .harness/sync.cjs --fix`
- Commit + push

## ORDEM DAS PÁGINAS (Fila)

| # | Página | Flag | Status |
|---|---|---|---|
| ✅ 1 | Feed (/) | V3_PAGE_FEED | DONE TASK-920 |
| ✅ 2 | PetDetail (/pets/:id) | V3_PAGE_PET_DETAIL | DONE TASK-927 |
| ✅ 3 | Legal (/termos, /politica-privacidade, etc) | V3_PAGE_LEGAL | DONE TASK-930 |
| 🔜 4 | **Home** (/) | V3_PAGE_HOME | NEXT |
| 🔜 5 | **Login** (/login) | V3_PAGE_LOGIN | AFTER HOME |
| 🔜 6 | **Profile** (/perfil) | V3_PAGE_PROFILE | AFTER LOGIN |
| 🔜 7 | **Chat** (/chat) | V3_PAGE_CHAT | |
| 🔜 8 | **Adoption** (/adocao) | V3_PAGE_ADOPTION | |
| 🔜 9 | **CommunityDetail** (/comunidades/:slug) | V3_PAGE_COMMUNITY_DETAIL | |
| 🔜 10 | **ClubDetail** (/organizacoes/:id) | V3_PAGE_CLUB_DETAIL | |
| 🔜 11 | **Search** (/busca) | V3_PAGE_SEARCH | |
| 🔜 12 | **Events** (/eventos) | V3_PAGE_EVENTS | |
| 🔜 13 | **Foster** (/lar-temporario) | V3_PAGE_FOSTER | |
| 🔜 14 | **Volunteer** (/voluntarios) | V3_PAGE_VOLUNTEER | |
| 🔜 15 | **Mural** (/mural) | V3_PAGE_MURAL | |
| 🔜 16 | **Admin** (/admin) | V3_PAGE_ADMIN | |
| 🔜 17 | **OrgAdmin** | V3_PAGE_ORG_ADMIN | |
| 🔜 18 | **CommunityAdmin** | V3_PAGE_COMMUNITY_ADMIN | |
| 🔜 19 | **ShelterAdmin** | V3_PAGE_SHELTER_ADMIN | |

## ERROS QUE NÃO DEVO REPETIR

1. **HOTFIX-003 (2026-07-17)**: `git stash` removeu arquivo criado via `write`.
   → SEMPRE verificar `ls` após `stash`/`pop`.

2. **HOTFIX-001 (2026-07-17)**: DEFAULT_FEATURE_FLAGS=true sem migração.
   → Se ativar flag no DEFAULT, FAZER migração em `migrateLegacyFlags`.

3. **HOTFIX-002 (2026-07-17)**: SW velho servindo bundle novo.
   → SEMPRE bump `sw-v<N> → sw-v<N+1>` em `vite.config.js`.

4. **D-VITE-LAZY-01 (2026-07-17)**: Vite constant folding eliminou V3 do bundle.
   → SEMPRE `React.lazy()` com dynamic import (não if/else estático).

5. **HOTFIX-002 follow-up (2026-07-17)**: `topbar auto-update` workflow NÃO faz build.
   → SEMPRE validar `index-XXX.js` hash mudou após deploy.

## ANTI-FACHADA (CHECKLIST)

- [ ] Diff > 10 linhas E > 2 arquivos (rejeitar caso contrário)
- [ ] Componentes NOVOS criados (não só editar)
- [ ] Pelo menos 1 feature NOVA visível (não só refactor)
- [ ] Doc de regência COMPLETO (12+ seções)
- [ ] Testes NOVOS > 5 (não só smoke test)
- [ ] Bundle CHUNK V3 existe e tem conteúdo (>1KB)

## COMO EXECUTAR ESTE LOOP

O cron abaixo dispara o prompt para a próxima página da fila a cada 6 horas.

```bash
# Listar próxima página
NEXT=$(node .harness/v3-redesign-next.cjs)
echo "Próxima página: $NEXT"

# Disparar agente (a cada 6h)
# O agente lê este arquivo, escolhe a próxima página da fila, e executa passos 1-7
```
