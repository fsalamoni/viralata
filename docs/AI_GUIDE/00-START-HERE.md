# 00-START-HERE.md — Documento de Leitura Obrigatória

> **⚠️ ATENÇÃO IA / DESENVOLVEDOR**: Este é o **PRIMEIRO documento que você
> DEVE ler** antes de fazer QUALQUER alteração no projeto Viralata.
>
> Ele te orienta:
> 1. **O QUE** é a plataforma e suas regras invioláveis
> 2. **COMO** navegar na documentação existente (qual ler, em qual ordem)
> 3. **ONDE** encontrar módulos, padrões e convenções
> 4. **COMO** codificar, testar, commitar, mergear e deployar
> 5. **O QUE** evitar (armadilhas comuns)
> 6. **COMO** manter a documentação sempre atualizada

---

## §0. Regra de Ouro

> **Antes de tocar em código, leia os 3 documentos desta seção §0.**
> Antes de commitar, releia-os.
> Antes de declarar "tarefa concluída", releia-os.

| # | Documento | O que tem | Quando ler |
|---|-----------|-----------|-----------|
| 1 | `00-START-HERE.md` (este) | Meta-guia, índice, fluxo de trabalho | **SEMPRE** |
| 2 | `11-CORE-DIRECTIVES.md` | Regras invioláveis, princípios, engineering HOT | **ANTES de qualquer mudança** |
| 3 | `10-SCRUM.md` | Regra A (sync), Regra B (varredura), comandos | **SEMPRE após task concluída** |

---

## §1. Mapa de Leitura por Tipo de Tarefa

### §1.1. Vou mexer em frontend (página, componente, hook)

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `11-CORE-DIRECTIVES.md` — regras invioláveis
3. `01-ARCHITECTURE.md` — camadas, Vite, PWA, testes
4. `02-DATA-MODEL.md` — coleções, campos
5. `05-DESIGN-SYSTEM.md` — tokens, cores, tipografia
6. `12-CODING-STANDARDS.md` — padrões de código
7. **Módulo específico** (ex: `modules/15-PETS.md`)

### §1.2. Vou mexer em backend (Firestore rules, Cloud Functions)

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `11-CORE-DIRECTIVES.md`
3. `02-DATA-MODEL.md` — schema completo
4. `07-FIRESTORE-RULES.md` — regras atuais, helpers
5. `09-DEPLOY.md` — como deployar rules/functions

### §1.3. Vou mexer em PWA / Service Worker

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `11-CORE-DIRECTIVES.md` (seção §5.3 PWA)
3. `06-PWA-CACHE.md` — história de hotfixes, decisões
4. `09-DEPLOY.md` — bump SW, deploy

### §1.4. Vou deployar

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `09-DEPLOY.md` — workflow completo

### §1.5. Vou fazer auditoria / varredura

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `14-TROUBLESHOOTING.md` — problemas comuns e fixes
3. `13-DECISIONS.md` — decisões D-* (não reverter sem motivo)
4. `15-RECENT-FIXES.md` — últimos 30 dias

### §1.6. Vou começar do zero (novo dev/IA)

**Ordem de leitura**:
1. `00-START-HERE.md` (este)
2. `16-AGENT-ONBOARDING.md` — passo-a-passo para começar

---

## §2. Fluxo de Trabalho (Workflow)

### §2.1. Workflow de uma Tarefa

```
1. LER docs relevantes (ver §1)
2. CRIAR branch: git checkout -b feature/<nome>
3. PLANEJAR: o que vou mudar, quais arquivos, quais testes
4. IMPLEMENTAR: código + testes
5. VALIDAR:
   - npx vitest run <modulo>
   - npx vite build
6. ATUALIZAR docs: se mudou rota, atualizar 04-PAGES-ROUTES.md;
   se mudou schema, atualizar 02-DATA-MODEL.md; etc.
7. COMMIT: mensagem descritiva
8. PUSH: trigger GitHub Actions → deploy automático
9. SCRUM SYNC: node .harness/sync.cjs --fix
10. VALIDAR EM PRODUÇÃO: verificar bundle deployed
```

### §2.2. Regra de Ouro do SCRUM (NUNCA ESQUEÇA)

> **REGRA A**: Após MERGE de PR (qualquer task concluída),
> rodar `node .harness/sync.cjs --fix` para auto-sync do SCRUM_TASKS.json.
>
> **REGRA B**: A cada ~10 tasks, rodar `node .harness/sync.cjs` (sem --fix)
> para verificar tasks `ready` que já foram mergeadas.

