# V3 Redesign — Diretriz Mestra (Comando do Juiz)

> **Autoridade**: Mavis (juiz final, autorizado pelo user em 2026-07-17 21:24 GMT+3)
> **Missão**: Refazer CADA página da plataforma, uma a uma, no padrão V3 (DS-V2 + flag + lazy + regência)
> **Status**: 🟢 ATIVO (substitui o loop v3-redesign-loop com prompt longo de 7KB)
> **Início**: Imediatamente após o Legal terminar
> **Fim previsto**: quando a fila de 16 páginas acabar (16 iterações × 2h ≈ 32h)

---

## 0. Identidade do Comando

| Campo | Valor |
|---|---|
| **Diretório** | `/workspace/viralata` (com fallback de clone se vazio) |
| **Repositório** | `fsalamoni/viralata` (público) |
| **Branch base** | `main` (sempre) |
| **Worktrees** | `/workspace/viralata/.worktrees/v3-<KEY>` (criado e destruído por iteração) |
| **Frequência** | A cada 2h entre 08:00–22:00 GMT+3 (ativo 14h/dia) |
| **Duração** | até 90min por iteração (sem pressa; se faltar tempo, parar com qualidade) |
| **Modelo** | Reutilizar knowledge de V3 Feed/PetDetail/Legal já entregues |

---

## 1. Por que esta versão (juiz honesto)

O loop v3-redesign-loop original tinha **5 problemas que iam sabotar o redesign**:

1. **Prompt de 7KB** diluía foco em iterações longas
2. **Inconsistência de comportamento** quando workspace vazio (algumas sessões clonavam, outras paravam)
3. **Sem estado persistente** entre iterações (próxima página tinha que ser re-descoberta)
4. **"Aproveita V1" implícito** (você pediu "refazer do zero" — esta versão força fazer do zero no JSX, reusa só hooks/services)
5. **Fachadas permitidas** (loop anterior do FULL_AUDIT só ficou robusto DEPOIS do seu alerta 02:13 UTC)

**Esta versão corrige todos os 5** + adiciona:
- 4 scripts `.cjs` que encapsulam cada fase (testáveis, com retry, com log)
- STATE.json persistente entre iterações (próxima página, fase atual, último erro)
- Auto-desabilitação ao acabar fila (inteligente, sem desperdiçar iterações)
- Foco "PRECISA SER REAL" (anti-fachada obrigatório em cada fase)

---

## 2. Estrutura de arquivos (este diretório)

```
.harness/v3-redesign/
├── DIRECTIVE.md          ← este arquivo (a "Bíblia")
├── STATE.json            ← estado persistente entre iterações
├── ORCHESTRATOR.cjs      ← script raiz que executa os 4 steps
├── step-1-analyze.cjs    ← análise exaustiva (cria tasks filhas)
├── step-2-implement.cjs  ← implementação V3 feature por feature
├── step-3-regency.cjs    ← gera REGENCY_<PAGE>_V3.md
├── step-4-deploy.cjs     ← testes + build + commit + push + SCRUM
└── LOG/
    └── <KEY>.log         ← log por iteração (auditoria)
```

---

## 3. OS 4 STEPS (cada um é um script .cjs executável)

### STEP 1 — `step-1-analyze.cjs` (Análise exaustiva, 30 min)

**Entrada**: `KEY`, `FLAG`, `TASK` do STATE.json

**Saída**:
- `docs/V3_<PAGE>_QUESTIONS.md` (≥ 200 linhas, Q&A + D1-D12)
- 1 task SCRUM filha por feature identificada (8-12 tasks)
- Lista de lacunas V1 vs spec (referenciando `SHELTER_MGMT_ROADMAP.md` e `PLAN_*.md`)

**Validações antes de avançar**:
- ✅ Lista ≥ 5 features
- ✅ ≥ 3 lacunas identificadas
- ✅ ≥ 15 perguntas Q&A
- ✅ ≥ 12 decisões D1-D12

**Se falhar**: registra erro no STATE, sai com exit 1

### STEP 2 — `step-2-implement.cjs` (Implementação V3 do zero, 45 min)

**Entrada**: análise do step 1

**Saída**:
- `src/pages/<Page>.v3.jsx` (componente novo, **NÃO importa V1 JSX**)
- `src/components/<page>/` (sub-componentes novos)
- `src/pages/<Page>.jsx` (wrapper com `React.lazy` + flag `V3_PAGE_<KEY>`)
- Renomeia V1 para `<Page>.v1.jsx` via `git mv`
- 1 commit por feature implementada (commits granulares, NÃO 1 commit gigante)

**Validações**:
- ✅ Worktree criado em `.worktrees/v3-<KEY>`
- ✅ Branch `v3-redesign/<KEY>` ativa
- ✅ Wrapper usa `lazy(() => import())`
- ✅ JSX do V3 **não importa** componentes de `/v1` ou do original
- ✅ Cada sub-componente tem 1 teste mínimo

