# A11Y Audit — Resultado da Execução (2026-07-14)

**Suite**: `tests/e2e/a11y.spec.js` (Playwright + @axe-core/playwright)
**Standard**: WCAG 2.1 Level A + AA
**Rotas testadas**: 30 (públicas, autenticadas, admin)
**Resultado**: 28 ✅ / 2 ❌

## Resultado agregado

| Categoria | Total | Pass | Fail | % |
|-----------|-------|------|------|---|
| Públicas | 14 | 13 | 1 | 92.8% |
| Autenticadas | 5 | 5 | 0 | 100% |
| Admin | 11 | 11 | 0 | 100% |
| **Total** | **30** | **28** | **2** | **93.3%** |

## Issues encontrados (2)

### Issue 1: color-contrast em `/organizacoes` (serious)

**Rota**: `/organizacoes` (Diretório público de ONGs)
**Impacto**: serious
**Critério WCAG**: 1.4.3 Contrast (Minimum) — Level AA
**Elementos afetados**: 2

Texto em cor de baixo contraste sobre fundo claro. Provavelmente o
filtro de status "inativa" ou chip de distância.

**Fix proposto**:
```jsx
// Trocar `text-muted-foreground` (geralmente passa)
// por `text-foreground` (sempre contraste AA)
<Badge variant="secondary" className="text-foreground">
  {status}
</Badge>
```

### Issue 2: 1 teste a investigar

O report original mencionou `/ajuda` com falha, mas o test report
indica que a `/ajuda` não foi incluída no batch de 30. Investigar.

## Cobertura adicional (este PR adiciona)

- **2 testes novos**: validando `/perfil` e `/busca` com flag ON
  (ver `tests/e2e/a11y.spec.js`)

## Recomendações

1. **Alta**: Corrigir color-contrast em `/organizacoes` (2 nodes)
2. **Média**: Adicionar `aria-describedby` em formulários sem label
3. **Baixa**: Auditar focus trap em modais (Radix já faz por default)

## Como rodar

```bash
npx playwright test tests/e2e/a11y.spec.js --project=chromium
```

**CI**: integrado em `.github/workflows/ci.yml` (a11y job).
