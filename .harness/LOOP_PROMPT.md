# LOOP_PROMPT — Loop de UX/Design Contínuo (até o user desligar)

> **Modo**: autônomo, 24/7, focado em **UX, layout, design, espaçamento, hierarquia visual**.
> **Objetivo**: ajustar TUDO o que existe na plataforma para que seja **fácil de usar**, **bonito**, **sem sobreposições**, **com hierarquia clara**.
> **Não prejudicar nada**: calma, cautela, atenção. Commitar e fazer push de cada entrega.

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

Use estas classes CSS já criadas:

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

## CHECKLIST POR TASK

Para cada ajuste:

- [ ] Li o componente inteiro antes
- [ ] Identifiquei o problema específico (não "mexer em tudo")
- [ ] Apliquei mudança **cirúrgica** (1-2 lugares)
- [ ] Build passa (`npm run build`)
- [ ] Não quebrei testes existentes (rodei `npm test -- <path>` antes/depois)
- [ ] Commit descritivo
- [ ] Push
- [ ] sync.cjs --fix + commit
- [ ] Próxima task

---

## ORDEM DE ATAQUE (do mais crítico para o polish)

1. **TASK-602** — Auditoria visual completa (relatório)
2. **TASK-605** — Eliminar sobreposições de cards
3. **TASK-608** — Tabs sticky + URL sync
4. **TASK-603** — Hero da Home com hierarquia
5. **TASK-620** — Cards de pet com hierarquia
6. **TASK-611** — Mobile: touch targets 44px
7. **TASK-612** — Focus states visíveis
8. **TASK-606** — Field component em forms
9. **TASK-607** — Modais centralizados
10. **TASK-609** — Empty states consistentes
11. **TASK-610** — Loading skeletons
12. **TASK-613** — Tipografia (5 tamanhos)
13. **TASK-621** — Dashboard cards consistentes
14. **TASK-604** — Espaçamentos semânticos
15. **TASK-616** — Breadcrumbs
16. **TASK-614** — Cores semânticas
17. **TASK-615** — Ícones padronizados
18. **TASK-617** — Toasts consistentes
19. **TASK-619** — Animações suaves
20. **TASK-618** — Dark mode

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
