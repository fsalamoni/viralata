# AGENTS_CHANGELOG

> Histórico de mudanças do `AGENTS.md` (Regras A + B + protocolo persistente).
> Toda alteração em `AGENTS.md` DEVE gerar uma entrada aqui (Regra B).
> Formato: data · versão · autor · mudança · impacto.

---

## v1.1.0 · 2026-07-12 · Mavis (`mvs_f1e04f28717d42cdba05e221b7b4b6f3`)

### Mudança: canonicalizar `scrum.cjs` como única interface de transição de status

**TASK-374** — Atualizar AGENTS.md Regra B 2.2/2.3 para usar `.harness/scrum.cjs`.

**O que mudou**:
- Adicionada **§B.1.6 Cheat sheet** com comandos práticos de `scrum.cjs` (start/done/review/block/drop/list/show)
- Marcado `autosync.cjs` (TASK-373) como **DEPRECATED** — substituto é `scrum.cjs` direto
- B.1.5 já recomendava `scrum.cjs`; agora B.1.6 dá a tabela canônica de uso
- **Proibido** editar `SCRUM_TASKS.json` manualmente para mudar status (exceção: descrição/nota/evidence/tag)

**Impacto**:
- ✅ Lock single-instance garantido (proper-lockfile)
- ✅ Atomic write (writeFileSync tmp + rename)
- ✅ Validação de transições (não pula estado)
- ✅ Recálculo automático de métricas
- ⚠️ **BREAKING**: workers que editavam JSON manualmente precisam migrar para `scrum.cjs`
- ⚠️ `autosync.cjs` (TASK-373 daemon) não é mais suportado — usar `scrum.cjs` + `sync.cjs --watch`

**Migração**:
```bash
# Antes (DEPRECATED):
node -e "const j=require('./.harness/SCRUM_TASKS.json'); const t=j.tasks.find(x=>x.id==='TASK-X'); t.status='in_progress'; require('fs').writeFileSync('./.harness/SCRUM_TASKS.json', JSON.stringify(j,null,2))"

# Agora (canonical):
npm run scrum:start -- TASK-X --owner $(mavis communication peers --self) --branch feat/...
```

**Bloqueado por (todos done)**: TASK-372 (proper-lockfile devDep), TASK-373 (migração autosync — agora deprecated), TASK-375 (smoke test).

**Como re-ler**:
- Sessões devem re-ler este changelog e o AGENTS.md §B.1.6 antes de iniciar próxima task
- Root pode enviar `mavis communication send` broadcast com link pra este CHANGELOG

---

## v1.0.0 · 2026-07-11 · Mavis (`mvs_311d078987d0414a90f57ef28b789b18`)

Versão inicial. Criada no contexto do PR #73 (recupera merges pendentes). Definiu:

- Regra A — Avaliação Plena por Funcionalidade (5 eixos: UX, papéis, regras de negócio, integrações, pós-deploy)
- Regra B — Auto Scrum Update (transições obrigatórias + CLI `scrum.cjs` em B.1.5)
- Stack congelada
- LGPD & Segurança (completa)
- Worktree & PR (regras reafirmadas)
- Persistência e auditoria

---

*Mantido por: viralata-coder (root session) — toda mudança em `AGENTS.md` DEVE atualizar este changelog.*
