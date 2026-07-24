# QUICK_REFERENCE.md — Cheat Sheet

> **TL;DR** do projeto Viralata. Cole aqui sempre que precisar.

## §0. Comando único de setup (novo dev)

```bash
./scripts/setup-new-dev.sh
```

## §1. Comandos Canônicos

```bash
# DEV
npm run dev                          # Dev server (port 5173)
npx vitest run                       # Rodar TODOS os tests
npx vitest run src/modules/pets      # Rodar tests de um módulo
npx vitest --watch                   # Watch mode
npx vite build                       # Build produção

# VALIDAÇÃO
node scripts/audit-docs.mjs          # Roda 3 auditorias (lucide + aria-current + doc-refs)
node scripts/validate-lucide-imports.mjs
node scripts/audit-aria-current.mjs
node scripts/validate-doc-references.mjs
node scripts/generate-changelog.mjs --limit=30

# SETUP NOVO DEV
./scripts/setup-new-dev.sh

# SCRUM
node .harness/sync.cjs --fix         # Auto-sync após merge
node .harness/sync.cjs --check       # Verificar inconsistências
node .harness/scrum.cjs start TASK-XXX
node .harness/scrum.cjs done TASK-XXX

# DEPLOY
git push origin main                 # Trigger GitHub Actions
```

## §2. Workflow (1 task)

```bash
# 1. Branch
git checkout -b feature/TASK-XXX

# 2. Implementar
# ... código + tests + docs

# 3. Validar
npx vitest run
npx vite build
node scripts/audit-docs.mjs

# 4. Bump SW (se UI)
# vite.config.js, registerPwa.js, cleanupStaleCaches.js

# 5. Commit
git add .
git commit -m "feat(scope): description"

# 6. PR
git push origin feature/TASK-XXX
gh pr create

# 7. Após merge
node .harness/sync.cjs --fix
git add .harness/ public/
git commit -m "chore(scrum): sync after PR #XXX"
git push
```

## §3. Regras Invioláveis (TOP 10)

1. **NÃO prejudicar nada**. Calma, cautela, atenção.
2. **Feature flags para tudo**. Migração obrigatória.
3. **UX/UI é prioridade**. Pense no user.
4. **Bump SW** a cada deploy de UI.
5. **Runtime tests** para componentes críticos.
6. **Lucide imports** sempre validados.
7. **No emojis** em código/UI.
8. **No `window.location.reload()`** durante interação.
9. **Defense-in-depth**: UI + Hook + Service + Rules.
10. **Docs sempre atualizadas**.

## §4. Decisões D-* (TOP 10)

- **D-PET-SEQ-IMMUTABLE**: pet_seq nunca muda
- **D-PET-LOG-IMMUTABLE**: pet_audit_log append-only
- **D-PET-LOG-PER-CHANGE**: cada CRUD gera log
- **D-PET-NOTES-AUTHOR-DELETE**: autor ou platform_admin
- **D-PWA-STALE-UNREGISTER**: SWs antigos desregistrados
- **D-PWA-STALE-UNREGISTER-DEFER**: defer reload 5s
- **D-PWA-BUMP-ALWAYS-UI**: vN → vN+1 sempre
- **D-PET-DETAIL-RUNTIME-TEST**: runtime test OBRIGATÓRIO
- **D-FEATURE-FLAGS-OBRIGATORIAS**: tudo atrás de flag
- **D-USER-EMOJIS**: zero emojis

## §5. Estrutura de Pastas (Quick)

```
src/
├── App.jsx                    # Roteador (79 rotas)
├── components/                # 60+ UI
├── core/
│   ├── config/firebase.js
│   ├── pwa/                   # registerPwa, cleanupStaleCaches
│   ├── permissions/
│   ├── services/              # audit, error, observability
│   └── hooks/
└── modules/                   # 15 features
    ├── pets/
    ├── organizations/
    ├── communities/
    ├── shelter/
    ├── admin/
    ├── partners/
    ├── users/
    ├── chat/
    ├── notifications/
    ├── reports/
    ├── adopter/
    ├── adoption/
    ├── contracts/
    ├── interview/
    └── onboarding/

docs/AI_GUIDE/                 # ★ GUIA PRINCIPAL
├── 00-START-HERE.md           # começo
├── 11-CORE-DIRECTIVES.md      # regras invioláveis
└── ... (25 docs)

firestore.rules                # 2155 linhas, 104 match blocks
vite.config.js                 # SW filename aqui
.harness/SCRUM_TASKS.json      # tasks tracking
```

