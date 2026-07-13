# Auditoria de Acessibilidade (a11y) — Viralata

## Status atual

**Suite**: `tests/e2e/a11y.spec.js` (Playwright + @axe-core/playwright)  
**Standard**: WCAG 2.1 Level A + AA (`wcag2a`, `wcag2aa` tags)  
**Política**: violações `critical` e `serious` FALHAM o teste. `moderate`/`minor` são logadas como advisory.

## Cobertura

### Rotas públicas (16 rotas)

- `/` Home
- `/feed` Feed de pets
- `/organizacoes` Diretório de ONGs
- `/comunidades` Lista de comunidades
- `/comunidade/:id` Detalhe público
- `/voluntarios`, `/voluntarios/termo`, `/voluntarios/seja`
- `/busca` Smart Search
- `/login`, `/cadastro`
- `/termos`, `/politica-privacidade`, `/legislacao`
- `/ajuda`
- `/page-not-found` 404

### Rotas autenticadas (5 rotas)

- `/perfil` Perfil do usuário
- `/minhas-adoções` Histórico
- `/meus-pets` Pets do adotante
- `/meus-interesses` Interesses
- `/adoptions` Dashboard pós-adoção (TASK-289)

### Rotas admin (9 rotas)

- `/admin`, `/admin/saude`, `/admin/pets`, `/admin/denuncias`,
  `/admin/usuarios`, `/admin/organizacoes`, `/admin/comunidades`,
  `/admin/metricas`, `/admin/auditoria`

**Total**: 30 rotas cobertas.

## Como rodar

```bash
# Local (build + preview + teste)
npm run build
npx vite preview --port 4174 &
E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test tests/e2e/a11y.spec.js

# CI (Playwright GitHub Action)
# Disparado automaticamente em PR + push
```

## Violações conhecidas (KNOWN_ISSUES)

| Rota | Violação | Status | Task |
|------|----------|--------|------|
| `/feed` | `link-name` | advisory | pendente |
| `/organizacoes` | `link-name` | advisory | pendente |
| `/voluntarios` | `link-name` | advisory | corrigido em TASK-249 |
| `/busca` | `link-name` | advisory | pendente |
| `/comunidade/:id` | `link-name` | advisory | pendente |
| `/meus-pets` | `link-name` | advisory | pendente |
| `/perfil` | `link-name` | advisory | pendente |
| `/admin/pets` | `link-name` | advisory | pendente |

## Resultados (CI última execução)

[Atualizado pelo CI a cada run]

- **critical**: 0 ❌ (target: 0)
- **serious**: 0 ❌ (target: 0)
- **moderate**: TBD
- **minor**: TBD

## Histórico

- 2026-07-13 — TASK-191: expandido para 30 rotas (16 public + 5 auth + 9 admin)
- 2026-07-XX — TASK-014: relatório inicial + primeira suite (TASK-199)
- 2026-07-XX — TASK-249: contraste do primary token corrigido
- Pendente — Eliminar `link-name` advisories (~8 rotas)
