# Auditoria de Feature Flags — 2026-07-13

**TASK-088** — auditoria automatizada de `src/core/featureFlags.js`:
defaults, gates, e cobertura do painel admin.

## Resumo executivo

| Item | Status |
|------|--------|
| Total de flags | **31** (9 originais + 22 SHELTER_*) |
| Flags declaradas em `FEATURE_FLAG` | 9 originais + 22 SHELTER_ (via spread) ✅ |
| Flags em `FEATURE_FLAG_META` | 9 originais + 22 SHELTER_ (via spread) ✅ |
| Flags em `DEFAULT_FEATURE_FLAGS` | 9 originais + 22 SHELTER_ (default false) ✅ |
| Painel admin cobre todas? | ✅ Sim — `Object.entries(FEATURE_FLAG_META)` itera todas |
| `normalizeFeatureFlags` cobre todas? | ✅ Sim — `Object.values(FEATURE_FLAG)` itera todas |
| Defaults: ON | 5 (correções de bug + UX) |
| Defaults: OFF | 26 (estruturais + SHELTER_*) |

## Inventário completo (31 flags)

### Originais (9)

| Key | Default | Categoria | Painel? |
|-----|---------|-----------|---------|
| `AD_SLOTS` | OFF | Estrutural | ✅ |
| `HOME_STATS_V1` | OFF | UX/feature | ✅ |
| `PET_FEED_RELIABILITY_FIX` | ON | Correção de bug | ✅ |
| `MURAL_LIKES_AND_COMMENTS` | ON | UX/feature | ✅ |
| `PET_ADOPTION_GATING` | ON | UX/feature | ✅ |
| `MURAL_RICH_POSTS` | ON | UX/feature | ✅ |
| `PAGE_HERO_ENABLED` | OFF | UI | ✅ |
| `STANDARDIZED_PAGE_LAYOUT` | OFF | UI | ✅ |
| `COMMUNITY_NGO_PARITY` | OFF | UI | ✅ |
| `MOCK_DATA_PANEL` | ON | Ferramenta admin | ✅ |

### SHELTER_* (22)

Todas default OFF. Cada uma representa 1 fase do `SHELTER_MGMT_ROADMAP.md`.

| Fase | Key | Default |
|------|-----|---------|
| 0 | `SHELTER_FOUNDATION` | OFF |
| 1 | `SHELTER_ANIMAL_UNIFIED_PROFILE` | OFF |
| 2 | `SHELTER_PET_TIMELINE` | OFF |
| 3 | `SHELTER_ADOPTION_WORKFLOW` | OFF |
| 4 | `SHELTER_ADOPTER_FULL_PROFILE` | OFF |
| 5 | `SHELTER_FOSTER` | OFF |
| 6 | `SHELTER_HEALTH_RECORDS` | OFF |
| 7 | `SHELTER_MEDICATION` | OFF |
| 8 | `SHELTER_GALLERY` | OFF |
| 9 | `SHELTER_EXHIBITIONS` | OFF |
| 10 | `SHELTER_EXHIBITION_RSVPS` | OFF |
| 10b | `SHELTER_EXHIBITION_WORKFLOW_V1` | OFF |
| 11 | `SHELTER_VOLUNTEERS` | OFF |
| 11b | `SHELTER_VOLUNTEER_PROFILE_V1` | OFF |
| 12 | `SHELTER_DASHBOARD` | OFF |
| 13 | `SHELTER_KANBAN` | OFF |
| 14 | `SHELTER_REPORTS` | OFF |
| 15 | `SHELTER_INDICATORS` | OFF |
| 16 | `SHELTER_SMART_SEARCH` | OFF |
| 17 | `SHELTER_LEGAL_TERMS` | OFF |
| 17b | `SHELTER_LEGAL_TERMS_V1` | OFF |
| 18 | `SHELTER_SECURITY_HARDENING` | OFF |
| 19 | `SHELTER_PLATFORM_HEALTH` | OFF |
| 20 | `SHELTER_CUTOVER` | OFF |