## §6. Firebase Rules Helpers (Quick)

```js
isAuth()                           // autenticado
isOwner(userId)                    // request.auth.uid == userId
isPlatformAdmin()                  // user.is_platform_admin == true
isClubOwner(clubId)                // role == 'owner' em club
isClubOwnerOrAdmin(clubId)         // owner || admin
canEditClubPets(clubId)            // ownerOrAdmin + permission 'animals'
canManagePet(petId)                // owner || org admin
```

## §7. Firestore Structure (TOP 10)

- `users/{uid}` — perfil user
- `pets/{petId}` — pet
  - `pet_audit_log/{logId}` — imutável
  - `pet_notes/{noteId}` — anotações
- `clubs/{clubId}` — ONG
  - `volunteers/{uid}` — roster
  - `donations/{id}` — doações
  - `mural/{id}` — posts
- `interests/{id}` — interesse adoção
- `adoptions/{id}` — adoção concluída
- `notifications/{id}` — in-app
- `audit_logs/{id}` — log admin
- `terms_acceptances/{id}` — LGPD
- `reports/{id}` — denúncias
- `partners/{id}` — publicitários

## §8. Stack (Quick)

| Camada | Stack |
|--------|-------|
| Frontend | React 18 + Vite 6.4 |
| Routing | React Router 6 |
| Server State | React Query 5 |
| UI | Tailwind 3 + shadcn/ui |
| Icons | lucide-react |
| Validation | Zod |
| Toasts | Sonner |
| Backend | Firebase (Auth, Firestore, Storage, Hosting, Functions) |
| Tests | Vitest + @testing-library/react |

## §9. Bundle Sizes (current)

| Item | Size |
|------|------|
| Total dist/ | 6.9MB |
| Largest chunk | 1.7MB (vendor) |
| Total chunks | 194 |
| SW v74 | 12825 bytes |
| Bundle principal | 250KB (index-*.js) |
| PetDetailV3 | 124KB |

## §10. GitHub URLs

- **Repo**: github.com/fsalamoni/viralata
- **Live**: https://viralata.web.app
- **Console**: https://console.firebase.google.com/project/viralata-4cf0b
- **CI**: github.com/fsalamoni/viralata/actions
- **Database**: `viralata` (DB id, not `(default)`)

## §11. SW Version

**Current**: sw-v74.js
**Last bump**: 2026-07-24
**Previous**: sw-v73.js (stale, will be unregistered on first load)

## §12. Bundle Hash (current)

`index-DXTVSWph.js` (deployed)
`PetDetailV3-mBXlOviK.js` (deployed)

## §13. SCRUM Stats

- **Total tasks**: 742
- **Done**: 711 (95.8%)
- **In progress**: 0
- **Ready**: 0
- **Pending**: 5
- **Backlog**: 26

## §14. URLs de Teste (produção)

- `https://viralata.web.app/feed` — feed público
- `https://viralata.web.app/pet/J6FqNRfke0KOZo9nPI5E` — pet
- `https://viralata.web.app/organizacoes` — ONGs
- `https://viralata.web.app/voluntarios/seja` — signup voluntário
- `https://viralata.web.app/denuncie` — denunciar
- `https://viralata.web.app/scrum` — SCRUM (admin)

## §15. Top 5 Erros Comuns

1. Esquecer de bump SW após mudança UI
2. Adicionar ícone no JSX sem import
3. Sem runtime test para componente crítico
4. Misturar `import` e `require` em tests
5. Esquecer de rodar `sync.cjs --fix` após merge

## §16. Top 5 Perguntas Frequentes

1. "Onde está X?" → `03-MODULES.md` ou `19-FAQ-AND-MISTAKES.md` §1.1
2. "Por que Y?" → `13-DECISIONS.md` (D-*) ou `19-FAQ-AND-MISTAKES.md` §1.3
3. "Como adiciono Y?" → `19-FAQ-AND-MISTAKES.md` §1.2 ou `EXAMPLE_FEATURE_V3.md`
4. "Como debug X?" → `14-TROUBLESHOOTING.md` ou `19-FAQ-AND-MISTAKES.md` §1.5
5. "Qual SW version?" → `06-PWA-CACHE.md` ou este doc §11

---

**Mais detalhes**: ver docs específicos em `docs/AI_GUIDE/`.
**Última atualização**: 2026-07-24
