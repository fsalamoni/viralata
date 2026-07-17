# V3 Feed — Últimas dúvidas antes de codar

> **Status**: AGUARDANDO RESPOSTAS para começar implementação
> **Documentos prontos**:
> - `docs/PLAN_V3_REDESIGN.md` (plano macro)
> - `docs/PAGE_REGENCY_TEMPLATE.md` (template eterno)
> - `docs/REGENCY_FEED_V3.md` (regência da Feed — 16KB, 11 seções)

---

## D1 — Cidade do usuário no autocomplete (Q8)

Você disse: "Input + autocomplete. A primeira cidade que deve aparecer é a do usuário."

Hoje o `userProfile.city` é texto livre. **3 formas de usar**:

- **(a) Default exato**: pré-preencher o input com `userProfile.city`. Se a cidade não está na tabela de coordenadas, fallback para "Sem limite" (sem raio).
- **(b) Default + sugestão no topo**: pré-preencher + mostrar `userProfile.city` como primeiro item mesmo se não está na tabela.
- **(c) Default + dropdown imediato**: pré-preencher + abrir dropdown com cidades do user + principais capitais.

**Recomendação**: **(a)**. Mais simples, menos poluição visual. Se quiser mudar depois, é só trocar o `defaultValue` do `<InputCityAutocomplete>`.

---

## D2 — Paginação responsiva (REVISADA 2026-07-17 14:30)

Você confirmou universal MAS "para mobile e tablet não pode ser a mesma coisa que para tela de PC".

**Resolução**: Paginação é configurada por viewport:

| Viewport | Colunas (default) | Opções de cards/página | Default |
|---|---|---|---|
| **Mobile** (<640px) | 1 | `[4, 8, 12]` | 8 |
| **Tablet** (640-1024px) | 2 | `[8, 12, 20]` | 12 |
| **Desktop** (≥1024px) | 4 (auto: 3-5) | `[12, 20, 40, 100]` | 12 |

A preferência do user (`feedCardsPerPage`) tem 3 valores: `{ mobile, tablet, desktop }`. Default sensato por viewport.

UI: card "Cards por página (por tela)" no `AppearanceSettings` com 3 sub-controls (Mobile/Tablet/Desktop), cada um com as opções acima.

Aplicação: hook `useResponsiveCardsPerPage()` retorna o valor baseado no viewport atual + preferência do user.

---

## D3 — Modo compacto nos cards

`prefs.compactMode` é global. Quando true, **o que muda na Feed**?

- **(a) Só paddings**: `p-4` → `p-3` em todos os cards.
- **(b) Paddings + tamanho da fonte**: `text-sm` → `text-xs` em metadados.
- **(c) Paddings + esconde badges secundários**: mostra só prioridade + nome + cidade.

**Recomendação**: **(a)**. Mudança sutil, sem perder informação. Cards do "Todos os pets" ficam mais densos no modo compacto.

**Confirma?**

---

## D4 — Filtros aplicados no collapsible fechado?

O "Ver todos os pets disponíveis" começa **fechado**. Mas os filtros (espécie, porte, cidade, raio) ficam ACIMA dele, no topo da página.

Quando o user:
1. Aplica filtro "Cães" no topo
2. Clica "Ver todos os pets disponíveis"
3. O grid mostra só cães?

**Recomendação**: **Sim**. O collapsible é só visual (esconde/mostra). Os filtros já estão aplicados na query `usePetFeed(filters)`. O grid reflete o estado atual dos filtros independente do collapsible.

**Confirma?**

---

## Status

- [x] D1 — **recomendação a)**
- [ ] D2 — **aguardando**
- [ ] D3 — **recomendação a)**
- [ ] D4 — **recomendação sim**

**Se concordar com todas, responda "vai" e eu começo a codar agora.**
