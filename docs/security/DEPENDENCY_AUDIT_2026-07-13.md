# Auditoria de Dependências — 2026-07-13

**TASK-032** (npm audit + CI gate)

## Resumo executivo

`npm audit` no commit `1a7e988` (main @ 2026-07-13):

| Severidade | Count |
|------------|-------|
| critical   | 1     |
| high       | 6     |
| moderate   | 10    |
| low        | 1     |
| **total**  | **18** |

## Detalhes das vulnerabilidades high+ e critical

| Pacote | Sev | Descrição | Status |
|--------|-----|-----------|--------|
| `jspdf` | critical | ReDoS, DoS, Local File Inclusion | upgrade major (3.x) — pendente |
| `@grpc/grpc-js` | high | server crash via malformed request | upgrade major — pendente |
| `form-data` | high | CRLF injection | upgrade patch — pendente |
| `protobufjs` | high | DoS via unbounded recursive JSON | upgrade major — pendente |
| `vite` | high | `server.fs.deny` bypass on Windows (dev only) | upgrade patch — pendente |
| `ws` | high | uninitialized memory disclosure | upgrade patch — pendente |
| `xlsx` | high | SheetJS prototype pollution + ReDoS | 0.18.5 é a última no npm — manter mitigação atual (client-side, .xlsx apenas) |

## Mitigação atual

- `xlsx` 0.18.5: client-side parsing + validação de extensão (.xlsx). SheetJS
  parou de publicar no npm (última versão: 0.18.5 em 2024-10).
  CVEs: prototype pollution `GHSA-4r6h-8v6p-xvw6` + ReDoS `GHSA-5pgg-2g8v-p4x9`.
  Mitigação alternativa: tarball do CDN SheetJS (bloqueado por política de
  rede) OU troca para `exceljs` (TASK-016 detalhada).

## CI gate

Adicionado em `.github/workflows/security-audit.yml`:
- Roda em PRs e push para main
- Falha em vulnerabilidades high+ ou critical
- Roda também semanalmente (segunda 09:00 UTC) para alertas proativos

## Próximos passos

1. Upgrade de `jspdf` 2.5.2 → 3.x (breaking changes — PR dedicado com testes)
2. Upgrade de `@grpc/grpc-js` (transitivo do Firebase Admin)
3. Upgrade de `protobufjs` (transitivo do Firebase)
4. Upgrade de `vite` (dev only — risco baixo)
5. Upgrade de `ws` (transitivo)
6. Upgrade de `form-data` (transitivo)