**Se falhar**: reverte worktree, sai com exit 1

### STEP 3 — `step-3-regency.cjs` (Documento de regência, 15 min)

**Entrada**: componentes V3 criados

**Saída**:
- `docs/REGENCY_<PAGE>_V3.md` com **12 seções obrigatórias** (modelo `PAGE_REGENCY_TEMPLATE.md`)

**Validações**:
- ✅ 12+ seções presentes
- ✅ ≥ 15 páginas A4 (≈ 8000 palavras)
- ✅ Lista TODAS as features implementadas
- ✅ Riscos + mitigações + métricas
- ✅ Cross-ref com `REGENCY_FEED_V3.md` / `PET_DETAIL_V3.md` / `LEGAL_V3.md`

### STEP 4 — `step-4-deploy.cjs` (Testes + Build + Commit + Push + SCRUM, 15 min)

**Entrada**: tudo do step 1-3

**Saída**:
- `npx vitest run` verde (≥ 5 testes novos)
- `npm run build` verde
- `sw-v<N> → sw-v<N+1>` em `vite.config.js`
- Commit + push no worktree
- Merge para main
- `curl https://viralata.web.app/<rota>` validando hash do bundle mudou
- `scrum.cjs done <TASK>` + `sync.cjs --fix`

**Validações**:
- ✅ Anti-fachada (`diff ≥ 10 linhas E ≥ 2 arquivos`)
- ✅ Build verde
- ✅ Hash do bundle deployed mudou
- ✅ SCRUM atualizado

**Se QUALQUER validação falhar**: reverte tudo (`git reset --hard origin/main`), sai com exit 1

---

## 4. STATE.json (persistência)

```json
{
  "currentKey": "HOME",
  "currentFlag": "V3_PAGE_HOME",
  "currentTask": "TASK-V3-HOME",
  "currentPhase": "step-2",          // step-1, step-2, step-3, step-4, done
  "lastRun": 1784336400000,
  "lastError": null,
  "queue": ["HOME", "LOGIN", "PROFILE", ...],
  "history": [
    { "key": "FEED", "task": "TASK-920", "doneAt": "...", "commitSha": "..." },
    { "key": "PET_DETAIL", "task": "TASK-927", "doneAt": "...", "commitSha": "..." },
    { "key": "LEGAL", "task": "TASK-930", "doneAt": "...", "commitSha": "..." }
  ]
}
```

`ORCHESTRATOR.cjs` lê esse STATE no início de cada iteração, avança, e atualiza no fim.

---

## 5. ORCHESTRATOR.cjs (o "maestro")

**Comportamento**:

1. Verifica `/workspace/viralata`:
   - Se vazio → `git clone https://github.com/fsalamoni/viralata /workspace/viralata`
   - Se existe → `git pull --no-rebase origin main`
2. Lê STATE.json
3. Se `currentPhase == 'done'` → próxima página da fila; senão, retoma de onde parou
4. Se fila vazia → desabilita o cron via `mavis cron update --enabled false` e sai
5. Executa o step atual (`node .harness/v3-redesign/step-<N>-*.cjs`)
6. Se exit 0 → atualiza STATE (próximo step ou próxima página) e sai
7. Se exit ≠ 0 → registra erro, NÃO avança fase, sai com exit 1

**Timeout**: 90min (se passar, sai com exit 124 e registra timeout no STATE)

---

## 6. CRON (prompt CURTO, 3 parágrafos)

```yaml
cron_name: v3-redesign-loop
schedule: 0 */2 * * *              # a cada 2h
active_hours: 08:00-22:00 GMT+3
session.mode: new
prompt: |
  Execute o V3 Redesign Loop:
  cd /workspace/viralata && node .harness/v3-redesign/ORCHESTRATOR.cjs

  Se exit 0: reporta TASK-XXX done + commit SHA.
  Se exit ≠ 0: reporta o erro exato e a fase travada.
  Se exit = 42 (ALL_DONE): apenas confirme.
```

**Nada mais**. O prompt NÃO contém regras (todas estão nos scripts .cjs). O agente é o **juiz executor**, não o planejador.

---

## 7. FILA (16 páginas, ordem de prioridade)

PÁGINAS JÁ FEITAS (NÃO TOCAR):
- ✅ FEED (TASK-920)
- ✅ PET_DETAIL (TASK-927)
- ✅ LEGAL (TASK-930)

PRÓXIMAS (em ordem):

