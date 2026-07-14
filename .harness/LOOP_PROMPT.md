# LOOP_PROMPT — desenvolvimento autônomo (atualizado 2026-07-14 18:18 GMT-3)

**Contexto**: `/workspace/viralata`, branch `main`, React+Vite+Firebase.
**Sessão**: Mavis root (loop autônomo, 20min).

---

## 🎯 MISSÃO DO TURNO (20 min)

1. **Investigue ANTES de codar** (NÃO leia tudo):
   - 1-2 greps para ver arquivos relacionados
   - `head -50 arquivo.jsx` para entender o contexto
   - Verifique schemas/domínio antes de escrever código
2. **Implemente com feature flag** (`SHELTER_*` ou conforme categoria, default OFF).
3. **Test**: 2+ tests smoke no mínimo.
4. **Worktree** + branch `feat/<slug>-2026-07-14`.
5. **Commit + push + PR API + merge admin squash** (bypass CI por quota).
6. **OBRIGATÓRIO ao final**:
   ```bash
   cd /workspace/viralata
   python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); [t.update({'status':'done','pr':'$PR_NUM','branch':'feat/<slug>-2026-07-14','updatedAt':'2026-07-14'}) for t in d['tasks'] if t['id']=='TASK-XXX']; json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
   node .harness/scrum.cjs done TASK-XXX --pr $PR_NUM --reason "..."
   node .harness/sync.cjs --fix
   git add -A && git commit -m "chore(scrum): TASK-XXX done PR #$PR_NUM"
   git pull --rebase --autostash origin main
   git push origin main
   ```
7. **ATUALIZE O `LOOP_PROMPT.md`** ao final se completou uma task crítica: remova ela da lista, adicione nova candidata, faça commit + push do LOOP_PROMPT.md atualizado.

---

## ✅ TASKS CONCLUÍDAS NESTE LOOP (NÃO pegar)

