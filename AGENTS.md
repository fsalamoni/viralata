# AGENTS.md — Mandamentos Permanentes · Projeto Viralata

> **Contrato-mestre entre TODAS as sessões e agentes AI que trabalham no projeto.**
> Lido por: Mavis, OpenCode, Codex, Cursor, Aider, Devin, Gemini CLI.
> **Nenhuma sessão pode ignorar este arquivo.** Mudanças aqui exigem decisão humana
> (PR com tag `agents-md-change` + entrada em `docs/AGENTS_CHANGELOG.md`).

---

## §0. Identidade do Projeto

- **Nome:** Viralata · React community platform (adoção responsável de pets)
- **Stack congelada:**
  - Frontend: React 18 + Vite + TanStack Query + Zod + shadcn/ui + TailwindCSS
  - Backend: Firebase (Auth + Firestore + Storage + Cloud Functions + App Check + Hosting)
  - Região: `southamerica-east1` (LGPD Brasil)
  - Testes: Vitest (unit) + Playwright (e2e)
  - **LGPD sempre em mente** — qualquer dado pessoal passa por DPO review.
- **Worktree sempre:** `git worktree add .worktrees/<id> -b feat/<domínio>-<fase>-<slug>`
- **Feature flag SHELTER_*** em qualquer feature nova, default OFF.
- **Testes verdes antes do commit** (`npm run smoke`).

---

## §1. Regra A — Avaliação Plena por Funcionalidade (5 EIXOS)

> **Toda funcionalidade criada, modificada ou auditada DEVE ser avaliada nos 5 eixos abaixo.**
> **Se UM eixo for esquecido, a funcionalidade está INCOMPLETA e NÃO pode ser marcada como `done`.**

A regra existe porque é fácil cair em "fiz a aba no painel, fim" — mas UX/UI plena, regras de
negócio sólidas, integrações funcionando e estado pós-deploy controlado exigem visão
**plena em todas as frentes** da plataforma. Voluntários em abrigo, por exemplo, não é só
"uma aba no painel admin do abrigo" — é:

- **UX (§1.1)**: página pública do abrigo com CTA de voluntário, perfil do voluntário com
  info, vitrine/evento com campo "vincular voluntários", painel admin com aba,
  empty/loading/error states, mobile + a11y.
- **Papéis (§1.2)**: anônimo, adotante, voluntário, foster, admin abrigo, platform admin,
  system — cada um com permissão explícita.
- **Regras (§1.3)**: Zod schema, Firestore rules (return explícito), auditoria, LGPD,
  snapshot, multi-tenant (shelter_id), rate limit.
- **Integrações (§1.4)**: Cloud Function que dispara email ao voluntário novo, FCM ao
  admin quando voluntário entra, search indexa voluntários, Storage para docs/termos
  assinados, Google Forms se aplicável.
- **Pós-deploy (§1.5)**: flag `SHELTER_VOLUNTEERS_V1` OFF por padrão, smoke test em
  produção com 1 abrigo, monitoramento, plano de rollback.

### §1.1 Eixo UX (User Experience) · UI/UI Excellence

- Páginas públicas (landing, busca, vitrine do pet, página do abrigo, página do evento)
- Painéis admin (painel do abrigo, painel da comunidade, painel do platform admin)
- Perfil do usuário (adotante, voluntário, foster)
- Modais, drawers, tooltips
- **Empty states**, **error states**, **loading states** (skeleton, spinner, shimmer)
- **Mobile + desktop + tablet** (responsive, touch targets >= 44px)
- **Acessibilidade (a11y):** keyboard nav, ARIA roles, contraste WCAG AA, screen reader
- **Microcopy** claro, tom de voz consistente
- **Onboarding contextual** (tooltips na primeira vez, empty state com CTA)
- **Notificações** (toast sucesso/erro, FCM push, email)
- **Empty state nunca é tela branca** — sempre tem CTA ou explicação
- **404 e 500** states são UX, não "página quebrada"

### §1.2 Eixo Papéis (Roles) · Comportamento por papel

Toda funcionalidade precisa definir comportamento **explícito** para cada papel.
A matriz de permissões fica em `src/modules/<domínio>/domain/permissions.js` ou similar.