### §2.3. Regra de Ouro do PWA

> SEMPRE que bumpar uma feature que toca UI, bumpar o SW:
> vN → vN+1 em `vite.config.js`, `registerPwa.js`, `cleanupStaleCaches.js`.
> Adicionar vN na lista de stale (preserva apenas vN+1).

### §2.4. Regra de Ouro dos Testes

> **D-PET-DETAIL-RUNTIME-TEST**: para CADA página/componente crítico,
> criar `*.runtime.test.jsx` que renderiza com dados mockados. **Static
> analysis + imports tests não substituem runtime tests.**

---

## §3. Índice da Documentação

### §3.1. Documentos Essenciais (nesta pasta)

| # | Arquivo | Tamanho | Descrição |
|---|---------|---------|-----------|
| 00 | `00-START-HERE.md` | este | Meta-guia (você está aqui) |
| 01 | `01-ARCHITECTURE.md` | ~6KB | Camadas, Firebase, PWA, testes, CI/CD |
| 02 | `02-DATA-MODEL.md` | ~15KB | Coleções, campos, relacionamentos |
| 03 | `03-MODULES.md` | ~10KB | O que cada módulo faz, fluxos |
| 04 | `04-PAGES-ROUTES.md` | ~12KB | 79 rotas documentadas |
| 05 | `05-DESIGN-SYSTEM.md` | ~8KB | Tokens, paleta, tipografia |
| 06 | `06-PWA-CACHE.md` | ~10KB | Service Worker, hotfixes sw-vN |
| 07 | `07-FIRESTORE-RULES.md` | ~8KB | Regras + helpers |
| 08 | `08-TESTING.md` | ~10KB | Padrões de teste, runtime tests |
| 09 | `09-DEPLOY.md` | ~8KB | GitHub Actions, Firebase Hosting |
| 10 | `10-SCRUM.md` | ~6KB | Regra A/B, comandos |
| 11 | `11-CORE-DIRECTIVES.md` | ~35KB | Regras invioláveis, engineering HOT |
| 12 | `12-CODING-STANDARDS.md` | ~10KB | Padrões, nomenclatura, estrutura |
| 13 | `13-DECISIONS.md` | ~15KB | Decisões D-* (não reverter) |
| 14 | `14-TROUBLESHOOTING.md` | ~12KB | Problemas comuns, fixes |
| 15 | `15-RECENT-FIXES.md` | ~8KB | Últimos 30 dias |
| 16 | `16-AGENT-ONBOARDING.md` | ~10KB | Passo-a-passo novo dev/IA |
| 17 | `17-AUDIT-2026-07-23.md` | ~12KB | Relatório varredura completa |
| 18 | `18-REGENCY-INDEX.md` | ~6KB | Índice de todos os REGENCY_*.md |

### §3.2. Documentos por Módulo (subpasta `modules/`)

| # | Arquivo | Módulo | Linhas |
|---|---------|--------|--------|
| 01 | `modules/01-PETS.md` | Pets (feed, detalhe, CRUD, log) | ~6KB |
| 02 | `modules/02-ORGANIZATIONS.md` | Organizações (ONGs, abrigos) | ~5KB |
| 03 | `modules/03-COMMUNITIES.md` | Comunidades (mural, fórum) | ~4KB |
| 04 | `modules/04-SHELTER.md` | Shelter (gestão abrigos) | ~7KB |
| 05 | `modules/05-ADMIN.md` | Admin (painel plataforma) | ~4KB |
| 06 | `modules/06-PARTNERS.md` | Parceiros (espaço publicitário) | ~3KB |
| 07 | `modules/07-USERS.md` | Users (perfil, auth) | ~3KB |
| 08 | `modules/08-CHAT.md` | Chat (mensageria) | ~3KB |
| 09 | `modules/09-NOTIFICATIONS.md` | Notificações (FCM) | ~3KB |
| 10 | `modules/10-REPORTS.md` | Denúncias (maus-tratos) | ~3KB |
| 11 | `modules/11-ADOPTER.md` | Adopter (público adotante) | ~3KB |
| 12 | `modules/12-ADOPTION.md` | Adoção (fluxo wizard) | ~3KB |
| 13 | `modules/13-CONTRACTS.md` | Contratos (termos) | ~3KB |
| 14 | `modules/14-INTERVIEW.md` | Entrevistas (shelter) | ~2KB |
| 15 | `modules/15-ONBOARDING.md` | Onboarding (novo user) | ~2KB |

