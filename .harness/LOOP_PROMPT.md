# LOOP_PROMPT — viralata (atualizado 2026-07-17 02:20 UTC)

**Contexto**: /workspace/viralata, branch main @ 2c91b28, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, **30min**, 24/7 sem limite de horário).
**Janela ativa**: ~5h restantes da FULL_AUDIT_2026-07-17.

**Missão**: **VARREDURA COMPLETA FULL_AUDIT_2026-07-17** (107 tasks, TASK-813..TASK-919).
Ver `docs/FULL_AUDIT_2026-07-17.md` para o documento canônico.

**MODO ATUAL**: MERGE+DEPLOY A CADA TASK. **ANTI-FACHADA ATIVA** (v3 — pós-análise).

**Métricas atuais (após reversão)**:
- 542 done, 30 FULL_AUDIT done (com commit)
- 80 backlog
- 19 tasks que tinham sido marcadas done SEM commit → revertidas para backlog
- **REGRAS REFORÇADAS** abaixo

---

## 🔴 REGRA DE OURO #0 — SEM FACADA. TRABALHO REAL, NÃO APARENTE. 🔴 (v3)

**O agente do loop NÃO PODE fingir que viu, NÃO PODE fingir que mudou, NÃO PODE fingir que terminou.**

User alertou 2026-07-17 02:13 (esta sessão):
> "Parte o loop, ajuste as regras para que faça trabalho real mesmo, dentro do que deve ser feito, conforme já falei várias vezes. Após, religue o loop."

E 2026-07-16 17:13:
> "Lembre-se, eu quero aprimoramento, melhoria e otimização real e verdadeira! O agente do loop não pode fingir que viu, precisa olhar de fato, precisa analisar a realidade e fazer as mudanças reais!"

E 2026-07-17 00:00:
> "Não quero que finja ou que tenha preguiça, preciso que entre em todos o código, leia e análise linha por linha. Quero tudo, literalmente tudo corrigido... A partir de agora, nenhum erro é aceitável!"

## 🛑 ANTI-FACHADA: VALIDAÇÃO OBJETIVA (NOVO v3)

**A task SÓ pode ser marcada como `done` SE passar em TODAS estas validações objetivas:**

### 1. **TER COMMIT COM CÓDIGO REAL**
```bash
git log --oneline --grep="TASK-XXX" --since="2026-07-17"
# DEVE retornar pelo menos 1 commit
# O commit DEVE ter feat: ou fix: ou refactor: ou perf: ou audit: no subject
# O commit NÃO pode ser só chore(scrum)
```

❌ **PROIBIDO**: marcar `done` com motivo `"no changes needed"`, `"audit only"`, `"already implemented"`, `"doesn't exist"`, `"no tabs"`, `"page not found"`.
- "no tabs" é fachada — significa "não investiguei direito, só olhei grep".
- "doesn't exist" é achado válido MAS não é "done" — é "blocked" ou "dropped" com explicação.
- "page not found" → registrar como `dropped` com motivo, não `done`.

### 2. **DIFF MÍNIMO**
- **Mínimo 10 insertions** OU
- **Mínimo 2 files changed** OU
- **Mudança estrutural visível** (criação de arquivo, refatoração de hook, novo componente)

### 3. **BUILD VERDE** (quando aplicável)
- Se a task mexeu em código React, `npm run build` deve passar.
- Se não tem `node_modules`, instalar antes (`npm ci`).

### 4. **STATUS TRANSITION CORRETA**
- `backlog` → `ready` → `in_progress` → `in_review` → **`done`**
- **`done` SÓ de `in_review`**. Pular `in_review` é PROIBIDO.

### 5. **EVIDÊNCIA NO JSON**
- O campo `evidence` da task DEVE ter:
  - SHA do commit (ou "no commit" se for audit-only legítimo)
  - Número de insertions
  - Lista de arquivos modificados
  - Motivo do mudança (não genérico)

## 🚨 USO DO SCRIPT ANTI-FACHADA (NOVO v3)

**O loop DEVE rodar o script antes de marcar qualquer task como `done`:**

```bash
node .harness/anti-fachada.cjs TASK-XXX
```

Se o script retornar **exit code != 0**, a task **NÃO PODE** ser marcada como done.

**Códigos de erro**:
- 1: erro genérico
- 2: sem commit
- 3: diff muito pequeno
- 4: build quebrado
- 5: status inválido (não está in_review)
- 6: commits são só chore(scrum), sem feat/fix

**Opções de override** (USE COM CAUTELA, documentar motivo):
- `--allow-no-commit`: aceita audit-only com justificativa
- `--allow-small-diff`: aceita diff pequeno se for mudança cirúrgica (ex: 1 linha com import crítico)
- `--allow-chore-only`: aceita só chore se for refatoração mecânica
- `--allow-no-build`: pula check de build (emergência)
- `--force`: força passar (REGISTRE O MOTIVO!)

## 📋 OBRIGAÇÕES POR TASK (mínimo)

