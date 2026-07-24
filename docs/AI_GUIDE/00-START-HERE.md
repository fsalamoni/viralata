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

---

**Próxima leitura obrigatória**: `11-CORE-DIRECTIVES.md` (regras
invioláveis). Depois, `01-ARCHITECTURE.md` (visão geral do projeto).