- TASK-148 PostEventLog (PR #176)
- TASK-136 PublicHealthRecord (PR #175)
- TASK-149 UpcomingExhibitionsFeed (PR #177)
- TASK-181 EventsUnified (PR #178)
- TASK-323 Lightbox acessível (PR #179)
- TASK-306 FosterDashboard (PR #180)
- TASK-311 ShelterAdminDashboard (PR #181)
- TASK-324 Pets similares (PR #184)
- TASK-334 CommunityEventDetail + RSVP (PR #183)
- TASK-207, 264, 265, 266, 267, 132, 133, 134, 401, 402 (Fases anteriores)
- **Varredura**: 36 tasks done cruzando git log

---

## 🆕 CANDIDATAS ATUALIZADAS (próximas 12, priorizadas por impacto visual)

| ID | Pri | Categoria | Descrição |
|---|---|---|---|
| **TASK-147** | high | shelter | Vitrines: sistema de escalas (turnos por role) |
| **TASK-326** | medium | shelter | [UX-FOSTER-003] Vitrine pública do LT (histórico pets) |
| **TASK-310** | high | shelter | [UX-MATCH-001] Scoring compatibilidade visível em Applications |
| **TASK-308** | high | shelter | [UX-POSTADOPT-001] UI devolução + pause |
| **TASK-315** | high | shelter | [UX-A11Y-001] Acessibilidade (keyboard nav, ARIA, contraste WCAG) |
| **TASK-309** | high | shelter | [UX-ABRIGO-002] Onboarding wizard do abrigo (5 passos) |
| **TASK-325** | medium | shelter | [UX-MILESTONE-001] Foto/video pro adotante completar milestones |
| **TASK-309** | high | shelter | (idem acima) |
| **TASK-264** | critical | shelter | Modal inscrição de voluntário (re-checar duplicação) |
| **TASK-265** | critical | shelter | Seção "Voluntário" em Profile.jsx (re-checar) |
| **TASK-266** | critical | shelter | Rota /perfil/voluntario (re-checar) |
| **TASK-268** | critical | shelter | Cloud Function onVolunteerJoinedShelter (FCM admin) |

> **Nota**: TASK-264, 265, 266, 267, 132, 133, 134, 401, 402 já foram entregues anteriormente — **verificar com `git log` se ainda não estão no main** antes de pegar.

---

## 🎯 PRINCÍPIOS INEGOCIÁVEIS

- **NÃO PREJUDICAR NADA**. Calma, cautela, atenção.
- **Feature flags SEMPRE**. Default OFF.
- **NUNCA commitar sem** `git status -s` + `git diff --cached --stat`.
- Use `forwardRef` em tests: `expect(X).toBeTruthy()` (não `typeof === 'function'`).
- Lint 0, build OK, tests passando.
- Em imports complexos de `lucide-react`: adicionar NOME ao import existente, não criar novo.
- **Em caso de conflito de rebase**: `git checkout --theirs <arquivo> && git add -A && git commit && git push --force-with-lease`. NÃO usar `git pull` puro.

---

## 🔧 COMANDOS CANÔNICOS

```bash
cd /workspace/viralata

# Investigar
grep -rln "termo" src/path/
head -50 src/path/arquivo.jsx

# Worktree
git worktree add -b feat/<slug>-2026-07-14 .worktrees/wt-<slug> main
cd .worktrees/wt-<slug>
git pull --rebase --autostash origin main

# Implementar, build, test
npm run build
npx vitest run --no-coverage src/path/__tests__/X.test.jsx

git add -A && git commit -m "feat: ..."
git push -u origin feat/<slug>-2026-07-14

# PR + merge
cd /workspace/viralata
PR_NUM=$(curl -sS -X POST -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"title":"...","head":"feat/<slug>-2026-07-14","base":"main","body":"..."}' \
  "https://api.github.com/repos/fsalamoni/viralata/pulls" | python3 -c "import sys,json; print(json.load(sys.stdin).get('number'))")
sleep 20
curl -sS -X PUT -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"merge_method":"squash"}' "https://api.github.com/repos/fsalamoni/viralata/pulls/$PR_NUM/merge"

# Scrum update (OBRIGATÓRIO)
git worktree remove --force .worktrees/wt-<slug> && git worktree prune && git branch -D feat/<slug>-2026-07-14
python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); [t.update({'status':'done','pr':'$PR_NUM','branch':'feat/<slug>-2026-07-14','updatedAt':'2026-07-14'}) for t in d['tasks'] if t['id']=='TASK-XXX']; json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
node .harness/scrum.cjs done TASK-XXX --pr $PR_NUM --reason "..."
node .harness/sync.cjs --fix
git add -A && git commit -m "chore(scrum): TASK-XXX done PR #$PR_NUM"
git pull --rebase --autostash origin main
git push origin main

# Atualizar este prompt (ao final do turno)
# 1) Editar .harness/LOOP_PROMPT.md (remover done, adicionar nova)
# 2) Atualizar cron com 'mavis cron update'
# 3) Commit + push do .harness/LOOP_PROMPT.md
```

---

## 📋 SE NÃO TIVER CERTEZA

Escolha a task com **mais impacto visual** e **menos dependência** de:
- Firebase rules/dados sensíveis
- Decisões jurídicas (LGPD, DPO)
- Cloud Functions (FCM, email)

**Default**: TASK-310 (Scoring compatibilidade) ou TASK-326 (Vitrine pública LT) ou TASK-147 (Escalas vitrines) — são features visíveis e seguras.

---

## 🏁 FIM DO TURNO

**SEMPRE terminar com**:
1. ✅ Scrum update (`scrum.cjs done` + `sync.cjs --fix`)
2. ✅ Commit + push do scrum update
3. ✅ Atualizar `.harness/LOOP_PROMPT.md` (lista refresh)
4. ✅ Atualizar cron `viralata-dev-loop-20min` com novo prompt
5. ✅ Commit + push do LOOP_PROMPT.md
6. ✅ Resumo do que foi entregue