| Papel | Descrição | Exemplo (voluntários) |
|---|---|---|
| `anonymous` | Sem login | Vê página pública do abrigo, CTA "Quero ser voluntário" → leva a signup |
| `adopter` | Usuário comum com perfil de adotante | Pode ver voluntários do abrigo, NÃO pode gerenciar |
| `volunteer` | Usuário com perfil de voluntário | Vê seu dashboard, suas tasks, seus eventos |
| `foster` | Lar temporário | Vê pets sob sua guarda, NÃO gerencia voluntários |
| `shelter_admin` | Admin de uma ONG (multi-tenant) | CRUD de voluntários do seu abrigo, aprovação, atribuição |
| `team_member` | Membro da equipe do abrigo | Permissões granulares (ex: `volunteers:read`, `volunteers:manage_status`) |
| `platform_admin` | Admin master da plataforma | CRUD global, métricas, suspensão |
| `system` | Cloud Functions, crons, jobs | Processa fila, dispara emails, gera relatórios |

**NUNCA** implemente feature sem antes listar como cada papel interage.
**NUNCA** assuma que "se não for shelter_admin, é blocked" sem documentar a UX do block.

### §1.3 Eixo Regras de Negócio (Business Rules)

- **Permissões granulares** (Zod schema) com `safeParse` + mensagens claras
- **Auditoria** — `audit_log` com `actor`, `action`, `target`, `timestamp`, `before/after`
- **LGPD:**
  - Consentimento explícito antes de coletar PII
  - Direito ao esquecimento (delete com anonimização)
  - Portabilidade (export JSON do perfil)
  - DPO review antes de qualquer campo novo de PII
- **Firestore rules:** toda função com `return` explícito, ZERO fall-through
- **Snapshot pattern:** `applicant_snapshot` imutável em applications (NUNCA mutar)
- **Multi-tenancy:** `shelter_id` em TODA collection de domínio (NUNCA cross-tenant leak)
- **Zod `.partial()`** não aceita `null` → pra nullificar, usar `FieldValue.deleteField()`
- **Single-field `collectionGroup`:** auto-criado pelo Firestore, NUNCA declarar em `firestore.indexes.json`
- **Post-adoption cron:** materializa só milestones com `scheduled_for <= now+90d`
- **Rate limit** em mutations sensíveis (ex: 5 tentativas de login por minuto)

### §1.4 Eixo Integrações (Integrations)

- **Google Forms** (auto-import de planilha, parser assistido por LLM opcional)
- **Storage** (upload de fotos de pets, docs de voluntários, termos assinados, contratos)
- **Cloud Functions** (triggers: onCreate user, onUpdate application, onWrite audit_log;
  scheduled: post-adoption milestones, digest diário, limpeza de sessões)
- **Search** (Firestore nativo + Algolia/Meili se aplicável; índice por shelter_id)
- **Email** (SendGrid/Resend — templates versionados, opt-out respeitado)
- **FCM** (push notifications: novo candidato, novo voluntário, novo evento, lembrete)
- **Webhooks externos** (ex: integração com veterinários, pet shops parceiros)
- **LGPD endpoints** (export PII, delete PII com confirmação dupla)

### §1.5 Eixo Estado Pós-Deploy (Production State)

- **Feature flag** `SHELTER_*` default **OFF** — ligar em 1 abrigo canário primeiro
- **Smoke test** em produção (script `scripts/smoke-prod.mjs` ou manual)
- **Monitoramento:**
  - Sentry (erros JS, unhandled promise rejection)
  - Firebase Analytics (funil de adoção, conversão)
  - Custom metrics (ex: tempo médio de aprovação de voluntário)
- **Rollback plan** documentado em `DELIVERABLE.md`
- **LGPD compliance check** antes de subir (DPO assina)
- **Auditoria de logs** — `audit_log` consultável pelo platform admin
- **Bundle hash** no PR description (ci-rollout verificável)
- **Backup** do Firestore antes de migrations destrutivas

### §1.6 Processo de Avaliação (5 passos)

1. **PLANEJAR** — listar TODOS os pontos nos 5 eixos antes de escrever código
2. **PESQUISAR** — ler código existente, identificar gaps (o que já existe, o que falta)
3. **REAVALIAR** — segunda opinião independente (4 olhos: outro agente ou peer review)
4. **UX/UI EXCELÊNCIA** — polish até passar bar quality (microcopy, empty states, mobile, a11y)
5. **PERSISTIR** — registrar achados no `SCRUM_TASKS.json` (status `ready` ou `in_progress`)

### §1.7 Anti-patterns PROIBIDOS (Regra A violada =)

