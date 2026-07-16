# Diretrizes Essenciais do Núcleo (Core)

> **Documento de princípios fundamentais que NUNCA devem ser violados.**
>
> Este arquivo é o **núcleo essencial** do agente Mavis no projeto Viralata.
> Resulta da auditoria honesta dos princípios citados pelo usuário ao longo
> do desenvolvimento da Fase 4 (DS_V2) e dos erros que eu (Mavis) cometi
> que violaram esses princípios. Cada diretriz é **preventiva** —
> foi escrita para garantir que um erro específico nunca mais ocorra.
>
> **Validade**: até que TODAS as funcionalidades estejam plenamente
> entregues e validadas em produção. Tratar como regra do `AGENTS.md`
> Regra A+B, com peso equivalente.
>
> **Owner**: Mavis (orquestrador técnico) — qualquer violação deve
> gerar um SCRUM task de blocker com severidade `critical`.
>
> **Última atualização**: 2026-07-16 (pós-Fase 4 DS_V2)

---

## Índice

- [§1. Princípios citados pelo usuário](#1-princípios-citados-pelo-usuário)
- [§2. Erros que eu (Mavis) cometi](#2-erros-que-eu-mavis-cometi)
- [§3. Diretrizes essenciais (preventivas)](#3-diretrizes-essenciais-preventivas)
  - [§3.1. Loop Discipline (o loop precisa funcionar)](#31-loop-discipline)
  - [§3.2. SCRUM Integrity (o SCRUM precisa funcionar)](#32-scrum-integrity)
  - [§3.3. Feature Flag Lifecycle (do spec ao admin)](#33-feature-flag-lifecycle)
  - [§3.4. Code & Build Quality](#34-code--build-quality)
  - [§3.5. Git Workflow (worktrees, branches, merges)](#35-git-workflow)
  - [§3.6. Honesty & Verification (verificar antes de declarar)](#36-honesty--verification)
  - [§3.7. Past Learnings (não repetir erros)](#37-past-learnings)
- [§4. Auto-check antes de declarar "bloco concluído"](#4-auto-check-antes-de-declarar-bloco-concluído)

---

## 1. Princípios citados pelo usuário

Estes são os princípios que o usuário citou ao longo do desenvolvimento
e que devem ser tratados como **invioláveis**:

### 1.1. Sobre o ritmo e a entrega
- **P1**: "Não quero que atue em um comando interminável. Preciso que
  comece em trabalhando em partes, com respostas pensadas, mas mais
  rápidas, me entregando respostas claras de como tudo está se organizando."
- **P2**: "Me faça perguntas sobre o que for necessário."
- **P3**: "Não quero que faça com pressa. Quero que faça no tempo
  adequado e necessário. Prefiro qualidade em vez de quantidade."
- **P4**: "Não quero desperdício de tokens, trabalho mal feito, necessidade
  de retrabalho, perda de tempo, desenvolvimento muito longo."

### 1.2. Sobre o papel do agente
- **P5**: "Você vai atuar como o grande orquestrador e revisor, como
  o meu agente especial designado para coordenar e controlar o trabalho."
- **P6**: "Eu preciso que você, como meu agente de IA, com conhecimento
  técnico que eu não possuo, compreenda o que eu estou querendo pedir e
  preveja o que eu estou esquecendo, de modo a prevenir erros, falhas,
  bugs, inadequação, retrabalho etc."

### 1.3. Sobre regras de mudança
- **P7**: "Não estrague nada. Antes de mudar, leia o componente. Se tiver
  teste, rode o teste ANTES e DEPOIS."
- **P8**: "Não crie funcionalidade nova — só ajuste visual/UX/layout em
  coisas que já existem."
- **P9**: "Não toque em regras de negócio (LGPD, validações, permissões, etc)."
- **P10**: "Se um arquivo está muito arriscado, pule e pegue outro."
- **P11**: "Foco em UX: cards, espaçamentos, hierarquia, contraste,
  responsividade, loading, empty states."

### 1.4. Sobre o loop
- **P12**: "Lembre-se que o loop precisa funcionar. Observe o que já fez
  ele parar das vezes anteriores."
- **P13**: "O SCRUM precisa funcionar. Observe o que já fez ele não
  ser atualizados das vezes anteriores."
- **P14**: "Por bloco. Mas dentro de cada loop deve ter uma explicação
  do que foi feito, fazendo a atualização do SCRUM antes de terminar o loop."
- **P15**: "Você, aqui, deve me explicar o andamento de tempos em tempos."

### 1.5. Sobre o SCRUM
- **P16**: "Faça a integração e atualização de tudo no SCRUM (kanban,
  backlog, worktrees, sessões, riscos, DOD, retrospectiva, protocolo,
  roadmap)."
- **P17**: Past learnings específicas (citadas literalmente):
  - Sem cron atrapalhando merges em massa
  - Sem `-X theirs` cego em código
  - `npm ci` antes de push (validar `package-lock.json`)
  - `sync.cjs --fix` ANTES do commit (não depois)
  - Pattern de init Firebase em CFs
  - Wrapper `.js` para `.cjs` em Cloud Functions
  - Firestore rules sem `[^/]`, sem `r'...'`
  - Rollback automático se build quebra (`git reset --hard HEAD`)

### 1.6. Sobre o design system
- **P18**: "Cada tipo de página possua uma estrutura de layout padrão,
  com posicionamentos, dimensões, cards, textos, modais, formulários,
  tabelas, enfim, tudo, literalmente tudo, padronizado."
- **P19**: "Começar do zero visual e refazer o que divergir. Mas não
  se trata apenas de cor, há também questões de estrutura, cards, textos,
  posicionamento, dimensionamento etc."
- **P20**: "As implementações devem ser ativadas no site oficial por
  meio de flags criados individualmente ou para cada conjunto dentro de
  um mesmo contexto."

### 1.7. Sobre revisão e qualidade
- **P21**: "Implementar loops complementares de revisão (dentro daquilo
  que falei acima, acrescido e/ou melhorado com o seu conhecimento)."
- **P22**: "Implementar loops complementares para manter o código e o
  main organizado, deletando as branchs obsoletas."

---

## 2. Erros que eu (Mavis) cometi

Inventário honesto. Cada erro tem um ID, descrição, impacto e onde no
código/fluxo aconteceu.

### 2.1. Erros críticos

#### E-CRIT-01: Flags no SCRUM mas não no código
- **Quando**: Bloco A → Bloco F da Fase 4 (DS_V2). 11 flags adicionadas
  ao `SCRUM_TASKS.json` (campo `flag`) mas **nunca** registradas no
  `src/core/featureFlags.js` (FEATURE_FLAG enum, FEATURE_FLAG_META,
  DEFAULT_FEATURE_FLAGS).
- **Impacto**: O site oficial não tinha nenhuma flag DS_V2 para o
  usuário ligar. O usuário descobriu: "No site oficial, não há nenhum
  flag disponível para eu ligar."
- **Severidade**: **CRÍTICA** — o trabalho de 11 blocos ficou
  imperceptível para o usuário final sem uma segunda intervenção.

#### E-CRIT-02: Métricas do SCRUM dessincronizadas
- **Quando**: Após a "conclusão" da Fase 4.
- **Sintoma**: `metrics.dsV2Tasks` mostrava `{total:83, done:8, ready:10,
  inProgress:19}` quando o estado real era `{total:83, done:83, ready:0,
  inProgress:0, completedPct:100}`.
- **Impacto**: O painel HTML (`painel-scrum.html`) mostrava contadores
  errados para o usuário. `metrics.dsV2Blocos.inProgress` ainda
  mostrava `DS_V2_AUDIT` mesmo já done.
- **Severidade**: **CRÍTICA** — quebra a confiança no painel como
  source of truth.

#### E-CRIT-03: 11 worktrees stale + 11 branches mergeadas não deletadas
- **Quando**: Imediatamente após a "conclusão" da Fase 4.
- **Sintoma**: `activeWorktrees` tinha 10 entries stale (todos mergeados,
  worktrees já fechados), 11 branches locais mergeadas (`feat/ds-v2-*`)
  presentes, 11 branches remotas idem.
- **Impacto**: Poluição no repositório, risco de confusão em merges
  futuros, lista de branches inchada.
- **Severidade**: **ALTA** — degrada qualidade do repo.

### 2.2. Erros altos (build/deploy)

#### E-HIGH-01: Build quebrou por typo de aspas
- **Quando**: Bloco C (Avatar component).
- **Erro**: `AvatarFallback.displayName = 'AvatarFallback;` (faltou `'`
  no fechamento).
- **Impacto**: Build falhou. Tive que identificar, corrigir, rebuildar.
- **Severidade**: **MÉDIA** — 1 minuto de retrabalho.

#### E-HIGH-02: Build quebrou por strings adjacentes sem `+`
- **Quando**: Registro de flags DS_V2 em `featureFlags.js`.
- **Erro**: 6 strings de `description:` em FEATURE_FLAG_META foram
  escritas como literais adjacentes em linhas separadas sem o operador
  `+` entre elas (sintaxe JS inválida).
- **Impacto**: Build falhou. Tive que escrever um script Python para
  corrigir o arquivo.
- **Severidade**: **MÉDIA** — 5 minutos de retrabalho.

#### E-HIGH-03: Past learnings ignoradas no início
- **Quando**: Os primeiros blocos da Fase 4 (A, B).
- **Sintoma**: Apliquei `npm ci` no começo, mas esqueci de aplicar
  `sync.cjs --fix` **antes** do commit. Resultado: cada merge teve
  que resolver conflito nos HTMLs auto-gerados.
- **Impacto**: 6+ conflitos de merge por push de cada bloco. Cerca de
  15 minutos extras no total.
- **Severidade**: **MÉDIA** — degrada a velocidade.

#### E-HIGH-04: PRs geraram 2-3 commits por merge
- **Quando**: Todos os merges da Fase 4.
- **Sintoma**: Para cada merge de bloco eu tinha:
  - 1 merge --no-ff do branch
  - 1 commit separado `chore(scrum): Bloco X done`
  - 1 commit extra `merge: resolve scrum HTML auto`
- **Impacto**: Histórico inflado (3x commits por bloco), leitura difícil.
- **Severidade**: **MÉDIA** — degrada histórico.

### 2.3. Erros médios (processo)

#### E-MED-01: Não respeitei o fluxo `start → in_review → done`
- **Quando**: Múltiplas vezes.
- **Sintoma**: Tentei transições `ready → in_review` ou `ready → done`
  que o `scrum.cjs` rejeita (precisa passar por `in_progress`).
- **Impacto**: Mensagens de erro, necessidade de fazer `start` no loop
  seguinte.
- **Severidade**: **MÉDIA** — ruído.

#### E-MED-02: Confundi trabalho entre worktrees
- **Quando**: Vários blocos.
- **Sintoma**: Ao abrir `wt-ds-v2-pages-pets`, esperava que as tasks
  TASK-724..731 (do Bloco C) estivessem em `done`, mas o worktree
  baseava em main e via o estado pós-merge.
- **Impacto**: Confusão na leitura de status.
- **Severidade**: **BAIXA** — confusão minha, não do repo.

#### E-MED-03: "Audit only" sem validação profunda
- **Quando**: Blocos D.3, D.4, D.5, D.6.
- **Sintoma**: Marquei como "audit only" sem grep completo, sem ler
  todos os arquivos do módulo. Li 1-2 arquivos e decidi "OK, está
  alinhado".
- **Impacto**: Se houvesse divergência, eu não pegaria.
- **Severidade**: **MÉDIA** — risco de qualidade.

#### E-MED-04: Prometi "100% done" sem verificar
- **Quando**: Após o Bloco F.
- **Sintoma**: Declarei "Fase 4 (DS_V2) CONCLUÍDA — 83/83 tasks done"
  sem ter rodado o `sync.cjs --fix` final nem checado o painel HTML.
- **Impacto**: Usuário teve que me cobrar ("as tarefas não chegaram a
  entrar no scrum"). Constatou que métricas estavam erradas.
- **Severidade**: **CRÍTICA** — quebra confiança.

#### E-MED-05: Status transition errors acumulados
- **Quando**: Loop todo.
- **Sintoma**: Vários "[scrum] ERRO: Transição inválida: ready →
  in_review" no log. Poluição visual mas não bloqueante.
- **Impacto**: 50+ mensagens de erro no log.
- **Severidade**: **BAIXA** — ruído.

#### E-MED-06: `git push` rejeitado por divergência
- **Quando**: 3-4 vezes.
- **Sintoma**: O `scrum-topbar` workflow auto-mergeava HTMLs enquanto eu
  fazia meus merges manuais. Resultado: origin/main ahead do meu local.
- **Impacto**: `Updates were rejected because the tip of your current
  branch is behind its remote counterpart`.
- **Severidade**: **MÉDIA** — atrasa pushes.

### 2.4. Erros baixos (UX)

#### E-LOW-01: Mensagens sem `:` no fim (não apliquei a Política §16)
- **Quando**: Não verificado.
- **Risco**: Mensagens Mavis communication podem ser truncadas.
- **Severidade**: **BAIXA** — só me aplico neste sandbox local.

#### E-LOW-02: Resposta grande ao usuário sem destaque visual
- **Quando**: Mensagens finais.
- **Sintoma**: Mandei respostas de 100+ linhas sem check-ins intermediários.
- **Impacto**: Usuário teve que rolar bastante.
- **Severidade**: **BAIXA** — UX da conversa.

---

## 3. Diretrizes essenciais (preventivas)

Cada diretriz abaixo **previne** um ou mais erros acima. Quando você
implementar ou revisar algo, percorra mentalmente esta lista.

### 3.1. Loop Discipline

> **Princípio**: "O loop precisa funcionar" (P12). Cada iteração deve
> deixar o repo em estado coerente e o usuário atualizado.

#### D-LOOP-01: Update SCRUM a cada 3 tasks (não acumule)
- ❌ **ERRADO**: marcar 8 tasks done no fim e fazer 1 sync gigante
- ✅ **CERTO**: a cada 3 tasks feitas, rodar `node .harness/sync.cjs --fix`
  e fazer check-in com o usuário
- **Por quê**: Sync.cjs --fix no fim = 10min de conflito com HTML
  auto-gerado. A cada 3 = 30s de overhead.

#### D-LOOP-02: Use a transição correta
- ❌ **ERRADO**: `ready → in_review` ou `ready → done` direto
- ✅ **CERTO**: `ready → in_progress → in_review → done` (sempre
  passar por in_progress, mesmo que pareça redundante)
- **Por quê**: O `scrum.cjs` valida transições; pular gera erro.
  Previne E-MED-01.

#### D-LOOP-03: Status intermediário ao final
- ❌ **ERRADO**: Loop que termina com 5+ tasks ainda em `in_progress`
- ✅ **CERTO**: Loop termina com 0 tasks em `in_progress` (todas
  movidas para `done` ou `in_review`)
- **Por quê**: `in_progress` stale = métrica errada. Previne E-CRIT-02.

#### D-LOOP-04: Check-ins de 3 em 3 tasks OU 10min
- ❌ **ERRADO**: Loop de 2h sem falar nada
- ✅ **CERTO**: Postar status curto a cada 3 tasks OU 10min
- **Por quê**: P15 do user + "prevenir que pareça travado". Implementa
  o pedido literal de P15.

#### D-LOOP-05: `git pull --no-rebase` antes de push, SEMPRE
- ❌ **ERRADO**: `git push` direto após merge local
- ✅ **CERTO**: `git pull --no-rebase origin main && git push origin main`
  (o scrum-topbar workflow pode ter mergeado HTMLs enquanto você trabalhava)
- **Por quê**: Previne E-MED-06.

### 3.2. SCRUM Integrity

> **Princípio**: "O SCRUM precisa funcionar" (P13). Painel HTML é o
> rosto do trabalho para o usuário.

#### D-SCRUM-01: `sync.cjs --fix` ANTES do commit, sempre
- ❌ **ERRADO**: editar JSON, fazer código, commitar tudo junto
- ✅ **CERTO**: ao terminar tarefas, rodar `sync.cjs --fix` **antes**
  do `git add` — assim métricas ficam no mesmo commit
- **Por quê**: Past learning explícita + previne E-CRIT-02.

#### D-SCRUM-02: Recalcular `metrics.*` no fim do bloco
- ❌ **ERRADO**: terminar bloco, marcar macro como done, e ir embora
- ✅ **CERTO**: ao marcar a task macro do bloco como done, fazer
  `node .harness/_fix-scrum-sync.cjs` (ou script equivalente) que
  recalcula `metrics` do estado real das tasks
- **Por quê**: Previne E-CRIT-02. Se o painel mostra números errados,
  o user perde a confiança.

#### D-SCRUM-03: Limpar `activeWorktrees` após merge
- ❌ **ERRADO**: deixar 10 worktrees stale em `activeWorktrees`
- ✅ **CERTO**: após merge em main, fazer `git worktree remove --force`
  e setar `activeWorktrees = []` no JSON
- **Por quê**: Previne E-CRIT-03.

#### D-SCRUM-04: Marcar `activeSessions[0].status = 'completed'` no fim
- ❌ **ERRADO**: sessão fica "started" para sempre
- ✅ **CERTO**: ao terminar, atualizar `lastActiveAt` e `status = 'completed'`
- **Por quê**: Previne E-CRIT-03 (parte de activeSessions).

#### D-SCRUM-05: Atualizar todos os campos do SCRUM num único commit
- ❌ **ERRADO**: commitar o código, depois "lembrar" do SCRUM em commit
  separado (gera 2x commits por merge)
- ✅ **CERTO**: `sync.cjs --fix` → `git add -A` → `git commit` (o commit
  inclui código + SCRUM + HTML regenerado)
- **Por quê**: Previne E-HIGH-04 (histórico 3x por bloco).

#### D-SCRUM-06: Validar `metrics` antes de declarar "bloco concluído"
- ❌ **ERRADO**: declarar "83/83 done" sem ler o painel
- ✅ **CERTO**: `node .harness/sync.cjs --fix` → grep `metrics.dsV2Tasks`
  → confirmar `done === total` antes de declarar
- **Por quê**: Previne E-MED-04 e E-CRIT-02.

### 3.3. Feature Flag Lifecycle

> **Princípio**: "As implementações devem ser ativadas no site oficial
> por meio de flags" (P20). Flag no SCRUM sem código = fantasma.

#### D-FLAG-01: Toda flag nova vai em 4 lugares
- ❌ **ERRADO**: adicionar nome no `SCRUM_TASKS.json` (campo `flag`)
  e parar por aí
- ✅ **CERTO**: registrar nos 4 lugares, na ordem:
  1. `src/core/featureFlags.js` → `FEATURE_FLAG` enum
  2. `src/core/featureFlags.js` → `FEATURE_FLAG_META` (label + description)
  3. `src/core/featureFlags.js` → `DEFAULT_FEATURE_FLAGS` (sempre `false`
     para flags aditivas)
  4. `SCRUM_TASKS.json` → campo `flag` das tasks do bloco
- **Por quê**: Previne E-CRIT-01. **REGRA MAIS IMPORTANTE** que aprendi
  nesta sessão.

#### D-FLAG-02: Verificar flags no painel admin após deploy
- ❌ **ERRADO**: assumir que as flags aparecem no admin após push
- ✅ **CERTO**: pedir ao usuário (ou curl na rota de flags) que confirme
  que elas aparecem em /admin/flags
- **Por quê**: Última verificação. Previne E-CRIT-01.

#### D-FLAG-03: Convenção de nomenclatura
- ❌ **ERRADO**: `DS_V2_PAGES-HOME` (com hífen) na chave do Firestore
- ✅ **CERTO**: `DS_V2_PAGES_HOME` no enum JS, `ds_v2_pages_home` no
  Firestore (hífen removido, segue convenção do projeto: `home_stats_v1`,
  `standardized_page_layout`, etc)
- **Por quê**: Outras flags do projeto usam `_`, não `-`. Consistência.

#### D-FLAG-04: Default OFF para tudo aditivo
- ❌ **ERRADO**: ligar flag no momento do commit
- ✅ **CERTO**: `DEFAULT_FEATURE_FLAGS[X] = false`. User liga manualmente
  em /admin/flags após validar visualmente
- **Por quê**: Princípio P20 + convenção do projeto
  (`PLATFORM_SETTINGS_DEFAULTS`).

### 3.4. Code & Build Quality

> **Princípio**: "Não estrague nada. Antes de mudar, leia o componente"
> (P7) + past learnings (npm ci, rollback, init Firebase pattern).

#### D-BUILD-01: `npm run build` verde ANTES do commit
- ❌ **ERRADO**: commitar código que não testou o build
- ✅ **CERTO**: rodar `npm run build` em todo commit de feature
- **Por quê**: Past learning explícita + previne E-HIGH-01 e E-HIGH-02.

#### D-BUILD-02: Se o build quebrar, PARAR e investigar
- ❌ **ERRADO**: continuar trabalhando após build quebrado
- ✅ **CERTO**: parar imediatamente, ler o erro, identificar a linha,
  corrigir, rebuildar, só então continuar
- **Por quê**: "Se o build quebrar → reverter imediatamente" (past
  learning). Previne propagação de erro.

#### D-BUILD-03: Ler o componente antes de mexer
- ❌ **ERRADO**: editar arquivo sem ler o contexto
- ✅ **CERTO**: `read` o arquivo inteiro (ou pelo menos a função/vizinhança)
  antes de propor mudança
- **Por quê**: Princípio P7.

#### D-BUILD-04: Strings JS multi-linha sempre com `+`
- ❌ **ERRADO**:
  ```js
  description:
    'foo '
    'bar',
  ```
- ✅ **CERTO**:
  ```js
  description:
    'foo '
    + 'bar',
  ```
- **Por quê**: Previne E-HIGH-02.

#### D-BUILD-05: Validar imports antes de commitar
- ❌ **ERRADO**: usar `require()` em projeto ESM (`"type": "module"`)
- ✅ **CERTO**: `import` nomeado sempre que possível
- **Por quê**: Já cometi esse erro no `icon.jsx` na primeira tentativa.

### 3.5. Git Workflow

> **Princípio**: Worktree por bloco, branch dedicado, merge --no-ff,
> limpeza de branches obsoletas.

#### D-GIT-01: Worktree isolado por bloco
- ❌ **ERRADO**: trabalhar em main direto
- ✅ **CERTO**: `git worktree add .worktrees/wt-NOME -b feat/...-YYYY-MM-DD main`
- **Por quê**: Workflow padrão do projeto. Isola mudanças.

#### D-GIT-02: Nome de branch padronizado
- ❌ **ERRADO**: `meu-fix`, `wip`, `teste`
- ✅ **CERTO**: `feat/ds-v2-{bloco}-YYYY-MM-DD` ou `feat/{módulo}-{slug}`
- **Por quê**: Fácil de filtrar, deletar, organizar.

#### D-GIT-03: Deletar branch imediatamente após merge
- ❌ **ERRADO**: deixar 11 branches mergeadas acumularem
- ✅ **CERTO**:
  ```bash
  git branch -D feat/ds-v2-NOME
  git push origin --delete feat/ds-v2-NOME
  ```
- **Por quê**: Princípio P22 + previne E-CRIT-03.

#### D-GIT-04: `git worktree remove --force` após merge
- ❌ **ERRADO**: deixar worktree órfão
- ✅ **CERTO**: `git worktree remove --force .worktrees/wt-NOME` +
  `git worktree prune`
- **Por quê**: Mesma justificativa.

#### D-GIT-05: `--no-ff` no merge
- ❌ **ERRADO**: `git merge feat/X` (fast-forward, perde histórico)
- ✅ **CERTO**: `git merge --no-ff feat/X -m "merge: ..."`
- **Por quê**: Preserva o branch no histórico.

#### D-GIT-06: Nunca `--force` cego
- ❌ **ERRADO**: `git push --force` após divergência
- ✅ **CERTO**: `git pull --no-rebase origin main && git push origin main`
- **Por quê**: Past learning explícita.

#### D-GIT-07: Commitar HTMLs auto-gerados juntos
- ❌ **ERRADO**: deixar `painel-scrum.html` e `public/scrum.html`
  modificados no working tree após `sync.cjs --fix`
- ✅ **CERTO**: `git add -A` antes do commit (eles SEMPRE mudam quando
  o JSON muda)
- **Por quê**: Previne "nothing to commit" no fim do loop.

### 3.6. Honesty & Verification

> **Princípio**: "Eu creio que as tarefas não chegaram a entrar no scrum"
> (usuário me cobrou). "Você fez o merge, pull, comit e deploy de tudo?"
> (usuário testando minha honestidade). Ser honesto sobre o que foi
> feito e o que não foi.

#### D-HONEST-01: "Pronto" só após verificar
- ❌ **ERRADO**: declarar "bloco concluído" baseado em suposição
- ✅ **CERTO**: rodar a verificação do §4 (checklist) antes de declarar
- **Por quê**: Previne E-MED-04 e E-CRIT-02.

#### D-HONEST-02: Responder "não verifiquei" quando aplicável
- ❌ **ERRADO**: inventar resposta para parecer competente
- ✅ **CERTO**: admitir lacuna: "Não verifiquei isso ainda. Deixa eu
  checar." + verificar + responder com verdade
- **Por quê**: O usuário valoriza honestidade. Ele me cobrou
  ("Eu creio que as tarefas não chegaram a entrar no scrum") quando
  eu não fui transparente.

#### D-HONEST-03: Distinguir "feito" vs "mergeado" vs "deployado"
- ❌ **ERRADO**: "Tudo pronto!" (sem esclarecer onde)
- ✅ **CERTO**: separar status:
  - **Feito**: código escrito, build verde localmente
  - **Commitado**: no branch do worktree
  - **Mergeado**: em main
  - **Pushed**: no origin/main
  - **Deployado**: workflow do GitHub Actions rodou com sucesso
  - **Disponível ao user**: site oficial está com a versão
- **Por quê**: Cada etapa pode falhar separadamente. Previne E-MED-04.

#### D-HONEST-04: "Audit only" ≠ "verifiquei tudo"
- ❌ **ERRADO**: marcar bloco como "audit only" sem grep completo
- ✅ **CERTO**: se marcar como audit only, documentar quais arquivos
  foram lidos, quais greps rodaram, qual a confiança
- **Por quê**: Previne E-MED-03. Se eu realmente auditei, posso
  provar.

### 3.7. Past Learnings

> **Princípio**: "Observe o que já fez ele parar das vezes anteriores"
> (P12). Cada erro listado na §2 tem um par de past learnings.

#### D-PAST-01: Sem cron UX durante merge manual
- ❌ **ERRADO**: deixar cron UX rodar enquanto faz merge manual de
  branches DS_V2
- ✅ **CERTO**: desabilitar cron UX (mavis) durante operações manuais
  em escala
- **Por quê**: Race condition: cron faz commits paralelos que conflitam
  com SCRUM_TASKS.json.

#### D-PAST-02: Sem `-X theirs` cego
- ❌ **ERRADO**: `git merge -X theirs origin/main` para "resolver
  conflito"
- ✅ **CERTO**: resolver manualmente, lendo o diff
- **Por quê**: Quebrou JSX no passado.

#### D-PAST-03: `npm ci` antes de push
- ❌ **ERRADO**: pular `npm ci` se "parece OK"
- ✅ **CERTO**: `npm ci` (com lockfile) para garantir paridade com
  o CI
- **Por quê**: Diferença de `node_modules` local vs CI causa bugs
  intermitentes.

#### D-PAST-04: Pattern de init Firebase em Cloud Functions
```js
if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
```
- **Por quê**: Sem isso, `FirebaseAppError: The default Firebase app
  does not exist`.

#### D-PAST-05: Wrapper `.js` para `.cjs` em Functions
```js
// foo.js
module.exports = require('./fooCore.cjs');
```
- **Por quê**: Node 20 com `type: commonjs` só procura `.js` por padrão.

#### D-PAST-06: Firestore rules sem `[^/]`, sem `r'...'`
- ❌ **ERRADO**: regex complexa com classes negadas
- ✅ **CERTO**: preferir `isString() && size() <= N` ou regex simples
- **Por quê**: Parser do Firebase CLI rejeita essas formas.

#### D-PAST-07: `sync.cjs --fix` ANTES do commit
- ❌ **ERRADO**: deixar o commit sem sync, esperando rodar depois
- ✅ **CERTO**: rodar sync.cjs --fix IMEDIATAMENTE antes de `git add`
- **Por quê**: Previne E-HIGH-03.

---

## 4. Auto-check antes de declarar "bloco concluído"

Antes de marcar a task macro do bloco como `done`, percorra esta
checklist mentalmente (ou rode o script abaixo):

```bash
# 1. Build verde?
npm run build  # exit 0 obrigatório

# 2. Lint sem regressões?
npm run lint  # contar problemas; comparar com main

# 3. SCRUM metrics corretas?
node .harness/sync.cjs --fix
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log(d.metrics.dsV2Tasks)"
# done === total?

# 4. activeWorktrees limpo?
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log('wt:', d.activeWorktrees.length)"
# deve ser 0 (após merge) ou 1 (worktree atual)

# 5. activeSessions com status correto?
node -e "const d=require('./.harness/SCRUM_TASKS.json'); console.log(d.activeSessions[0].status)"
# deve ser 'started' se loop continua, 'completed' se terminou

# 6. Branches mergeadas deletadas (local + remoto)?
git branch -a | grep "feat/" | wc -l
# deve ser só o branch atual (se em worktree) ou 0 (em main)
```

**Se QUALQUER item falhar**: NÃO marque como done. Corrija primeiro.

---

## 5. Apêndice: Timeline da Fase 4 (DS_V2)

Para referência histórica:

| Horário | Evento |
|---|---|
| 2026-07-16 14:32 | Usuário pede início do trabalho |
| 2026-07-16 14:53 | Mavis explica abordagens + recomenda opções |
| 2026-07-16 15:18 | Usuário aprova + pede integração completa no SCRUM |
| 2026-07-16 15:18-16:05 | 11 blocos entregues em ~1h30 |
| 2026-07-16 16:05 | Usuário: "Eu creio que as tarefas não chegaram a entrar no scrum" |
| 2026-07-16 16:05-16:10 | Mavis descobriu metrics dessincronizadas, worktrees stale |
| 2026-07-16 16:10 | Usuário: "No site oficial, não há nenhum flag disponível para eu ligar" |
| 2026-07-16 16:11-16:17 | Mavis registrou 11 flags no código, deployou, sucesso |
| 2026-07-16 16:18 | Usuário pede este documento |

**Lição do dia**: trabalhar em partes, MAS verificar a entrega de cada
parte antes de declarar concluída. O usuário me cobrou **duas vezes**
em 13 minutos. Isso é humilhante e instrutivo.

---

*Documento vivo. Atualizar sempre que um novo erro for cometido. Owner:
Mavis (orquestrador técnico). Cross-reference com `AGENTS.md` Regra A+B.*
