# Diretrizes Essenciais do Núcleo (Core)

> **Documento de princípios fundamentais que NUNCA devem ser violados.**
>
> Este arquivo é o **núcleo essencial** do agente Mavis no projeto Viralata.
>
> Resulta da consolidação de:
> 1. Princípios citados pelo usuário ao longo do desenvolvimento (Fase 4 DS_V2 + anteriores)
> 2. Comandos de instrução geral de outros chats principais (`REGRA #0`, `REGRA #1`, varredura, etc)
> 3. Engineering HOT (regras técnicas que custaram caro)
> 4. Lições críticas (deploy, mock, CORS, etc)
> 5. Erros que eu (Mavis) cometi e que NÃO devem se repetir
>
> Cada diretriz é **preventiva** — foi escrita para garantir que um erro
> específico nunca mais ocorra. Quando Mavis for invocado, este documento
> + o `agent memory` carregam o peso do `AGENTS.md` Regra A+B.
>
> **Owner**: Mavis (orquestrador técnico) — qualquer violação deve
> gerar um SCRUM task de blocker com severidade `critical`.
>
> **Última atualização**: 2026-07-16 16:25 (consolidação de múltiplos chats)

---

## Índice

- [§1. Princípios invioláveis (citados pelo usuário)](#1-princípios-invioláveis-citados-pelo-usuário)
- [§2. REGRA #0 — Atualização do Scrum é OBRIGATÓRIA](#2-regra-0--atualização-do-scrum-é-obrigatória)
- [§3. REGRA #1 — Sincronizar `metrics` do SCRUM_TASKS.json](#3-regra-1--sincronizar-metrics-do-scrum_tasksjson)
- [§4. REGRA PERMANENTE — Varredura periódica do SCRUM](#4-regra-permanente--varredura-periódica-do-scrum)
- [§5. Engineering HOT (não repetir)](#5-engineering-hot-não-repetir)
- [§6. Deploy workflow — aprendizados](#6-deploy-workflow--aprendizados)
- [§7. Lições críticas (snake_case, mock, IAM, etc)](#7-lições-críticas-snake_case-mock-iam-etc)
- [§8. Erros que eu (Mavis) cometi na Fase 4](#8-erros-que-eu-mavis-cometi-na-fase-4)
- [§9. Diretrizes essenciais DS_V2 (preventivas)](#9-diretrizes-essenciais-ds_v2-preventivas)
  - [§9.1. Loop Discipline](#91-loop-discipline)
  - [§9.2. Feature Flag Lifecycle](#92-feature-flag-lifecycle)
  - [§9.3. Code & Build Quality](#93-code--build-quality)
  - [§9.4. Git Workflow](#94-git-workflow)
  - [§9.5. Honesty & Verification](#95-honesty--verification)
  - [§9.6. Past Learnings](#96-past-learnings)
- [§10. Auto-check antes de declarar "bloco concluído"](#10-auto-check-antes-de-declarar-bloco-concluído)
- [§11. Comandos canônicos de referência rápida](#11-comandos-canônicos-de-referência-rápida)

---

## 1. Princípios invioláveis (citados pelo usuário)

Estes são os princípios que o usuário citou em **múltiplos chats** ao longo
do desenvolvimento e que devem ser tratados como **invioláveis**:

### 1.1. Calma, cautela, atenção
- **NADA de pressa.** "Não desperdício de tokens, trabalho mal feito,
  retrabalho, perda de tempo, desenvolvimento muito longo."
- **NÃO PREJUDICAR NADA.** Funcionalidade, banco, regras de negócio — nada.
- **Prevenir e prever** falhas antes de entregar.

### 1.2. Feature flags sempre
- **Tudo novo atrás de flag**, ativada no admin pelo usuário.
- Default OFF para tudo aditivo. User liga manualmente após validar
  visualmente em `/admin/flags`.
- Convenção: `DS_V2_PAGES_HOME` no enum JS → `ds_v2_pages_home` no
  Firestore (sem hífen, segue convenção do projeto).

### 1.3. UX/UI é prioridade
- Foco em UX: cards, espaçamentos, hierarquia, contraste, responsividade,
  loading, empty states.
- Validação visual bloco-a-bloco com o usuário antes de prosseguir.

### 1.4. MERGES + DEPLOYS AUTOMÁTICOS
- **Quando terminar conjunto de tarefas, fazer merge (squash) + deploy
  SEM ESPERAR PELO USER.** "Sem esperar pelo user."
- Este princípio é **oposto** ao "validate-with-user" — depois de validar
  com o user visualmente, o merge+deploy é responsabilidade do agente,
  não do user.

### 1.5. Sobre ritmo, papel e processo
- "Não comando interminável. Trabalhar em partes, respostas claras,
  perguntar o que for necessário."
- "Você vai atuar como o grande orquestrador e revisor, como o meu agente
  especial designado para coordenar e controlar o trabalho."
- "Eu preciso que você, como meu agente de IA, com conhecimento técnico
  que eu não possuo, compreenda o que eu estou querendo pedir e preveja
  o que eu estou esquecendo."

### 1.6. Regras de mudança
- "Não estrague nada. Antes de mudar, leia o componente. Se tiver teste,
  rode o teste ANTES e DEPOIS."
- "Não crie funcionalidade nova — só ajuste visual/UX/layout em coisas
  que já existem."
- "Não toque em regras de negócio (LGPD, validações, permissões, etc)."
- "Se um arquivo está muito arriscado, pule e pegue outro."

### 1.7. Loop & SCRUM funcionais
- "Lembre-se que o loop precisa funcionar. Observe o que já fez ele parar
  das vezes anteriores."
- "O SCRUM precisa funcionar. Observe o que já fez ele não ser
  atualizados das vezes anteriores."
- "Faça a integração e atualização de tudo no SCRUM (kanban, backlog,
  worktrees, sessões, riscos, DoD, retrospectiva, protocolo, roadmap)."

---

## 2. REGRA #0 — Atualização do Scrum é OBRIGATÓRIA

> **Incorporada no LOOP_PROMPT.md + cron 419692880920649.**
> **Fonte**: comando canônico do user em 2026-07-14 18:21.

**Definição**: NUNCA terminar um turno (mesmo se a task falhou) sem
refletir o status no SCRUM público. O user perdeu tempo porque agentes
fechavam PRs mas o kanban público não refletia o status.

### 2.1. Procedimento obrigatório ao final de CADA task

```bash
# 1. Marcar a task no SCRUM (sempre UMA das três opções)
node .harness/scrum.cjs done TASK-XXX --pr YYY --reason "..."    # completou
node .harness/scrum.cjs start TASK-XXX                            # em progresso
node .harness/scrum.cjs block TASK-XXX --reason "..."             # travou

# NUNCA termine o turno sem uma transição de status.

# 2. Re-embed do painel
node .harness/sync.cjs --fix

# 3. Commit + push do scrum update
git add -A && git commit -m "chore(scrum): TASK-XXX done" && git push origin main

# 4. Se completou task: atualizar .harness/LOOP_PROMPT.md
# 5. Atualizar cron 419692880920649 com novo prompt (se aplicável)
# 6. Commit + push do LOOP_PROMPT.md

# 7. VERIFICAÇÃO FINAL (NÃO PULE)
python3 -c "
import json
d = json.load(open('.harness/SCRUM_TASKS.json'))
done = [t for t in d['tasks'] if t['status'] == 'done']
print(f'Done: {len(done)}/{len(d[\"tasks\"])}')
"
# Se a contagem NÃO subiu, ALGO ESTÁ ERRADO. Investigar.
```

### 2.2. Por que essa regra existe
O painel público `viralata.web.app/scrum.html` é a **face visível**
do kanban. Se o painel mente, o user perde a confiança na automação.
Mesmo com workflows automatizados do GitHub Actions, eles podem
falhar ou demorar. A regra é: **NUNCA terminar uma task sem refletir
no kanban**.

### 2.3. Fallback se `scrum.cjs` falhar (transição inválida)
```python
import json
d = json.load(open('.harness/SCRUM_TASKS.json'))
[t.update({'status': 'done', 'pr': 'YYY', 'updatedAt': '2026-07-14'}) for t in d['tasks'] if t['id'] == 'TASK-XXX']
json.dump(d, open('.harness/SCRUM_TASKS.json', 'w'), indent=2)
```

---

## 3. REGRA #1 — Sincronizar `metrics` do SCRUM_TASKS.json

> **Incorporada na documentação interna.**
> **Fonte**: bug visto em 2026-07-14 21:40 (array tinha 245 done mas
> `metrics.done` = 216; painel mostrava 216).

### 3.1. O JSON tem DUAS representações de contagem

1. `tasks[].status` — array, atualizado pelo `scrum.cjs done`
2. `metrics.done/ready/inProgress/inReview/blocked/backlog/totalTasks` —
   top-level, **NÃO** atualizado pelo `scrum.cjs done`

O painel público `viralata.web.app/scrum.html` **lê de `metrics`**, não
do array. Se eles divergem, o painel mente.

### 3.2. Procedimento: recalcular `metrics` ao final de CADA task

```python
import json
with open('.harness/SCRUM_TASKS.json', 'r') as f:
    d = json.load(f)
m = d.setdefault('metrics', {})
done = [t for t in d['tasks'] if t['status'] == 'done']
ready = [t for t in d['tasks'] if t['status'] == 'ready']
in_progress = [t for t in d['tasks'] if t['status'] == 'in_progress']
in_review = [t for t in d['tasks'] if t['status'] == 'in_review']
blocked = [t for t in d['tasks'] if t['status'] == 'blocked']
backlog = [t for t in d['tasks'] if t['status'] == 'backlog']
m['totalTasks'] = len(d['tasks'])
m['done'] = len(done)
m['ready'] = len(ready)
m['inProgress'] = len(in_progress)
m['inReview'] = len(in_review)
m['blocked'] = len(blocked)
m['backlog'] = len(backlog)
with open('.harness/SCRUM_TASKS.json', 'w') as f:
    json.dump(d, f, indent=2)
```

### 3.3. Por que essa regra existe
Painel público é a face visível. Se `metrics` diverge do array, o painel
mente, o user toma decisões baseadas em contagem errada. Tão crítica
quanto REGRA #0.

---

## 4. REGRA PERMANENTE — Varredura periódica do SCRUM

> **Fonte**: comando canônico de 2026-07-14.

A cada ~10 tasks done, fazer varredura do kanban para identificar
tasks que estão em `ready` mas JÁ FORAM FEITAS (PR mergeado, componente
no código, página no ar).

### 4.1. Como varrer
```bash
python3 <<'PY'
import json, subprocess, re
with open('.harness/SCRUM_TASKS.json') as f: d=json.load(f)
all_commits = subprocess.run(['git','log','--all','--oneline'], capture_output=True, text=True).stdout
pr_pat = re.compile(r'\(#(\d+)\)')
for t in d['tasks']:
    if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']:
        task_id_short = t['id'].replace('TASK-', '').lower()
        for commit in all_commits.splitlines():
            if task_id_short in commit.lower() and '(#' in commit:
                m = pr_pat.search(commit)
                if m:
                    t['pr'] = m.group(1)
                    t['status'] = 'done'
                    t['updatedAt'] = '2026-07-14'
                break
json.dump(d, open('.harness/SCRUM_TASKS.json', 'w'), indent=2)
PY
```

### 4.2. Por que essa regra existe
O kanban público depende da precisão disto. Tasks fantasma em `ready`
que já estão `done` no código confundem o user.

---

## 5. Engineering HOT (não repetir)

> **Fonte**: princípios técnicos que custaram caro em sessões anteriores.

### 5.1. Worktree + team plan com verifier
- **SEMPRE** worktree isolado + **team plan com verifier** antes de mudar
  código não-trivial. Não fazer mudanças em main diretamente.
- Para mudanças de 1-2 linhas, worktree isolado é suficiente.
- Para mudanças >50 linhas ou que tocam lógica de negócio: team plan
  com verifier adversarial (4 olhos).

### 5.2. Firestore rules: `return` explícito em TODA função
- ❌ **ERRADO**: function sem `return` final.
  ```
  function hasRole(role) {
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles[role] == true
    // ← SEM return → "Unexpected '('"
  }
  ```
- ✅ **CERTO**: sempre `return` explícito, mesmo que pareça redundante.
  ```
  function hasRole(role) {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles[role] == true
  }
  ```
- **Por que**: parser do Firebase CLI rejeita fall-through com erro
  confuso. Zero tolerância.

### 5.3. PWA Service Worker: `skipWaiting: true` + `clientsClaim: true`
- Em `vite.config.js` ou no service worker registration:
  ```js
  navigator.serviceWorker.ready.then(reg => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  ```
- **Por que**: PWA não atualiza o SW automaticamente sem skipWaiting;
  user fica preso em versão antiga.

### 5.4. Helpers de permissão: aceitar `currentUserUid` como fallback
- ❌ **ERRADO**: helper que só lê do contexto (`auth.uid` direto).
- ✅ **CERTO**: helper que aceita `currentUserUid` como parâmetro
  opcional, com fallback para `auth.uid`.
- **Por que**: em hooks que passam uid já conhecido, evita leitura
  dupla do Firestore. Também facilita testes unitários.

### 5.5. NUNCA derivar estado de permissão em `useEffect`
- ❌ **ERRADO**:
  ```jsx
  useEffect(() => {
    setCanAdmin(calcCanAdmin(user, org));
  }, [user, org]);
  ```
- ✅ **CERTO**: calcular inline, passar `canAdmin` como prop direto.
  ```jsx
  const canAdmin = calcCanAdmin(user, org);
  return <Child canAdmin={canAdmin} />;
  ```
- **Por que**: re-render race condition, prop drilling desnecessário,
  testes quebram. Calcular inline é determinístico.

---

## 6. Deploy workflow — aprendizados

> **Fonte**: múltiplas sessões de deploy em 2026-07-13..16.

### 6.1. Firebase CLI parser — REGRAS
Em `firestore.rules`:
- NÃO aceita raw strings `r'...'` (use aspas simples `'`).
- NÃO aceita regex com `[^/]` (classes negadas) em algumas posições.
- Escape `\\$` em regex pode falhar.
- **Solução**: usar aspas simples `'` e regex SEM classes negadas, OU
  substituir por `isString() && size() <= N`.

### 6.2. Cron do loop atrapalha merges massivos
- Quando o cron do UX está rodando a cada 25min, ele faz commits paralelos.
- Merge com `-X theirs` em massa → 42 merges geraram 53 arquivos com JSX
  quebrado.
- **Estratégia correta**: PARAR o cron ANTES de fazer merge. Fazer
  merge de 1-2 branches por vez, validar build entre cada.

### 6.3. Workflows de diagnóstico (`diag-*.yml`)
- Apenas rodam em `workflow_dispatch` (manual).
- Não têm trigger automático → podem ser deletados para reduzir ruído.
- 15 → 7 workflows = -53% ruído.

### 6.4. Limpeza de branches após merge
```bash
# Comando seguro (apenas branches já mergeadas)
git branch --merged origin/main | grep -v "^\*" | xargs git branch -d

# Para forçar (ignora merge status)
git branch | grep -v "^\*" | xargs git branch -D
```

### 6.5. Health check deploy — 5 causas comuns de falha

1. `npm ci` falha se `package-lock.json` desatualizado.
2. Functions: `FirebaseAppError: The default Firebase app does not exist`
   → adicionar:
   ```js
   if (!global.__viralataInitialized) {
     initializeApp();
     global.__viralataInitialized = true;
   }
   ```
3. Functions: `Cannot find module './fooCore'` (sem extensão) → Node 20
   com `type: commonjs` só procura `.js`. Criar wrapper `.js` que faz
   `require('./fooCore.cjs')`.
4. `firestore.rules`: regex complexas quebram parser. Ver §6.1.
5. `Permissions denied enabling cloudscheduler.googleapis.com` →
   permissão no projeto GCP (não bloqueia deploy, só scheduler).

---

## 7. Lições críticas (snake_case, mock, IAM, etc)

> **Fonte**: aprendizados de 2026-07-13, refinados em sessões seguintes.

### 7.1. snake_case vs camelCase silencioso
- Callback envia `{ terms_type }`, receiver lê `item.termsType` (undefined).
- Zod rejeita silenciosamente no `catch` → UI trava sem mensagem clara.
- **Regra**: sempre verificar shape exato do payload no callback
  (console.log do `JSON.stringify(payload)` antes de processar).

### 7.2. firebase-tools FILTRA `.js` em subdirs com `package.json`
- `functions/_payloads/*.js` é ignorado no deploy.
- **Workaround**: extensão `.mjs` para arquivos não-entry em functions
  com `package.json` no mesmo diretório.

### 7.3. Callable v2 functions precisam de IAM=allUsers explícito
- `cors: true` no código não basta — é preciso:
  ```bash
  gcloud functions add-invoker-policy-binding \
    --gen2 --member=allUsers <FN_NAME> --region=<REGION>
  ```
- Sem isso, callable retorna 403 mesmo com cors configurado.

### 7.4. Workflow debug: deploy "success" com runtime quebrado
- Sintoma: deploy reporta sucesso, mas Cloud Function dá erro em runtime.
- **Como debugar**: extrair imagem do Artifact Registry:
  ```bash
  docker create <image>:/bin/bash
  docker cp <container>:/usr/src/app ./extracted
  ```
- Confirmar se o arquivo modificado está dentro do container.

### 7.5. vi.mock não intercepta `require()` dentro de módulos CJS importados
- `vi.mock()` no test file não intercepta `require('firebase-admin')`
  dentro de `import()` de módulos CJS.
- **Solução 1** (parcial): `_messagingOverride` + `setMessagingOverride()`
  no módulo (funciona para spy injection).
- **Solução 2** (completa): usar Firebase Emulator Suite para testes
  de integração.

### 7.6. Push race condition (2026-07-16)
- Loop contínuo gera commits paralelos → `SCRUM_TASKS.json` sempre conflita.
- **Solução rápida**: `git pull origin main --rebase -X theirs` → commit
  com `-m` → push.
- **Solução correta**: parar o cron antes de merges em massa.

---

## 8. Erros que eu (Mavis) cometi na Fase 4

Inventário honesto da Fase 4 (DS_V2) com 18+ erros classificados.

### 8.1. Erros críticos

| ID | Erro | Impacto | Onde |
|---|---|---|---|
| E-CRIT-01 | 11 flags no SCRUM mas não no `core/featureFlags.js` | Site oficial sem flag pra ligar. User descobriu. | Bloco A-F, `SCRUM_TASKS.json` |
| E-CRIT-02 | Métricas dessincronizadas (painel mostrava 8 done, real 83) | Quebra de confiança no painel | `metrics.dsV2Tasks` |
| E-CRIT-03 | 11 worktrees stale + 11 branches mergeadas não deletadas | Poluição no repo | `activeWorktrees` |

### 8.2. Erros altos (build/deploy)

| ID | Erro | Impacto | Onde |
|---|---|---|---|
| E-HIGH-01 | Build quebrou: typo de aspas no Avatar | 1 min retrabalho | Bloco C, `Avatar.jsx` |
| E-HIGH-02 | Build quebrou: 6 strings adjacentes sem `+` | 5 min retrabalho | `featureFlags.js` FEATURE_FLAG_META |
| E-HIGH-03 | Past learnings ignoradas no início (sync.cjs depois, não antes) | 6+ conflitos de merge | Loop inteiro |
| E-HIGH-04 | PRs geraram 2-3 commits por merge (merge + chore(scrum) + resolve scrum HTML) | Histórico inflado 3x | Loop inteiro |

### 8.3. Erros médios (processo)

| ID | Erro | Impacto | Onde |
|---|---|---|---|
| E-MED-01 | Quebrei o fluxo `ready → in_review` (precisa passar por `in_progress`) | 50+ erros de log | `scrum.cjs` |
| E-MED-03 | "Audit only" sem validação profunda (li 1-2 arquivos só) | Risco de qualidade | Blocos D.3-D.6 |
| E-MED-04 | **Prometi "100% done" sem verificar** — user me cobrou | Quebra de confiança | Pós-Fase 4 |
| E-MED-06 | `git push` rejeitado por divergência (scrum-topbar mergeou HTMLs) | Atrasou pushes | Loop inteiro |

### 8.4. Erros baixos (UX/runs)
- E-LOW-01..02: mensagens sem destaque, respostas grandes sem check-ins.

---

## 9. Diretrizes essenciais DS_V2 (preventivas)

Cada diretriz abaixo **previne** um ou mais erros acima.

### 9.1. Loop Discipline

#### D-LOOP-01: Update SCRUM a cada 3 tasks
- ❌ Acumular 8 tasks e fazer 1 sync gigante.
- ✅ A cada 3 tasks: `node .harness/sync.cjs --fix` + check-in com user.
- **Previne**: E-HIGH-03.

#### D-LOOP-02: Transição correta
- ❌ `ready → in_review` ou `ready → done` direto.
- ✅ `ready → in_progress → in_review → done`.
- **Previne**: E-MED-01.

#### D-LOOP-03: Loop termina com 0 tasks em `in_progress`
- ❌ Loop com 5+ tasks stale em `in_progress`.
- ✅ Mover todas para `done` ou `in_review` antes de fechar.
- **Previne**: E-CRIT-02.

#### D-LOOP-04: Check-ins a cada 3 tasks OU 10min
- ❌ Loop de 2h sem falar nada.
- ✅ Postar status curto a cada 3 tasks OU 10min.
- **Por que**: P15 do user + prevenir "parece travado".

#### D-LOOP-05: `git pull --no-rebase` antes de push
- ❌ `git push` direto após merge local.
- ✅ `git pull --no-rebase origin main && git push origin main`.
- **Previne**: E-MED-06.

### 9.2. Feature Flag Lifecycle (REGRA MAIS IMPORTANTE)

#### D-FLAG-01: Toda flag nova vai em 4 lugares
- ❌ Adicionar nome no `SCRUM_TASKS.json` (campo `flag`) e parar.
- ✅ Registrar nos 4 lugares, na ordem:
  1. `src/core/featureFlags.js` → `FEATURE_FLAG` enum
  2. `src/core/featureFlags.js` → `FEATURE_FLAG_META` (label + description)
  3. `src/core/featureFlags.js` → `DEFAULT_FEATURE_FLAGS` (sempre `false`)
  4. `SCRUM_TASKS.json` → campo `flag` das tasks do bloco
- **Previne**: E-CRIT-01. **REGRA MAIS IMPORTANTE que aprendi nesta sessão.**

#### D-FLAG-02: Verificar flags no painel admin após deploy
- ❌ Assumir que flags aparecem no admin após push.
- ✅ Pedir ao user (ou curl) que confirme que aparecem em `/admin/flags`.

#### D-FLAG-03: Convenção de nomenclatura
- ❌ `DS_V2_PAGES-HOME` (com hífen) na chave do Firestore.
- ✅ `DS_V2_PAGES_HOME` no enum JS, `ds_v2_pages_home` no Firestore.

#### D-FLAG-04: Default OFF para tudo aditivo
- ❌ Ligar flag no commit.
- ✅ `DEFAULT_FEATURE_FLAGS[X] = false`. User liga manualmente.

### 9.3. Code & Build Quality

#### D-BUILD-01: `npm run build` verde ANTES do commit
- ❌ Commitar código sem testar build.
- ✅ `npm run build` em todo commit de feature.
- **Previne**: E-HIGH-01, E-HIGH-02.

#### D-BUILD-02: Se o build quebrar, PARAR e investigar
- ❌ Continuar trabalhando após build quebrado.
- ✅ Parar, ler erro, corrigir, rebuildar, continuar.
- **Por que**: "Se o build quebrar → reverter imediatamente" (past learning).

#### D-BUILD-03: Ler o componente antes de mexer
- ❌ Editar arquivo sem ler contexto.
- ✅ `read` o arquivo inteiro antes de propor mudança.
- **Por que**: P7.

#### D-BUILD-04: Strings JS multi-linha sempre com `+`
- ❌ `'foo' 'bar'` adjacentes.
- ✅ `'foo' + 'bar'`.
- **Previne**: E-HIGH-02.

### 9.4. Git Workflow

#### D-GIT-01: Worktree isolado por bloco
- ❌ Trabalhar em main direto.
- ✅ `git worktree add .worktrees/wt-NOME -b feat/...-YYYY-MM-DD main`.

#### D-GIT-02: Nome de branch padronizado
- ❌ `meu-fix`, `wip`, `teste`.
- ✅ `feat/ds-v2-{bloco}-YYYY-MM-DD` ou `feat/{módulo}-{slug}`.

#### D-GIT-03: Deletar branch imediatamente após merge
- ❌ Acumular 11 branches mergeadas.
- ✅ `git branch -D feat/X` + `git push origin --delete feat/X`.
- **Previne**: E-CRIT-03.

#### D-GIT-04: `git worktree remove --force` após merge
- ❌ Deixar worktree órfão.
- ✅ `git worktree remove --force .worktrees/wt-NOME` + `git worktree prune`.

#### D-GIT-05: `--no-ff` no merge
- ❌ `git merge feat/X` (fast-forward, perde histórico).
- ✅ `git merge --no-ff feat/X -m "merge: ..."`.

#### D-GIT-06: Nunca `--force` cego
- ❌ `git push --force` após divergência.
- ✅ `git pull --no-rebase origin main && git push origin main`.

#### D-GIT-07: Commitar HTMLs auto-gerados juntos
- ❌ Deixar `painel-scrum.html` e `public/scrum.html` modificados
  no working tree após `sync.cjs --fix`.
- ✅ `git add -A` antes do commit (mudam SEMPRE quando JSON muda).

### 9.5. Honesty & Verification

#### D-HONEST-01: "Pronto" só após verificar
- ❌ Declarar "bloco concluído" baseado em suposição.
- ✅ Rodar verificação do §10 antes de declarar.
- **Previne**: E-MED-04, E-CRIT-02.

#### D-HONEST-02: Responder "não verifiquei" quando aplicável
- ❌ Inventar resposta para parecer competente.
- ✅ Admitir lacuna: "Não verifiquei ainda. Deixa eu checar."

#### D-HONEST-03: Distinguir "feito" vs "mergeado" vs "deployado"
- ❌ "Tudo pronto!" (sem esclarecer onde).
- ✅ Separar status: feito / commitado / mergeado / pushed / deployado
  / disponível ao user.
- **Previne**: E-MED-04.

#### D-HONEST-04: "Audit only" ≠ "verifiquei tudo"
- ❌ Marcar bloco como "audit only" sem grep completo.
- ✅ Documentar quais arquivos foram lidos, quais greps rodaram, qual
  a confiança.
- **Previne**: E-MED-03.

### 9.6. Past Learnings

#### D-PAST-01: Sem cron UX durante merge manual
- ❌ Deixar cron UX rodar enquanto faz merge manual de branches.
- ✅ Desabilitar cron UX (mavis) durante operações manuais em escala.

#### D-PAST-02: Sem `-X theirs` cego
- ❌ `git merge -X theirs origin/main` para "resolver conflito".
- ✅ Resolver manualmente, lendo o diff.

#### D-PAST-03: `npm ci` antes de push
- ❌ Pular `npm ci` se "parece OK".
- ✅ `npm ci` para garantir paridade com CI.

#### D-PAST-04: Pattern de init Firebase em Cloud Functions
```js
if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
```

#### D-PAST-05: Wrapper `.js` para `.cjs` em Functions
```js
// foo.js (entry)
module.exports = require('./fooCore.cjs');
```

#### D-PAST-06: Firestore rules sem `[^/]`, sem `r'...'`
- ❌ Regex complexa com classes negadas.
- ✅ `isString() && size() <= N` ou regex simples.

#### D-PAST-07: `sync.cjs --fix` ANTES do commit
- ❌ Deixar o commit sem sync, esperando rodar depois.
- ✅ Rodar sync.cjs --fix IMEDIATAMENTE antes de `git add`.

---

## 10. Auto-check antes de declarar "bloco concluído"

Antes de marcar a task macro do bloco como `done`, percorra esta
checklist mentalmente (ou rode o script abaixo):

```bash
# 1. Build verde? exit 0 obrigatório
npm run build

# 2. Lint sem regressões vs main
npm run lint

# 3. SCRUM metrics corretas? done === total?
node .harness/sync.cjs --fix
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log(d.metrics.dsV2Tasks)"

# 4. REGRA #1: Recalcular metrics a partir do array (se scrum.cjs não fez)
python3 <<'PY'
import json
with open('.harness/SCRUM_TASKS.json') as f: d=json.load(f)
m = d.setdefault('metrics', {})
for k, v in [('done','done'),('ready','ready'),('inProgress','in_progress'),
             ('inReview','in_review'),('blocked','blocked'),('backlog','backlog')]:
    m[k] = sum(1 for t in d['tasks'] if t['status']==v)
m['totalTasks'] = len(d['tasks'])
json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)
PY

# 5. REGRA #0: VERIFICAÇÃO FINAL
python3 -c "
import json
d = json.load(open('.harness/SCRUM_TASKS.json'))
done = [t for t in d['tasks'] if t['status'] == 'done']
print(f'Done: {len(done)}/{len(d[\"tasks\"])}')
"
# Se a contagem NÃO subiu, ALGO ESTÁ ERRADO

# 6. activeWorktrees limpo?
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log('wt:', d.activeWorktrees.length)"
# Deve ser 0 (após merge) ou 1 (worktree atual)

# 7. activeSessions com status correto?
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log(d.activeSessions[0].status)"
# Deve ser 'started' se loop continua, 'completed' se terminou

# 8. Branches mergeadas deletadas (local + remoto)?
git branch -a | grep "feat/" | wc -l
# Deve ser só o branch atual (se em worktree) ou 0 (em main)
```

**Se QUALQUER item falhar**: NÃO marque como done. Corrija primeiro.

---

## 11. Comandos canônicos de referência rápida

### 11.1. Marcar task no SCRUM
```bash
node .harness/scrum.cjs done TASK-XXX --pr YYY --reason "..."
node .harness/scrum.cjs start TASK-XXX
node .harness/scrum.cjs block TASK-XXX --reason "..."
```

### 11.2. Recalcular metrics
```bash
node .harness/sync.cjs --fix
# Se metrics ainda não bate, recalcular manualmente (ver §3.2)
```

### 11.3. Setup de worktree
```bash
git worktree add .worktrees/wt-NOME -b feat/X-YYYY-MM-DD main
cd .worktrees/wt-NOME
```

### 11.4. Merge + cleanup
```bash
# Em main
git merge --no-ff feat/X -m "merge: bloco Y done"
git branch -D feat/X
git push origin --delete feat/X
git worktree remove --force .worktrees/wt-NOME
```

### 11.5. Worktree limpo em bulk
```bash
git worktree list
git worktree remove --force .worktrees/wt-NOME-1
git worktree remove --force .worktrees/wt-NOME-2
git worktree prune
```

### 11.6. Deploy health check
```bash
# Antes do push
npm ci
npm run build
npm run lint

# Após push
gh run watch
```

### 11.7. Cron UX
- Cron 419692880920649: prompt loop UX.
- **REGRA**: parar antes de merges em massa, reativar depois.

---

## 12. Apêndice: Timeline de eventos críticos

| Data | Evento |
|---|---|
| 2026-07-13 | Lições críticas (snake_case, firebase-tools, callable IAM, vi.mock) |
| 2026-07-14 18:21 | REGRA #0 (scrum update obrigatório) |
| 2026-07-14 21:40 | REGRA #1 (metrics sync) |
| 2026-07-14 | REGRA varredura periódica |
| 2026-07-15..16 | Fase 4 (DS_V2) — 11 blocos, 83/83 tasks |
| 2026-07-16 16:05 | User: "Eu creio que as tarefas não chegaram a entrar no scrum" → E-CRIT-02 |
| 2026-07-16 16:10 | User: "No site oficial, não há nenhum flag disponível para eu ligar" → E-CRIT-01 |
| 2026-07-16 16:18 | User pede CORE_DIRECTIVES.md |
| 2026-07-16 16:25 | User pede consolidação de **outros comandos de instrução geral** |

**Lição macro**: Cada chat produzia regras. Eu as aplicava localmente
mas não consolidava num documento. Isso é o que este arquivo corrige
— é a **memória institucional do agente Mavis** para o projeto
viralata. Cross-session, cross-chat.

---

*Documento vivo. Atualizar sempre que um novo comando de instrução
geral for emitido pelo user em qualquer chat.*

*Owner: Mavis (orquestrador técnico). Cross-reference com `AGENTS.md`
Regra A+B e com `agent memory` (cross-session).*