- ❌ "Fiz só a aba no painel, fim" (esqueceu UX público/perfil/integrações)
- ❌ Criar feature sem empty/error/loading states
- ❌ Esquecer mobile ou a11y
- ❌ Hardcode de string sem i18n
- ❌ Sem Zod validation em mutations
- ❌ Sem LGPD em dados pessoais (consent, delete, export)
- ❌ Sem feature flag (default OFF)
- ❌ Sem smoke test em produção
- ❌ Sem auditoria em ações sensíveis
- ❌ Cross-tenant leak (shelter_id faltando em query)
- ❌ Snapshot mutado (deveria ser imutável)
- ❌ Firestore rule sem return explícito
- ❌ Marcar `done` sem smoke em prod
- ❌ Marcar `done` sem peer review (Regra A §1.6 passo 3)

---

## §2. Regra B — Auto SCRUM Update

> **Toda atividade de dev ATUALIZA o `SCRUM_TASKS.json` automaticamente.**
> **No INÍCIO e no FIM de cada task.** Sem exceção.
> **Lock:** se outra sessão estiver editando o batch, avise via `mavis communication send`.

### §2.1 Schema mínimo de uma task

```json
{
  "id": "TASK-XXX",                       // sequencial, não reusar
  "title": "Curto e imperativo",          // <= 80 chars
  "type": "feature|bug|refactor|docs|security|infra|debt|decision|chore",
  "category": "core|shelter|pets|orgs|community|admin|security|infra|design|kanban|lgpd|legal|docs|ci|test|perf|search",
  "status": "backlog|ready|in_progress|in_review|blocked|done|dropped",
  "priority": "critical|high|medium|low",
  "owner": "mvs_xxxxx | human | unassigned | human-jurídico",
  "branch": "feat/... | wt/... | null",
  "flag": "SHELTER_* | null",
  "worktree": ".worktrees/... | null",
  "pr": "#66 | null",
  "tags": ["regra-A", "ux", "lgpd"],
  "blockedBy": ["TASK-002"],
  "evidence": "caminho/URL",
  "description": "Markdown livre",
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "startedAt": "YYYY-MM-DD",              // quando virou in_progress
  "resolvedAt": "YYYY-MM-DD"              // quando virou done
}
```

### §2.2 Início de uma task (obrigatório)

```bash
# ANTES de criar o worktree / abrir o editor:
node -e "
const fs = require('fs');
const path = '.harness/SCRUM_TASKS.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const t = data.tasks.find(x => x.id === 'TASK-XXX');
Object.assign(t, {
  status: 'in_progress',
  owner: 'mvs_<sua-session>',
  branch: 'feat/shelter-<fase>-<slug>',
  worktree: '.worktrees/<id>',
  startedAt: new Date().toISOString().slice(0,10),
  updatedAt: new Date().toISOString().slice(0,10)
});
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('TASK-XXX → in_progress');
"
```

### §2.3 Fim de uma task (obrigatório)

Transição: `in_progress → in_review | done | blocked | dropped`

```bash
# DEPOIS de smoke verde + commit + push:
node -e "
const fs = require('fs');
const path = '.harness/SCRUM_TASKS.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const t = data.tasks.find(x => x.id === 'TASK-XXX');
const now = new Date().toISOString().slice(0,10);
Object.assign(t, {
  status: 'in_review',                   // ou done se mergeado
  owner: 'mvs_<sua-session>',
  evidence: '.harness/smoke/<id>.log',    // caminho do smoke verde
  updatedAt: now,
  resolvedAt: '<status===done>' ? now : undefined
});
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('TASK-XXX → in_review');
"
```

### §2.4 Lock de batch

Se for editar mais de 3 tasks em sequência:

```bash
# 1) Avise o root via mavis communication
mavis communication send --to <root-session> \
  --command prompt \
  --content "Vou editar batch SCRUM_TASKS.json: TASK-200..220. Lock 5min."

# 2) Edite
# 3) Libere
mavis communication send --to <root-session> \
  --command prompt \
  --content "Batch TASK-200..220 commitado. Lock liberado."
```

### §2.5 Auto-import do painel-scrum.html (TASK-202)

> **O painel-scrum.html importa automaticamente o SCRUM_TASKS.json toda vez que ele é atualizado.**

Implementado em:
- `sync.cjs --watch` (polling mtime 750ms + re-embed no HTML)
- `sync.cjs --watch --serve` (HTTP :8731 com CORS pra browser fazer polling)
- `painel-scrum.html` ganhou pill `#auto-sync-pill` + botão `#btn-reload` + script `autoSync()`
- `package.json` expõe scripts: `sync`, `sync:fix`, `sync:check`, `sync:watch`, `sync:serve`

