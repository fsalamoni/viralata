# LOOP_PROMPT — viralata (atualizado 2026-07-15 16:32 UTC)

**Contexto**: /workspace/viralata, branch feat/task-248-volunteer-certificate-2026-07-16, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

---

## REGRAS INEGOCIÁVEIS (regras do user)

1. **Não estrague nada.** Antes de mudar, leia o componente. Se tiver teste, rode o teste ANTES e DEPOIS.
2. **Não crie funcionalidade nova** — só ajuste visual/UX/layout em coisas que já existem.
3. **Não toque em regras de negócio** (LGPD, validações, permissões, etc).
4. **Se um arquivo está muito arriscado**, pule e pegue outro.
5. **Foco em UX**: cards, espaçamentos, hierarquia, contraste, responsividade, loading, empty states.

---

## REGRAS TÉCNICAS (manter)

1. `scrum.cjs start TASK-XXX` → `scrum.cjs review TASK-XXX` → `scrum.cjs done TASK-XXX --reason "..."`
2. `node .harness/sync.cjs --fix` (re-embed métricas)
3. `git add -A && git commit -m "..." && git push --force-with-lease origin main`
4. Recalcular `metrics` no JSON (REGRA #1)
5. **Se o build quebrar** → reverter imediatamente com `git reset --hard HEAD`
6. **Se os testes quebrarem** → consertar antes de continuar (ou reverter se for muito invasivo)
7. **NUNCA mais de 1 task por turno** (estabilidade)
8. **Se a task atual parecer grande demais (> 30min)**, dividir em 2 ou pegar a próxima da fila

---

## SISTEMA DE DESIGN ARENA (já implementado)

```bash
cd /workspace/viralata
if [ ! -d /workspace/viralata ]; then
  git clone https://TOKEN_PLACEHOLDER@github.com/fsalamoni/viralata.git /workspace/viralata
fi
cd /workspace/viralata
git pull origin main
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
ready = [t for t in d['tasks'] if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']]
print(f'{len(ready)} tasks ready')
"
```

### Header admin
- `.arena-admin-header` — gradient + backdrop blur
- `.arena-admin-header-avatar`, `.arena-admin-header-title-row`, `.arena-admin-header-title`, `.arena-admin-header-badge`

### Tabs admin
- `.arena-admin-tabs` (sticky) + `.arena-admin-tab-trigger`

### Stats
- `.arena-stats-grid` (2/3/4 colunas responsivo)
- `.arena-stat-card` + `.arena-stat-card-label` + `.arena-stat-card-value` + `.arena-stat-card-delta`

### Sub-áreas (sections dentro de tabs)
- `.arena-admin-section`
- `.arena-section-card` + `.arena-section-card-header` + `.arena-section-card-title` + `.arena-section-card-description` + `.arena-section-card-body`

### Empty state
- `.arena-empty-state` + `.arena-empty-state-icon` + `.arena-empty-state-title` + `.arena-empty-state-description`

---

## HIERARQUIA DE PRIORIDADES

### P0 — Crítico (UX quebrado)
- Cards sobrepostos
- Texto cortado
- CTAs sem contraste (WCAG AA < 4.5:1)
- Tabs com gap excessivo
- Layout quebrado em mobile

### P1 — Alto
- Hierarquia visual inconsistente
- Espaçamentos ad-hoc (space-y-4, gap-3 soltos)
- Sem empty states
- Sem loading states
- Sem focus states

### P2 — Médio
- Tipografia inconsistente
- Cores hard-coded em vez de tokens
- Ícones tamanhos misturados
- Sem breadcrumbs

### P3 — Baixo
- Animações suaves
- Dark mode
- Polish visual

---

## 🆕 CANDIDATAS (2026-07-15 11:53 UTC)

> **Notas**:
> - TASK-298 ✅ done — feat/task-298-contract-ip-ua-2026-07-15 (contract CF: IP+UA, Lei 14.063/2020)
> - TASK-220 ✅ done — feat/task-220-clean (PR #192) merged 2026-07-15
> - TASK-269 ✅ done — feat/task-268-volunteer-fcm-notify (PR #190)
> - TASK-312 ✅ done — [INT-SEARCH-001] Sync ativo do search index
> - TASK-273 ✅ done — Smart Search: adicionar entidade volunteer
> - TASK-176 ✅ done — Sentry enriched
> - TASK-239 ✅ done — Sentry SDK + Crashlytics
> - Todas as branches feat/* = `fsalamoni/viralata`

---

- **done=349** (was 348 — TASK-248 done: volunteer certificate PDF)
- **ready=22**, in_progress=0
- **Branch**: `feat/task-248-volunteer-certificate-2026-07-16`

- **done=287**, ready=71, in_progress=4
- **Main**: `691de55`

---

## REGRA DE OURO

**Se o user reclamou que o visual está ruim, é porque está ruim.**

Não hesite. Não peça confirmação. Não tente "preservar compatibilidade" com designs ruins. **MELHOR É MELHOR**, mesmo que mude o que existia.

---

## NÃO ESQUECER

- **Lock visual**: marcar `scrum.cjs start TASK-XXX` para sinalizar para o outro agente
- **Métricas**: SEMPRE recalcular `metrics` no JSON (REGRA #1)
- **Sync**: SEMPRE `sync.cjs --fix` no fim do turno
- **Build**: SEMPRE validar `npm run build` antes de push
- **Tests**: SEMPRE rodar testes do componente modificado