### §3.3. Documentos Legados (em `docs/`)

> Documentos anteriores foram **organizados** em `docs/AI_GUIDE/`.
> Os originais em `docs/` foram **migrados** quando relevantes e
> **marcados como deprecated** quando substituídos.
> **REGRA**: novos documentos vão em `docs/AI_GUIDE/`. Documentos
> legados podem ser consultados, mas o conteúdo canônico está no
> AI_GUIDE.

---

## §4. Comandos Canônicos (referência rápida)

```bash
# === Desenvolvimento ===
npx vitest run src/modules/pets    # Testar módulo específico
npx vitest run                     # TODOS os testes
npx vite build                     # Build de produção
node scripts/validate-lucide-imports.mjs   # Validar imports de ícones

# === SCRUM ===
node .harness/sync.cjs --fix       # Auto-sync (após merge de task)
node .harness/sync.cjs --check     # Verificar inconsistências
node .harness/scrum.cjs done TASK-ID    # Marcar task como done
node .harness/scrum.cjs start TASK-ID   # Marcar task como in_progress

# === PWA / SW ===
# Para bumpar SW (sempre que mexer em UI):
# 1. vite.config.js: filename: 'sw-vN.js' → 'sw-vN+1.js'
# 2. registerPwa.js: const swUrl = 'sw-vN+1.js'
# 3. cleanupStaleCaches.js: adicionar vN na STALE_SW_NAMES

# === Deploy ===
git push origin main   # Trigger GitHub Actions → Firebase Hosting
```

---

## §5. Princípios Invioláveis (resumo rápido)

> Para lista completa, ver `11-CORE-DIRECTIVES.md`.

1. **NÃO prejudique nada**. Funcionalidade, banco, dados — nada.
2. **Feature flags sempre**. Tudo novo atrás de flag, ativada no admin.
3. **Prevenir e prever**. Pense em falhas ANTES de entregar.
4. **UX/UI é prioridade**. User experience vem antes de código bonito.
5. **MERGES + DEPLOYS AUTOMÁTICOS**. Push em main = deploy.
6. **Testes runtime > static**. Static analysis não pega variáveis
   undefined declaradas no escopo do componente.
7. **Documentação sempre atualizada**. Toda mudança → doc correspondente.
8. **Não reintroduzir bugs**. Antes de fix, leia 15-RECENT-FIXES.md.

---

## §6. Estrutura de Pastas do Projeto

```
viralata/
├── .github/workflows/         # GitHub Actions (deploy, scrum)
├── .harness/                  # SCRUM_TASKS.json, scripts de sync
├── public/                    # Arquivos estáticos (sw.js legacy, scrum.html)
├── docs/                      # Documentação
│   ├── AI_GUIDE/              # ★ GUIA PRINCIPAL (você está aqui) ★
│   │   ├── 00-START-HERE.md   # este arquivo
│   │   ├── 01-ARCHITECTURE.md
│   │   ├── 02-DATA-MODEL.md
│   │   ├── ... (18 documentos)
│   │   └── modules/           # Docs por feature modular (15)
│   ├── REGENCY_*.md           # Specs V3 (uma por feature)
│   ├── V3_*_QUESTIONS.md      # Q&A por feature V3
│   ├── AUDITS/                # Relatórios de auditoria
│   ├── AGENTS_CHANGELOG.md    # Histórico de mudanças
│   └── *.md (legados)
├── src/
│   ├── App.jsx                # Roteador (79 rotas)
│   ├── main.jsx               # Bootstrap, ErrorBoundary
│   ├── components/            # 60+ componentes UI
│   ├── core/                  # config, hooks, services, pwa, observability
│   ├── modules/               # 15 features modulares
│   ├── pages/                 # Páginas (wrappers V1/V3)
│   └── hooks/, utils/, domain/
├── firestore.rules            # 2155 linhas, 104 match blocks
├── vite.config.js             # SW bump manual aqui
└── package.json
```

---

## §7. Como Reportar Problemas

### §7.1. Bug encontrado

1. Verificar se é bug novo ou reintroduzido (ler `15-RECENT-FIXES.md`)
2. Documentar: arquivo, linha, sintoma, causa raiz
3. Aplicar fix + runtime test que pega o bug
4. Atualizar `14-TROUBLESHOOTING.md` e `13-DECISIONS.md` (se aplicável)
5. Commitar + push + SCRUM sync