1. ✅ Ler **o arquivo inteiro** do componente alvo (não só `head -50`)
2. ✅ Rodar **2+ greps** para entender contexto (uso, callers, dependências)
3. ✅ Verificar **estado visual** real
4. ✅ Implementar **mudança perceptível** que o user vai notar
5. ✅ Rodar `npm run build` verde **antes** do commit
6. ✅ Commitar com mensagem descritiva (o que mudou e por quê)
7. ✅ Conferir `git show HEAD --stat` antes de fazer merge
8. ✅ **RODAR `node .harness/anti-fachada.cjs TASK-XXX` ANTES DE MARCAR DONE**

## 🚫 O QUE SIGNIFICA FACHADA (banido)

Sinais de fachada que o script detecta e que você NÃO PODE fazer:

1. **Marcar `done` sem código modificado** — fachada clássica
2. **Diff < 10 linhas sem justificativa** — provavelmente fachada
3. **"no changes needed" como motivo** — fachada disfarçada
4. **"page not found" / "doesn't exist"** → `dropped`, não `done`
5. **"audit only OK" sem ler arquivo** — fachada de audit
6. **Múltiplas tasks em 1 commit** (sem ser mudança cross-cutting) — esconde fachada
7. **Só reorganização de imports sem mudança funcional** — fachada
8. **Trocar className sem mudar comportamento** — fachada

## ✅ O QUE É TRABALHO REAL

Exemplos de mudanças que o user vai notar:

1. **Bug fix que crashava UI** (ex: `ChevronRight is not defined`)
2. **Loading state que estava faltando** (com Skeleton)
3. **Error state que estava ausente** (com EmptyState amigável)
4. **A11y issues** (role='alert', aria-describedby, aria-invalid)
5. **TabList com 5+ items** (mudar arena-tab-bar → arena-admin-tabs)
6. **Import circular** (refatoração de dependências)
7. **DS_V2 aplicado** (cards, hero, tabs, hero harmonizados)
8. **Lint errors** (unused imports, prop-types)
9. **State mal gerenciado** (useEffect deps, useMemo deps)
10. **PWA / cache / SW** (cleanupOutdatedCaches, navigateFallback)

## 🔴 REGRA ESPECIAL — ATIVAR/MEXER EM FEATURE FLAGS (2026-07-16 23:14) 🔴

Quando ativar uma feature flag ou mudar `DEFAULT_FEATURE_FLAGS` em massa:

1. **Mudar `DEFAULT_FEATURE_FLAGS` em `src/core/featureFlags.js` não basta.**
2. **SEMPRE atualizar `migrateLegacyFlags`** em `src/core/lib/FeatureFlagsContext.migration.js`.
3. **Bump `FLAGS_MIGRATION_VERSION`** em `platformSettingsService.js`.
4. **Adicionar teste** em `FeatureFlagsContext.migration.test.js`.
5. **Após merge, pedir ao user para limpar cache** e confirmar visualmente.

## 🔴 REGRA ESPECIAL — PWA CACHE (2026-07-16 23:33) 🔴

PWA `vite-plugin-pwa` gera `sw.js` (mesmo nome) com `cache-control: public, max-age=31536000, immutable`. PWA instalado no celular do user mantém SW persistente que serve assets antigos.

**REGRA #C-1**: Ao alterar layout, navegação, ou feature flags, SEMPRE bump `filename: 'sw-vN.js'` em `vite.config.js`.
**REGRA #C-3**: Toda página com TabList com 5+ items DEVE usar `arena-admin-tabs` (flex-nowrap + overflow-x-auto). Nunca `arena-tab-bar` (flex-wrap).
**REGRA #C-4**: Mudanças UI críticas SEMPRE bump sw.js.

## 🎯 CICLO DO LOOP (30 min, MERGE+DEPLOY a cada task) — ATUALIZADO v3

