# 15-RECENT-FIXES.md — Últimos 30 Dias

> **Atualizado em 2026-07-24**
>
> Documento vivo. **SEMPRE** verificar antes de fixar um bug — pode já
> ter sido corrigido.

---

## §1. Hotfixes PWA em Cadeia (2026-07-22)

### §1.1. sw-v72.5 — MessageSquare undefined

**Data**: 2026-07-22
**Severidade**: ALTA (quebrava PetDetailV3 em produção)
**Sintoma**: `MessageSquare is not defined` ao abrir detalhe de pet.
**Causa raiz**: `MessageSquare` adicionado ao JSX mas não ao import
de `lucide-react`. Build (Vite + tree-shaking) não pegou.
**Fix**: adicionar ao import + script de validação.
**D-**: `D-PET-OPS-LUCIDE-IMPORT`.
**Arquivos**:
- `src/modules/pets/pages/PetDetailV3.jsx`
- `scripts/validate-lucide-imports.mjs` (NEW)

**Commits**:
- sw-v72.5 fix

### §1.2. sw-v73.1 — Auto-unregister stale SWs

**Data**: 2026-07-22
**Severidade**: MÉDIA (UX ruim, não quebrava)
**Sintoma**: bundle deployed correto mas user via bundle stale.
**Causa raiz**: SW v72 cacheado, check contra URL inexistente → HTML
fallback → update falhava silenciosamente.
**Fix**: `unregisterStaleAndMaybeReload()` no `window 'load'`.
**D-**: `D-PWA-STALE-UNREGISTER`.

### §1.3. sw-v73.2 — Unregister ALWAYS

**Data**: 2026-07-22
**Severidade**: MÉDIA
**Sintoma**: sw-v73.1 não funcionava.
**Causa raiz**: `if (!PWA_ENABLED) return` early-return impedia a
lógica de unregister.
**Fix**: refatorar para rodar SEMPRE.
**D-**: `D-PWA-UNREGISTER-ALWAYS`.

### §1.4. sw-v73.3 — canEdit ReferenceError

**Data**: 2026-07-22
**Severidade**: ALTA (quebrava `/pets/<id>`)
**Sintoma**: `ReferenceError: canEdit is not defined`.
**Causa raiz**: `canEdit` renomeado para `canEditHistory` em escopo do
componente, mas usado na linha 770 com nome antigo.
**Fix**: `canEdit` → `canEditHistory` em `PetDetailV3.jsx:770`.
**D-**: `D-PET-DETAIL-RUNTIME-TEST` (runtime test teria pego).
**Arquivos**:
- `src/modules/pets/pages/PetDetailV3.jsx`
- `src/modules/pets/pages/PetDetailV3.runtime.test.jsx` (NEW)

### §1.5. sw-v73.3 — Defer Reload

**Data**: 2026-07-22
**Severidade**: ALTA (UX destrutivo)
**Sintoma**: "trava" na página /voluntarios/seja ao clicar em "Aceitar
e continuar" após digitar.
**Causa raiz**: reload de 50ms disparava no meio de interação.
**Fix**: track user activity via `pwa-stale-last-activity` (sessionStorage).
Se interagiu < 5s, defer 5s.
**D-**: `D-PWA-STALE-UNREGISTER-DEFER`.

---

## §2. Auditoria Completa 2026-07-23

### §2.1. Test fixes (4 testes quebrados)

| # | Test | Problema | Fix |
|---|------|----------|-----|
| 1 | `ShelterAdminDashboard.test.jsx` | Importava named export mas só tem `export default` | `.default` no dynamic import |
| 2 | `searchService.test.js` (foster) | Esperava `fosters` mas TASK-312 introduziu `search_fosters` | Atualizar para `search_fosters` |
| 3 | `volunteerAssignmentService.test.js` | Misturava `import` ESM e `require` CJS | Converter para ESM puro |
| 4 | `ErrorState.test.jsx` | Esperava prop `message` mas usa `title`/`description` | Atualizar para `title`/`description` |

**Commits**:
- `3bfad320` — fix(tests): corrige 3 testes
- `604bc6d2` — fix(tests): ErrorState prop mismatch + docs

### §2.2. Documentação (3 docs atualizados + 1 novo)

| Doc | Mudança |
|-----|---------|
| `docs/AI_CONTEXT.md` | Adicionado sw-v72.5..sw-v73.3 hotfixes |
| `docs/ROADMAP.md` | Seção "Hotfixes PWA em cadeia" + sw-v73 |
| `docs/AUDITS/AUDIT_FULL_2026-07-23.md` (NEW) | Relatório completo |