### §7.2. Performance issue

1. Medir antes (Lighthouse, DevTools Performance)
2. Identificar bottleneck (bundle, hydration, image)
3. Aplicar fix (code splitting, lazy loading, image optimization)
4. Medir depois
5. Documentar em `01-ARCHITECTURE.md` (se mudou arquitetura) ou
   `12-CODING-STANDARDS.md` (se é padrão)

### §7.3. UX/UI issue

1. Verificar `05-DESIGN-SYSTEM.md` para tokens
2. Verificar `14-TROUBLESHOOTING.md` para problemas conhecidos
3. Aplicar fix consistente com design system
4. Documentar em `05-DESIGN-SYSTEM.md` (se é decisão de design)

---

## §8. Glossário

### §8.1. Termos Técnicos

- **V1 / V3**: primeira e terceira geração de páginas (V2 foi skip).
  Wrappers em `src/pages/*.jsx` decidem qual renderizar via feature flag.
- **sw-vN**: versão N do Service Worker. Bump a cada deploy de UI.
- **pet_seq**: ID imutável e global de um pet (1, 2, 3, ...). Diferente
  do `id` do Firestore (que é o `documentId`).
- **canManage**: helper que retorna `true` se user pode editar o pet.
  Combina: `isOwner || isOrgAdminWithPermission`.
- **D-***: Decisão documentada (D-PET-SEQ-IMMUTABLE, D-PWA-STALE-UNREGISTER, etc).
  Sempre que tomar uma decisão importante, criar uma D-*.
- **Regra A/B/C**: regras do SCRUM (sync, varredura, etc).
- **withLayout**: HOC que aplica TopBar + BottomTabBar + Footer.
  Obrigatório para páginas públicas; admin pages podem omitir.
- **NGO**: Non-Governmental Organization (abrigo/ONG parceira).
- **LGPD**: Lei Geral de Proteção de Dados (Brasil).
- **Runbook**: documento passo-a-passo para executar tarefa rotineira.
- **PWA**: Progressive Web App. App que funciona offline e pode ser
  instalado como app nativo.
- **Precache**: cache de assets críticos do app, gerado pelo workbox.
- **skipWaiting + clientsClaim**: opções do workbox para forçar novo
  SW imediatamente.
- **Hash Router**: navegação por URL com `#` (ex: `/pets/123#log`).
  Usado em tabs do PetDetailView.
- **Feature Flag**: toggle que ativa/desativa feature sem deploy.
  Configurado no Firestore `platform_settings/`.
- **FLAG_MIGRATION_VERSION**: versão do schema de feature flags.
  Bump quando muda flags existentes.
- **Defense-in-Depth**: múltiplas camadas de validação (UI + Hook +
  Service + Rules).

### §8.2. Siglas

- **API**: Application Programming Interface
- **CI/CD**: Continuous Integration / Continuous Deployment
- **CSS**: Cascading Style Sheets
- **CTA**: Call to Action (botão de ação)
- **DB**: Database
- **DOM**: Document Object Model
- **E2E**: End-to-End (test)
- **Firestore**: Firebase NoSQL database
- **GH Actions**: GitHub Actions (CI/CD)
- **HOC**: Higher-Order Component
- **HTML**: HyperText Markup Language
- **JS**: JavaScript
- **JSON**: JavaScript Object Notation
- **JSX**: JavaScript XML (React)
- **LCP**: Largest Contentful Paint (Web Vitals)
- **LGPD**: Lei Geral de Proteção de Dados
- **MOC**: Module of Concern (padrão)
- **MVP**: Minimum Viable Product
- **NGO**: Non-Governmental Organization
- **NoSQL**: Not Only SQL (database)
- **PR**: Pull Request
- **PWA**: Progressive Web App
- **QA**: Quality Assurance
- **RTE**: Rich Text Editor
- **SEO**: Search Engine Optimization
- **SLA**: Service Level Agreement
- **SPA**: Single Page Application
- **SQL**: Structured Query Language
- **SSR**: Server-Side Rendering
- **SW**: Service Worker
- **TBD**: To Be Determined
- **TDD**: Test-Driven Development
- **TS**: TypeScript
- **UI**: User Interface
- **UX**: User Experience
- **WCAG**: Web Content Accessibility Guidelines
- **WIP**: Work In Progress
- **WSL**: Windows Subsystem for Linux