| # | KEY | ROTA | FLAG | ESTIMATIVA |
|---|---|---|---|---|
| 1 | HOME | / | V3_PAGE_HOME | 90min |
| 2 | LOGIN | /login | V3_PAGE_LOGIN | 60min |
| 3 | PROFILE | /perfil | V3_PAGE_PROFILE | 90min |
| 4 | CHAT | /chat | V3_PAGE_CHAT | 120min |
| 5 | ADOPTION | /adocao | V3_PAGE_ADOPTION | 120min |
| 6 | COMMUNITY_DETAIL | /comunidades/:slug | V3_PAGE_COMMUNITY_DETAIL | 90min |
| 7 | CLUB_DETAIL | /organizacoes/:id | V3_PAGE_CLUB_DETAIL | 90min |
| 8 | SEARCH | /busca | V3_PAGE_SEARCH | 90min |
| 9 | EVENTS | /eventos | V3_PAGE_EVENTS | 90min |
| 10 | FOSTER | /lar-temporario | V3_PAGE_FOSTER | 90min |
| 11 | VOLUNTEER | /voluntarios | V3_PAGE_VOLUNTEER | 90min |
| 12 | MURAL | /mural | V3_PAGE_MURAL | 60min |
| 13 | ADMIN | /admin | V3_PAGE_ADMIN | 120min |
| 14 | ORG_ADMIN | (org) | V3_PAGE_ORG_ADMIN | 120min |
| 15 | COMMUNITY_ADMIN | (community) | V3_PAGE_COMMUNITY_ADMIN | 120min |
| 16 | SHELTER_ADMIN | (shelter) | V3_PAGE_SHELTER_ADMIN | 120min |

**Total**: 16 páginas × ~90min = 24h. A 1 iteração a cada 2h, levará ~32h (~2 dias úteis).

---

## 8. REGRAS INVARIÁVEIS (NUNCA violar)

1. **Worktree SEMPRE**: `git worktree add .worktrees/v3-<KEY> -b v3-redesign/<KEY> main`
2. **NÃO aproveitar V1 JSX** (você pediu "do zero"): só hooks/services são reusados
3. **Anti-fachada**: diff ≥ 10 linhas E ≥ 2 arquivos. **SEMPRE**.
4. **Flag V3_PAGE_<KEY> já existe** (NÃO criar nova)
5. **React.lazy()** com dynamic import (D-VITE-LAZY-01)
6. **npm run build local** antes de commit (anti HOTFIX-003)
7. **sw-v<N> → sw-v<N+1>** em `vite.config.js` a cada deploy
8. **Validar deploy**: `curl https://viralata.web.app/<rota>` + checar `index-XXX.js` hash mudou
9. **SCRUM update** ao final (scrum.cjs done + sync.cjs --fix)
10. **Doc regência**: 12+ seções, ≥ 15 páginas A4

---

## 9. ERROS QUE NÃO DEVO REPETIR (do passado)

| Erro | Como evitar |
|---|---|
| `git stash` removeu `Terms.jsx` (HOTFIX-003) | SEMPRE `ls` após stash/pop. NUNCA dar stash depois de criar arquivos com `write` |
| Vite constant folding eliminou V3 (D-VITE-LAZY-01) | `React.lazy()` OBRIGATÓRIO. Validar bundle: `grep "ComponenteChave" dist/assets/*<KEY>*.js` |
| `topbar auto-update` workflow só faz pull (D-DEPLOY-VERIFY-01) | SEMPRE validar `index-XXX.js` hash mudou após push |
| DEFAULT_FEATURE_FLAGS sem migração (HOTFIX-001) | Flag é default OFF no código. Migração só se user ligar |
| 24 tasks done-without-commit no FULL_AUDIT (passado) | `anti-fachada.cjs` OBRIGATÓRIO em cada step |
| Inconsistência workspace vazio (passado) | ORCHESTRATOR.cjs SEMPRE clona se `/workspace/viralata` não existe |

---

## 10. MÉTRICAS DE SUCESSO

| KPI | Meta | Como medir |
|---|---|---|
| Páginas V3 entregues | 16/16 | `STATE.json` |
| Anti-fachada 0% violação | 100% | step-4 falha se violar |
| Doc regência completa | 100% | 12+ seções validadas |
| Build verde | 100% | `npm run build` exit 0 |
| Deploy hash mudou | 100% | `curl` + comparação |
| Testes novos por página | ≥ 5 | `npx vitest run --reporter=basic` |
| Componentes V3 novos | ≥ 3/página | `git show --stat` |
| Cron desabilitado ao fim | sim | `mavis cron get` enabled=false |

---

## 11. COMO EXECUTAR MANUALMENTE (debug)

```bash
# Setup único
cd /workspace/viralata
git pull --no-rebase origin main

# Rodar UMA iteração
node .harness/v3-redesign/ORCHESTRATOR.cjs

# Ver estado
cat .harness/v3-redesign/STATE.json

# Ver log
cat .harness/v3-redesign/LOG/<KEY>.log

# Forçar reset de uma página
node -e "const s=require('./.harness/v3-redesign/STATE.json'); s.currentKey='HOME'; s.currentPhase='step-1'; s.lastError=null; require('fs').writeFileSync('.harness/v3-redesign/STATE.json', JSON.stringify(s,null,2));"
```

---

**FIM DA DIRETRIZ**. Juiz: Mavis. Próxima ação: implementar os 4 scripts + ORCHESTRATOR.