---

## §3. Pet Ops V3 — TASK-V3-PET-OPS-LOG (2026-07-22)

### §3.1. sw-v72.4 — Pet Ops V3

**Data**: 2026-07-22
**Severidade**: N/A (feature)
**Descrição**: TASK-V3-PET-OPS-LOG — implementar sistema completo de
gestão de pets para admins.

**Componentes novos**:
- `src/modules/pets/services/petLogService.js` (NEW)
- `src/modules/pets/services/petNotesService.js` (NEW)
- `src/modules/pets/services/petTimelineService.js` (NEW)
- `src/modules/pets/components/PetLog.jsx` (NEW)
- `src/modules/pets/components/PetNotes.jsx` (NEW)
- `src/modules/pets/components/PetTimelineView.jsx` (NEW)
- `src/modules/organizations/components/PetsOpsTable.jsx` (NEW)

**Modificações**:
- `src/modules/pets/pages/PetDetailV3.jsx` — 3 novas tabs + hash router
- `src/modules/pets/services/petService.js` — `getNextPetSeq()` + log em CRUD
- `firestore.rules` — regras para pet_log, pet_notes, pet_seq_counter

**Tests novos**:
- `petLogService.test.js`
- `petNotesService.test.js`
- `petTimelineService.test.js`
- `PetNotes.runtime.test.jsx`
- `PetLog.runtime.test.jsx`
- `PetTimelineView.runtime.test.jsx`
- `PetsOpsTable.runtime.test.jsx`

**PR**: #198
**Documentação**: `docs/REGENCY_PET_OPS_V3.md`

---

## §4. Outros Fixes Recentes (resumo)

### §4.1. sw-v72 — PetDetailView V3 Redesign

**Data**: 2026-07-22
**PR**: #194
**Descrição**: redesign completo do PetDetailView (público).
**D-**: `D-PET-PUBLIC-V2-HERO`, `D-PET-PUBLIC-V2-SEM-ADMIN`.

### §4.2. sw-v72.1 — PetDetailView Polish

**Data**: 2026-07-22
**PR**: #195
**Descrição**: ajustes finos no PetDetailView.

### §4.3. sw-v72.2 — GENDER_LABEL Restore

**Data**: 2026-07-22
**PR**: #196
**Descrição**: `GENDER_LABEL[pet.gender] || pet.gender` para fallback.
**D-**: `D-LABEL-FALLBACK`.

### §4.4. sw-v72.3 — ClubDetail Painel Fix

**Data**: 2026-07-22
**PR**: #197
**Descrição**: 1 botão Painel no topo, link `/organizacoes/` (plural).
**D-**: `D-CLUB-DETAIL-PANEL-UNICO`, `D-LINK-PLURAL-ORGS`.

---

## §5. Histórico Compacto (TASK anteriores)

### §5.1. TASK-022 (V3 Redesign Loop v2)

- 16/16 páginas redesignadas
- Documentação V3 (21 V3s)
- Feature flags implementadas

### §5.2. TASK-V3-PARTNER-1

- 11 sprints (paralelo PickleRush)
- Espaço publicitário
- LGPD compliant

### §5.3. TASK-V3-PET-DETAIL-VIEW

- PetDetailView V3
- 4 sub-tasks (TASK-001 a TASK-004)

### §5.4. BUGS-15..31

- 17 bugs corrigidos
- sw-v63/v64/v65/v66

---

## §6. Métricas (2026-07-24)

| Métrica | Valor |
|---------|-------|
| Total tests passing | ~1700+ |
| Total test files | 189 |
| Total source files | 839 |
| Total docs | 80+ (com AI_GUIDE: ~95) |
| Total tasks SCRUM done | 711/742 (95.8%) |
| Bundle deployed | sw-v73 (12825 bytes) |
| Bundle principal | index-DKT4N-aG.js (250541 bytes) |
| Routes | 79 |
| Match blocks (Firestore rules) | 104 |
| Hotfixes PWA cadeia | 5 (sw-v72.5..sw-v73.3) |

---

## §7. Workflow de Adicionar a este Doc

Quando um bug for corrigido:

1. Identificar seção apropriada (PWA, Test, UI, etc)
2. Adicionar entrada com:
   - Data
   - Severidade
   - Sintoma
   - Causa raiz
   - Fix
   - D-* relacionada (se aplicável)
   - Commits
3. Se a D-* não existir, criar em `13-DECISIONS.md`
4. Commitar + push + deploy

---

**Próxima leitura**: `16-AGENT-ONBOARDING.md` (onboarding).