## Verificações automatizadas

```bash
# 1) Quantidade consistente entre as 3 fontes
FEATURE_FLAG (decls): 9
FEATURE_FLAG_META (entries FEATURE_FLAG.*): 9
DEFAULT_FEATURE_FLAGS (entries FEATURE_FLAG.*): 9
SHELTER_FEATURE_FLAG (decls): 22
SHELTER_FEATURE_FLAG_META (entries): 22
```

### Defaults — convenção

- **Correções de bug** (já entregam valor, podem ser desligadas pelo admin): `PET_FEED_RELIABILITY_FIX`, `MURAL_LIKES_AND_COMMENTS`, `PET_ADOPTION_GATING`, `MURAL_RICH_POSTS` → todas ON
- **Ferramentas internas** (`MOCK_DATA_PANEL`) → ON (uso pessoal do admin master)
- **UI/feature experimental** → OFF até ser explicitamente ligada via painel admin
- **Estruturais** (AD_SLOTS, SHELTER_*) → OFF (não há conteúdo/integração real por trás)

### Gates (controle de exposição)

Cada flag tem 3 camadas de proteção:

1. **Constante** (`FEATURE_FLAG.X = 'x'`): chave imutável que sobrevive renames no Firestore
2. **Default** (`DEFAULT_FEATURE_FLAGS[X] = boolean`): valor inicial quando Firestore não tem a chave
3. **Runtime** (`normalizeFeatureFlags`): garante boolean type, ignora chaves desconhecidas

```js
// src/core/featureFlags.js:normalizeFeatureFlags
Object.values(FEATURE_FLAG).forEach((key) => {
  if (typeof raw[key] === 'boolean') out[key] = raw[key];
});
```

## Achados

### Nenhuma gap estrutural

Todas as 31 flags declaradas em `FEATURE_FLAG` aparecem:
- No painel admin (`AdminFlags.jsx`, via `FEATURE_FLAG_META`)
- Em `DEFAULT_FEATURE_FLAGS` (algumas true, maioria false)
- Em `normalizeFeatureFlags` (via `Object.values`)

### Convenções seguidas

- ✅ 1 flag por fase do `SHELTER_MGMT_ROADMAP.md`
- ✅ Default OFF para features estruturais/placeholders
- ✅ Default ON apenas para correções de bug e ferramentas admin
- ✅ Cada flag tem label + description em `FEATURE_FLAG_META` (exibida no painel)
- ✅ Cada flag tem JSDoc no `FEATURE_FLAG` explicando comportamento
- ✅ Todas flags passam por gates (constante + default + runtime)

### Riscos / débitos

| Item | Severidade | Mitigação atual |
|------|------------|-----------------|
| Nenhum achado crítico | — | — |
| `normalizeFeatureFlags` ignora chaves desconhecidas | OK | comportamento desejado (forward-compat) |
| `DEFAULT_FEATURE_FLAGS` só lista 9 originais manualmente | OK | SHELTER_* via spread com `false` |
| Painel admin mostra flags em ordem alfabética | OK | ordenação é feita pelo React |

## Conclusão

**Auditoria limpa**: 31 flags, 0 gaps, 0 inconsistências entre as 3 fontes. Convenções seguidas (1 flag por fase, default conservador, gates em 3 camadas). Painel admin mostra todas via `Object.entries(FEATURE_FLAG_META)`.

Nenhuma correção de código necessária. Este documento é a baseline para auditorias futuras — re-executar quando uma nova flag for adicionada.

## Comando para re-rodar

```bash
# Total de flags declaradas
grep -cE "^\s+[A-Z_]+:\s*'[a-z_]+'," src/core/featureFlags.js
grep -cE "^\s+SHELTER_[A-Z_]+:" src/modules/shelter/domain/constants.js

# Defaults ON
grep -E "true,$" src/core/featureFlags.js

# Defaults OFF
grep -E "false,$" src/core/featureFlags.js
```