Atalhos:
```bash
npm run sync:check     # valida JSON + auto-campos
npm run sync:fix       # corrige auto-campos (resolvedAt, updatedAt)
npm run sync:watch     # watch em SCRUM_TASKS.json
npm run sync:serve     # serve + watch (browser auto-reload)
```

### §2.6 Daemon de communication (autosync.cjs)

Observa `mavis communication` em background, atualiza SCRUM_TASKS quando:
- Sibling cita TASK-XXX / MR#N → adiciona evento no `history`
- Sibling reporta FAIL → loga em `metrics.failAuditor`
- Sibling reporta DONE → loga em `metrics.deliveryLog`
- Sessão termina (peer `status=finished`) → marca `lastActiveAt`

```bash
node .harness/autosync.cjs               # contínuo (60s)
node .harness/autosync.cjs --once        # varre uma vez
node .harness/autosync.cjs --interval 30 # custom
```

### §2.7 Git hooks (install-hooks.cjs)

```bash
node .harness/install-hooks.cjs          # instala pre-commit + post-commit
```

Pre-commit: valida SCRUM_TASKS.json (`npm run sync:check`).
Post-commit: loga o commit na `metrics.commitLog` da task correspondente.

---

## §3. Onde Tudo Vive

| Arquivo / Pasta | O quê |
|---|---|
| `AGENTS.md` | **Este arquivo — mandamentos permanentes** |
| `docs/AGENTS_CHANGELOG.md` | Histórico de mudanças em AGENTS.md |
| `.harness/SCRUM_TASKS.json` | Source of truth — dataset machine-readable (130+ tasks) |
| `.harness/SCRUM_PROTOCOL.md` | Protocolo detalhado (espelha a aba "Protocolo" do painel) |
| `.harness/painel-scrum.html` | UI visual do SCRUM (auto-import ON) |
| `.harness/sync.cjs` | Validador + sync (--watch, --serve) |
| `.harness/autosync.cjs` | Daemon de communication → SCRUM_TASKS |
| `.harness/install-hooks.cjs` | Git hooks installer |
| `docs/SHELTER_MGMT_ROADMAP.md` | Roadmap de fases (Fase 0–22) |
| `docs/ROADMAP.md` | Roadmap paralelo (design system Fase 0–3) |
| `docs/AUDIT_2026-07-11.md` | Auditoria inicial |
| `docs/AUDIT_DEEP_2026-07-11.md` | Auditoria profunda (Regra A) |
| `docs/DELIVERABLE.md` | Entregáveis por fase |
| `firestore.rules` | Rules com return explícito |
| `firestore.indexes.json` | Índices compostos (NUNCA single-field collectionGroup) |
| `src/modules/<domínio>/domain/permissions.js` | Matriz de permissões por papel |

---

## §4. Comunicação Inter-Sessão

```bash
mavis communication send \
  --from <sua-session> \
  --to <target-session> \
  --command prompt \
  --content "TASK-XXX owner=eu, branch=feat/shelter-X-slug, deadline=YYYY-MM-DD. Não tocar em: TASK-YYY (em paralelo). Bloqueio em TASK-ZZZ."
```

**Princípios:**
- Mensagem de mudança de status de task: **broadcast** pros peers ativos
- Mensagem de conflito iminente: **direto** pro peer dono do arquivo
- Mensagem de decisão humana pendente: **direto** pro root session
- Mensagem de "merge done": **broadcast** (liberar recursos)

---

## §5. Mudanças neste Arquivo (BREAKING)

- Qualquer mudança em `AGENTS.md` é **BREAKING** para todas as sessões ativas.
- Requer:
  1. **Decisão humana** (PR com tag `agents-md-change`)
  2. **Entrada em `docs/AGENTS_CHANGELOG.md`** (data, autor, diff, justificativa)
  3. **Broadcast** pra todas as sessões ativas avisando da mudança
  4. **Re-leitura** por todas as sessões antes de continuar trabalho

**Nenhuma sessão pode editar `AGENTS.md` unilateralmente.**

---

## §6. Histórico de Versões

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0.0 | 2026-07-11 | Mavis root session (mvs_311d078987d0414a90f57ef28b789b18) | Mandato inicial: Regra A (5 eixos) + Regra B (auto SCRUM update) gravados como mandamento permanente. Atende pedido do usuário 2026-07-11 21:30. |

---

> **LEMBRE-SE:** Regra A + Regra B são **invioláveis**. Se você é uma sessão AI lendo
> este arquivo, ele é seu contrato de trabalho. Siga-o em 100% das tasks.
> Se encontrar uma task que viola Regra A ou B, PARE e avise o root.