### §8.3. Acrônimos do Projeto

- **AI_GUIDE**: Pasta de documentação-guia (`docs/AI_GUIDE/`)
- **SCRUM**: Task tracking em `.harness/SCRUM_TASKS.json`
- **V3**: Terceira geração de páginas (V1 é legacy, V2 foi skip)
- **D-***: Decisões documentadas em `13-DECISIONS.md`

---

## §9. Próximas Ações Recomendadas

(nenhuma imediata)

**Próxima leitura obrigatória**: `11-CORE-DIRECTIVES.md` (regras
invioláveis). Depois, `01-ARCHITECTURE.md` (visão geral do projeto).

---

## §10. Como Continuar a Documentação

### §10.1. Adicionar Novo Documento

1. Escolher número (próximo disponível: 19, 20, ...)
2. Criar `docs/AI_GUIDE/<NN>-<NAME>.md`
3. Adicionar entrada em `INDEX.md`
4. Adicionar referência em `00-START-HERE.md` §3.1
5. Commitar + push + deploy

### §10.2. Adicionar Novo Módulo

1. Criar `docs/AI_GUIDE/modules/<NN>-<NAME>.md` (próximo número)
2. Adicionar entrada em `03-MODULES.md` §2
3. Adicionar referência em `INDEX.md`
4. Documentar: visão geral, funcionalidades, componentes, services,
   hooks, schema, tests
5. Commitar + push + deploy

### §10.3. Adicionar Nova Decisão (D-*)

1. Identificar decisão importante
2. Adicionar em `13-DECISIONS.md` com formato:
   ```md
   ### D-NOME-CURTO (YYYY-MM-DD)

   **Contexto**: ...
   **Decisão**: ...
   **Consequências**: ...
   **Alternativas consideradas**: ...
   ```
3. Adicionar referência em `11-CORE-DIRECTIVES.md` (se aplicável)
4. Adicionar em `15-RECENT-FIXES.md` (se for fix)
5. Commitar + push + deploy

### §10.4. Corrigir Bug

1. Verificar se já foi corrigido (`15-RECENT-FIXES.md`)
2. Documentar em `15-RECENT-FIXES.md` com:
   - Data, severidade, sintoma, causa raiz, fix
   - D-* relacionada (se aplicável)
3. Adicionar test que pega o bug (runtime test preferível)
4. Se for D-*, adicionar em `13-DECISIONS.md`
5. Commitar + push + deploy + SCRUM sync

### §10.5. Adicionar Nova Rota

1. Adicionar rota em `src/App.jsx`
2. Adicionar entrada em `04-PAGES-ROUTES.md`
3. Se for admin, adicionar guard
4. Se for V3, criar wrapper V1/V3 em `src/pages/`
5. Commitar + push + deploy

### §10.6. Adicionar Nova Coleção Firestore

1. Adicionar schema em `02-DATA-MODEL.md`
2. Adicionar regras em `firestore.rules` (com helpers se necessário)
3. Adicionar índices em `firestore.indexes.json` (se query composta)
4. Adicionar service em `src/modules/<módulo>/services/`
5. Adicionar tests para service
6. Testar com emulator
7. Commitar + push + deploy + deploy rules
   (`firebase deploy --only firestore:rules`)

### §10.7. Adicionar Novo Componente

1. Criar em `src/components/` (geral) ou
   `src/modules/<módulo>/components/` (específico)
2. Adicionar em `05-DESIGN-SYSTEM.md` se for primitivo
3. Criar `*.runtime.test.jsx` (componentes críticos)
4. Commitar + push + deploy

---

## §11. Como Validar Antes de Declarar "Pronto"

```bash
# 1. Tests
npx vitest run

# 2. Build
npx vite build

# 3. Validações
node scripts/validate-lucide-imports.mjs
node scripts/audit-aria-current.mjs
node scripts/validate-doc-references.mjs

# 4. Auditoria combinada
node scripts/audit-docs.mjs

# 5. Bundle deployed
curl -m 10 -s https://viralata.web.app/sw-v74.js | head -3
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -1

# 6. SCRUM sync (após merge)
node .harness/sync.cjs --fix
```

**Tudo verde?** Então está pronto. Commitar + push + deploy.

---

**Próxima leitura obrigatória**: `11-CORE-DIRECTIVES.md` (regras
invioláveis). Depois, `01-ARCHITECTURE.md` (visão geral do projeto).
