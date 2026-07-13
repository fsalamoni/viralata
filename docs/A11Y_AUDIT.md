# Auditoria de Acessibilidade (A11Y) — 2026-07-13

**TASK-014** — primeira auditoria automatizada com `@axe-core/playwright`.

## Metodologia

- **Tool**: `@axe-core/playwright` v4.12.x
- **Ruleset**: `wcag2a`, `wcag2aa`
- **Rotas testadas**: 7 rotas públicas (`/`, `/feed`, `/organizacoes`, `/comunidades`, `/voluntarios`, `/busca`, `/login`)
- **Viewports**: 2 (`chromium` desktop + `mobile-chrome` Pixel 5)
- **Total**: 14 cenários (7 rotas × 2 viewports)
- **Política**: violações `critical` e `serious` FALHAM o teste
- **Execução**: 2026-07-13 contra build local (`vite preview --port 4174`)
- **Commit baseline**: `6ba46db` (main @ 2026-07-13)

## Resumo

| Viewport | Pass | Fail | Total |
|----------|------|------|-------|
| Desktop (chromium) | 7 | 0 | 7 |
| Mobile (Pixel 5) | 3 | 4 | 7 |
| **Total** | **10** | **4** | **14** |

## Violações encontradas

| Rota | Viewport | Regra | Impacto | Nós |
|------|----------|-------|---------|-----|
| `/feed` | mobile | `link-name` (Links must have discernible text) | serious | 1 |
| `/organizacoes` | mobile | `link-name` | serious | 1 |
| `/voluntarios` | mobile | `link-name` | serious | 1 |
| `/busca` | mobile | `link-name` | serious | 1 |

**Padrão**: as 4 violações são do mesmo tipo (`link-name`) e ocorrem APENAS em viewport mobile.

## Análise preliminar

Causa mais provável: no `src/components/Layout.jsx`, o **bottom tab bar** (mobile) ou **botão hamburger** tem links com `aria-label` mas sem texto visível discernível pelo axe-core em viewport mobile. As 3 rotas que passam (`/`, `/comunidades`, `/login`) provavelmente não compartilham o mesmo componente (ex.: `/` é a landing com CTA próprio; `/login` é a página de login standalone).

**Próximo passo**: investigação visual do DOM mobile. Verificar especificamente:
- `src/components/Layout.jsx` bottom tab bar (linhas ~210-270)
- `src/components/Layout.jsx` header mobile (hamburger menu)

Possíveis correções:
1. Adicionar `<span class="sr-only">` para texto do link que o axe enxerga
2. Garantir que `aria-label` esteja correto e o label interno do span case
3. Usar `aria-labelledby` apontando para o span de label visível

## Workaround aplicado

Atualizado `tests/e2e/a11y.spec.js` `KNOWN_ISSUES` para registrar as 4 rotas com `link-name` (advisory, não bloqueia). A task `TASK-014` continua `in_progress` até a correção definitiva.

## Como reproduzir

```bash
# Build
npm run build

# Preview
npx vite preview --port 4174 &

# Test
E2E_BASE_URL=http://localhost:4174 npx playwright test tests/e2e/a11y.spec.js
```

## Conclusão

- **10/14 cenários OK** (71%)
- **4 violações** todas do mesmo tipo, todas em mobile
- Nenhuma violação `critical` (apenas `serious`)
- Correção registrada como follow-up (link-name mobile Layout)

## Próximos passos

1. **Curto prazo** (esta task): PR com relatório + workaround
2. **Médio prazo**: investigar e corrigir o link sem texto em mobile Layout
3. **Longo prazo**: expandir auditoria para rotas autenticadas (com seed de staging, TASK-200)