```bash
cd /workspace/viralata
git status  # garantir clean
git pull --no-rebase origin main
git log --oneline -1

# Pegar próxima task READY (ou promover do backlog)
NEXT_TASK=$(node -e "const j=require('./.harness/SCRUM_TASKS.json'); const r=j.tasks.find(t=>t.status==='ready'&&t.tags?.includes('full-audit')); if(!r){const b=j.tasks.find(t=>t.status==='backlog'&&t.tags?.includes('full-audit')); if(b){b.status='ready'; require('fs').writeFileSync('./.harness/SCRUM_TASKS.json', JSON.stringify(j,null,2));}} console.log((r||b)?.id || 'NONE');")

if [ "$NEXT_TASK" = "NONE" ]; then
  echo "✅ Nada para fazer. Aguardar."
  exit 0
fi

BRANCH="feat/audit-${NEXT_TASK,,}-2026-07-17"
node .harness/scrum.cjs start $NEXT_TASK
git worktree add .worktrees/wt-$NEXT_TASK -b $BRANCH main
cd .worktrees/wt-$NEXT_TASK

# === INVESTIGAÇÃO REAL (ler INTEIRO) ===
wc -l src/path/to/Component.jsx
cat src/path/to/Component.jsx  # LER INTEIRO
grep -rn "ComponentName" src/ | head -20  # 2+ greps

# === IMPLEMENTAR MUDANÇA REAL ===
# (Não "audit only" sem mudança concreta)
npm run build  # verde obrigatório
git add -A
git commit -m "feat: $NEXT_TASK — descrição REAL do que mudou"

# === CONFERIR DIFF ===
git show HEAD --stat
# Se < 10 linhas mudou: PARAR, refazer com mudança maior

# === MERGE EM MAIN ===
cd /workspace/viralata
git checkout main
git pull --no-rebase origin main
git merge --no-ff $BRANCH -m "merge: $BRANCH"

# Limpar
git worktree remove --force .worktrees/wt-$NEXT_TASK
git worktree prune
git branch -D $BRANCH

# === ANTI-FACHADA CHECK (NOVO v3) ===
# ANTES de marcar done, rodar o script
node .harness/scrum.cjs review $NEXT_TASK

# ESTE É O GATE. Se falhar, REVERTER a task para in_progress
node .harness/anti-fachada.cjs $NEXT_TASK
ANTI_FACHADA_EXIT=$?

if [ $ANTI_FACHADA_EXIT -ne 0 ]; then
  echo "❌ ANTI-FACHADA REJECTED $NEXT_TASK. Reverter para in_progress."
  node .harness/scrum.cjs block $NEXT_TASK --reason "anti-fachada rejected (exit $ANTI_FACHADA_EXIT). Verificar commit."
  exit 1
fi

node .harness/scrum.cjs done $NEXT_TASK --reason "anti-fachada OK + commit $(git rev-parse --short HEAD)"

# === MÉTRICAS + PUSH ===
python3 -c "..."
node .harness/sync.cjs --fix
git add -A && git commit -m "chore(scrum): $NEXT_TASK done"
git pull --no-rebase origin main
git push origin main
```

## 📊 FASES DO FULL_AUDIT_2026-07-17

107 tasks dividas em 11 fases. **Já restaurado após loop ter perdido a estrutura.**

- **Fase 0** — Diagnóstico (5 tasks, TASK-813..817) — 1 done
- **Fase 1** — Erros runtime (8 tasks, TASK-818..825) — 2 done
- **Fase 2** — Feature flags (8 tasks, TASK-826..833) — 5 done
- **Fase 3** — PWA cache (7 tasks, TASK-834..840) — 0 done
- **Fase 4** — Páginas públicas (15 tasks, TASK-841..855) — 5 done
- **Fase 5** — Páginas admin (13 tasks, TASK-856..868) — 5 done
- **Fase 6** — Painel admin abrigo (20 tasks, TASK-869..888) — 0 done
- **Fase 7** — Painel admin comunidade (7 tasks, TASK-889..895) — 0 done
- **Fase 8** — Banco de dados (8 tasks, TASK-896..903) — 0 done
- **Fase 9** — Refatoração (8 tasks, TASK-904..911) — 0 done
- **Fase 10** — Documentação (8 tasks, TASK-912..919) — 0 done

**Total**: 30/107 done, 77 backlog.

## ⛔ NÃO FAZER (NESTE MODO)

- ❌ **FINGIR** que viu, leu ou mudou algo sem ter feito
- ❌ Marcar `done` SEM commit (`--allow-no-commit` só em audit justificado)
- ❌ Marcar `done` com diff < 10 linhas (`--allow-small-diff` só com mudança cirúrgica)
- ❌ Marcar `done` direto de `in_progress` (sempre `in_review` antes)
- ❌ **Pular o `node .harness/anti-fachada.cjs TASK-XXX`** — ESTE É OBRIGATÓRIO
- ❌ **Reescrever o SCRUM_TASKS.json** inteiro (perde fases, ids, estrutura)
- ❌ **Acumular múltiplas tasks em 1 commit** (cross-cutting OK; senão separar)
- ❌ Pular `sync.cjs --fix` antes de commit
- ❌ Esquecer `pull --no-rebase` antes de push
- ❌ Mudar `DEFAULT_FEATURE_FLAGS` sem migrateLegacyFlags
- ❌ Mudar UI crítica sem bump sw.js

## 🏁 FIM DO TURNO

1. REGRA #0 (scrum update)
2. REGRA #1 (metrics sync)
3. **ANTI-FACHADA CHECK** (`node .harness/anti-fachada.cjs TASK-XXX`)
4. sync.cjs --fix
5. Commit + push
6. Atualizar LOOP_PROMPT.md se missão mudou

## ⏰ HORÁRIO
- **24/7**, loop a cada **30min** (5h restantes ≈ 10 iterações).

## REGRA DE OURO (v3)

**Cada task que entra `done` DEVE ter:**
1. ✅ Commit com feat/fix/audit no subject
2. ✅ Diff ≥ 10 linhas ou ≥ 2 files
3. ✅ Build verde
4. ✅ Evidence no JSON
5. ✅ Passou no `anti-fachada.cjs`

**Se algum desses FALHAR, a task é revertida para in_progress e marcada blocked com motivo claro.**

**Sem surpresas. SEM FACADA. SEM ATALHOS. NENHUM ERRO É ACEITÁVEL.**
