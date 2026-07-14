# LOOP_PROMPT — desenvolvimento autônomo de 20 min

**Contexto**: /workspace/viralata, branch main, projeto React+Vite+Firebase.

**Sua missão neste turno (20 min)**:
1. Leia `.harness/SCRUM_TASKS.json` e pegue a próxima task com `status: ready` e `owner ≠ human/human-juridico`. Use o script `.harness/next-loop.sh` se quiser.
2. **Investigue ANTES de codar**:
   - Leia o `description` da task
   - Use 1-2 greps para ver arquivos relacionados (não leia tudo)
   - Verifique schemas/domínio antes de escrever código
3. **Implemente com feature flag** (SHELTER_* ou conforme categoria).
4. **Test**: 2+ tests smoke no mínimo.
5. **Worktree** + branch `feat/<slug>-2026-07-14`.
6. **Commit + push + PR API + merge admin squash** (bypass CI por quota).
7. **OBRIGATÓRIO ao final**:
   ```bash
   cd /workspace/viralata
   python3 -c "import json; ..." # marcar task done com PR
   node .harness/scrum.cjs done TASK-XXX --pr YYY --reason "..."
   node .harness/sync.cjs --fix
   git add -A && git commit -m "chore(scrum): TASK-XXX done PR #YYY"
   git pull --rebase --autostash origin main
   git push origin main
   ```

**Princípios inegociáveis**:
- NÃO PREJUDICAR NADA. Calma, cautela, atenção.
- Feature flags SEMPRE. Default OFF.
- NUNCA commitar sem `git status -s` + `git diff --cached --stat`.
- Use `forwardRef` em tests: `expect(X).toBeTruthy()` (não `typeof === 'function'`).
- Lint 0, build OK, tests passando.
- Em imports complexos de lucide-react: adicionar NOME ao import existente, não criar novo.

**Próximas candidatas boas (visíveis para user)**:
- TASK-311 (UX-ABRIGO-003) - Dashboard admin do abrigo
- TASK-308 (UX-POSTADOPT-001) - UI devolução + pause
- TASK-309 (UX-ABRIGO-002) - Onboarding wizard 5 passos
- TASK-310 (UX-MATCH-001) - Scoring compatibilidade visível
- TASK-315 (UX-A11Y-001) - Keyboard nav + ARIA + contraste
- TASK-324 (UX-SIMILAR-001) - Pets similares no PetDetail
- TASK-325 (UX-MILESTONE-001) - Foto/video pro adotante
- TASK-326 (UX-FOSTER-003) - Vitrine pública do LT
- TASK-334 - Página pública de evento individual + RSVP

**Se não tiver certeza**: escolha a com mais impacto visual e
menos dependência de Firebase rules/dados sensíveis.

**Fim do turno**: SEMPRE termine com a atualização do Scrum
e push do commit.
