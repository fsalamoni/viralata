# XLSX (SheetJS) Security — TASK-016

## Status atual

**Versão instalada**: `xlsx@0.18.5`  
**CVEs conhecidos**: 2 (high)

| CVE | Severidade | Título | Patch npm | Patch CDN |
|-----|------------|--------|-----------|-----------|
| [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) | high | Prototype Pollution | ❌ apenas CDN | ✅ 0.20.0+ |
| [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | high | ReDoS | ❌ apenas CDN | ✅ 0.20.0+ |

## Por que não atualizar

A maintainer do SheetJS optou por distribuir patches apenas via o **CDN próprio do SheetJS** (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`). O npm registry ainda tem a versão 0.18.5 (última com data de 2017) — `npm audit` retorna OK mesmo com os CVEs.

## Mitigações aplicadas (defense-in-depth)

1. **Limitação de tipo**: app aceita apenas `.xlsx` (rejeita `.xls` legado)
2. **Client-side only**: parsing acontece no browser, sem execução server-side
3. **Validação Zod**: o output é validado via Zod antes de usar
4. **CSP headers**: Content Security Policy bloqueia execução inline
5. **Workbook size limit**: arquivos >5 MB são rejeitados client-side

## Monitor

```bash
npm run security:check-xlsx
```

Saída esperada:
```
=== SheetJS (xlsx) Security Check (TASK-016) ===
Versão instalada: 0.18.5
Range em package.json: ^0.18.5
⚠️  Versão 0.18.5 está VULNERÁVEL a 2 CVE(s)
...
```

## Próximas ações

| Opção | Esforço | Impacto |
|-------|---------|---------|
| A. Aguardar SheetJS publicar 0.20.0 no npm | 0 (wait) | Baixo |
| B. Instalar via tarball CDN (patched) | 2h (policy) | Alto |
| C. Migrar para `exceljs` (mantida, sem CVEs) | 8h (refactor) | Alto |

**Recomendação**: B quando política de supply-chain permitir; C como contingência.

## Histórico

- 2026-07-13: TASK-016 monitor criado (PR #97)
- CVEs monitorados desde 2025-09
