# Documento de Regência — Feed V3

> **Primeira página com regência completa** (TASK-V3-FEED-1)
> **Diretriz ETERNA**: ver `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-17 13:55 UTC

---

## 0. Identidade

| Campo | Valor |
|---|---|
| **Rota** | `/feed` (também `/inicio` redireciona) |
| **Componente** | `src/modules/pets/pages/PetFeedV3.jsx` |
| **Wrapper** | `src/modules/pets/pages/PetFeed.jsx` (escolhe v3 ou v1) |
| **Flag V3** | `V3_PAGE_FEED` (default OFF) |
| **Auth** | Anon-ok (público, com auth opcional) |
| **Plataforma** | Mobile-first, responsivo (testado em 360x640, 768x1024, 1280x800) |
| **Doc atualizada em** | 2026-07-17 13:55 UTC |

---

## 1. Estrutura visual (de cima para baixo)

```
1. PageHero (eyebrow="Feed", title="Encontre seu novo melhor amigo, {firstName}",
              description={settings.ui_text.feed_hero_description})
2. FilterChipsRow (espécie: Todos/Cães/Gatos/Coelhos | porte: Todos os portes/Mini/...)
3. FilterChipsRow (idade: Todos/Filhote/Adulto/Idoso | sexo: Todos/Macho/Fêmea)
4. FilterRow (cidade: InputCityAutocomplete | raio: chips [Sem limite, 10, 25, 50, 100])
5. Toggle "Mostrar meus pets" (só autenticados)
6. Texto explicativo do filtro de cidade (3 variações)
7. SwipeDeck (cartas tinder — destaque)
   ├─ Stack de 3 SwipeCards
   ├─ Botão X (passar)
   ├─ Botão ♥ (curtir)
   ├─ Botão ↶ (UNDO, novo)
   └─ Empty state quando zerou
8. Collapsible "Ver todos os pets disponíveis" (🆕 fechado por padrão)
   ├─ Fechado: card com chevron + "Clique aqui"
   └─ Aberto (FadeIn):
      ├─ SortDropdown (Mais recentes / Mais próximos / Prioridade)
      ├─ PetCardGrid (4 colunas desktop, configurável)
      └─ PaginationControls (1ª / ← / → / última + "Página X de Y")
9. AdSlot (a cada 8 cards visíveis)
```

**Estados visuais por seção**:
- SwipeDeck loading: `<Skeleton variant="swipe-card" />`
- SwipeDeck empty: `<EmptyState icon="pets" />`
- Grid loading: `<Skeleton variant="pet-card" count={8} />`
- Grid empty: `<EmptyState icon="search" buttons={['Limpar filtros', 'Ampliar raio']} />`
- Erro em qualquer um: `<ErrorState onRetry={refetch} />`

---

## 2. Funcionalidades (exaustivo)

| # | Funcionalidade | Onde está no código | Hook / Service | Status |
|---|---|---|---|---|
| F1 | Drag horizontal de cartas | `<SwipeCard>` onPointerDown/Move/Up | `useSwipeGesture` | 🆕 V3 |
| F2 | Botão curtir (♥) | `<SwipeDeck>` button | `useCreateInterest` | ✅ V1 |
| F3 | Botão passar (X) | `<SwipeDeck>` button | `useCreatePass` | 🆕 V3 (hook novo) |
| F4 | Botão UNDO | `<SwipeDeck>` button | `useUndoSwipe` | 🆕 V3 |
| F5 | Haptic feedback (mobile) | `navigator.vibrate(10)` em swipe | — | 🆕 V3 |
| F6 | Filtro espécie (chips) | `<FilterChipsRow field="species">` | `useUrlFilters` | ✅ V1 → V3 |
| F7 | Filtro porte (chips) | `<FilterChipsRow field="size">` | `useUrlFilters` | ✅ V1 → V3 |
| F8 | Filtro idade (chips) | `<FilterChipsRow field="age">` | `useUrlFilters` | 🆕 V3 |
| F9 | Filtro sexo (chips) | `<FilterChipsRow field="sex">` | `useUrlFilters` | 🆕 V3 |
| F10 | Filtro cidade (autocomplete) | `<InputCityAutocomplete>` | `useUrlFilters` + `lookupCityCoordsByName` | 🆕 V3 |
| F11 | Filtro raio (chips) | `<FilterChipsRow field="radius">` | `useUrlFilters` | ✅ V1 → V3 |
| F12 | Ordenação (dropdown) | `<Select>` | `useUrlFilters` | 🆕 V3 |
| F13 | Sincronizar filtros com URL | `useUrlFilters` | hook | 🆕 V3 |
| F14 | Paginação | `<PaginationControls>` | `useUrlFilters` | 🆕 V3 |
| F15 | Mostrar/ocultar meus pets | `<Switch>` | `useFeedPreferences` | ✅ V1 |
| F16 | Cards por página (config) | `useUiPreferences().feedCardsPerPage` | hook | 🆕 V3 |
| F17 | Colunas do grid (config) | `useUiPreferences().feedGridColumns` | hook | 🆕 V3 |
| F18 | TopBar mode (config) | `useUiPreferences().topBarMode` | hook | 🆕 V3 |
| F19 | Dark mode | `useColorMode` | hook | ✅ V2 |
| F20 | Reduced motion | `useReducedMotionSafe` | hook | ✅ V2 |
| F21 | Autenticação (login) | `useAuth` | hook | ✅ V1 |
| F22 | Perfil do adotante (porte/idade preferido) | `useUserAdopterProfile` | hook | 🆕 V3 |
| F23 | Profile incomplete CTA | se `!isProfileComplete` | `useAuth` | 🆕 V3 |
| F24 | App banner se não tem PWA | `<InstallAppButton>` | — | 🆕 V3 |
| F25 | Empty state com 2 ações | `<EmptyState buttons={['Limpar', 'Ampliar']} />` | — | 🆕 V3 |
| F26 | Animações FadeIn / HoverLift | `<FadeIn>`, `<HoverLift>` | `framer-motion` | ✅ V2 → V3 |
| F27 | Skeleton durante fetch | `<Skeleton variant="pet-card" />` | — | 🆕 V3 |
| F28 | AdSlot em lista longa | `<AdSlot every={8} />` | TASK-024 | ✅ V2 |
| F29 | Curated highlight (ordem por priority_score) | `priorityPets = sort by score` | useMemo | ✅ V1 |
| F30 | Filtro por cidade cadastrada (default) | `useUserCityFromProfile` | `useAuth` | 🆕 V3 |

---

## 3. Componentes utilizados

| Componente | Arquivo | Onde | DS |
|---|---|---|---|
| `<PageHero>` | `src/components/PageHero.jsx` | Topo | ✅ |
| `<FilterChipsRow>` | `src/components/FilterChipsRow.jsx` 🆕 | Filtros chips | 🆕 V3 |
| `<InputCityAutocomplete>` | `src/components/InputCityAutocomplete.jsx` 🆕 | Filtro cidade | 🆕 V3 |
| `<SwipeCard>` | `src/modules/pets/components/SwipeCard.jsx` 🆕 | Carta tinder | 🆕 V3 |
| `<SwipeDeck>` | `src/modules/pets/components/SwipeDeck.jsx` 🆕 | Container swipe | 🆕 V3 |
| `<PetCard>` | `src/modules/pets/components/PetCard.jsx` | Grid | ✅ |
| `<Select>` | `src/components/ui/select.jsx` | Ordenação | ✅ |
| `<Switch>` | `src/components/ui/switch.jsx` | Toggle | ✅ |
| `<Button>` | `src/components/ui/button.jsx` | Ações | ✅ |
| `<Skeleton>` | `src/components/Skeleton.jsx` 🆕 | Loading | 🆕 V3 |
| `<EmptyState>` | `src/components/EmptyState.jsx` 🆕 | Vazio | 🆕 V3 |
| `<ErrorState>` | `src/components/ErrorState.jsx` (refator) | Erro | 🆕 V3 |
| `<PaginationControls>` | `src/components/PaginationControls.jsx` 🆕 | Paginação | 🆕 V3 |
| `<AdSlot>` | `src/components/AdSlot.jsx` | Anúncios | ✅ |
| `<FadeIn>` | `src/components/ui/motion.jsx` | Animação entrada | ✅ |
| `<HoverLift>` | `src/components/ui/motion.jsx` | Hover cards | ✅ |
| `<CollapsibleCard>` | `src/components/CollapsibleCard.jsx` 🆕 | Seção expansível | 🆕 V3 |
| `<Icon>` | `src/components/ui/icon.jsx` | Material Symbols | ✅ |
| `<Badge>` | `src/components/ui/badge.jsx` | Tags temperament | ✅ |
| `<Input>` | `src/components/ui/input.jsx` | Cidade | ✅ |

---

## 4. Hooks e Services

| Hook/Service | Arquivo | Função |
|---|---|---|
| `usePetFeed(filters)` | `src/modules/pets/hooks/usePets.js` | Query Firestore de pets |
| `useCreateInterest` | `src/modules/pets/hooks/usePets.js` | Mutation curtir |
| `useCreatePass` | `src/modules/pets/hooks/usePets.js` 🆕 | Mutation passar (V3) |
| `useFeedPreferences` | `src/core/hooks/useFeedPreferences.js` | Persistência "mostrar meus pets" |
| `useUiPreferences` | `src/core/hooks/useUiPreferences.js` | Prefs visuais (TASK-401) |
| `useColorMode` | `src/core/hooks/useColorMode.js` | Light/dark/system |
| `useReducedMotionSafe` | `src/core/hooks/useReducedMotionSafe.js` | Honra prefers-reduced-motion |
| `useUrlFilters` | `src/core/hooks/useUrlFilters.js` 🆕 | Sincroniza filtros com URL |
| `useSwipeGesture` | `src/core/hooks/useSwipeGesture.js` 🆕 | Lógica drag/swipe |
| `useUserCityFromProfile` | `src/core/hooks/useUserCityFromProfile.js` 🆕 | Cidade default do user |
| `useUserAdopterProfile` | `src/core/hooks/useUserAdopterProfile.js` 🆕 | Perfil completo do adotante |
| `useAuth` | `src/core/lib/FirebaseAuthContext.jsx` | User logado |
| `usePlatformSettings` | `src/core/lib/FeatureFlagsContext.jsx` | Settings globais |
| `useFeatureFlag` | `src/core/lib/FeatureFlagsContext.jsx` | Check flag |
| `petsService` | `src/modules/pets/services/petsService.js` | CRUD pets |
| `feedFilters` | `src/modules/pets/domain/feedFilters.js` | Lógica filtros client-side |
| `geoDistance` | `src/modules/pets/domain/geoDistance.js` | Cálculo raio |
| `priority` | `src/modules/pets/domain/priority.js` | Score/label |
| `ads/providers` | `src/core/ads/providers.js` | Provider AdSlot |

---

## 5. Textos visíveis (todos)

| Texto | Origem | Onde | i18n? |
|---|---|---|---|
| "Pets para adoção" | `Seo` title | `<head>` | ✅ pt-BR |
| "Encontre seu novo melhor amigo, {firstName}" | `settings.ui_text.feed_hero_title` | `<PageHero>` | ✅ |
| "Feed de pets disponíveis para adoção responsável perto de você." | `settings.ui_text.feed_hero_description` | `<PageHero>` | ✅ |
| "Descobrir" | hard-coded | `<SwipeDeck>` h2 | 🆕 mover para settings |
| "Você viu todos os destaques!" | hard-coded | empty SwipeDeck | 🆕 |
| "Veja a lista completa logo abaixo." | hard-coded | empty SwipeDeck | 🆕 |
| "CURTIR" | hard-coded | overlay swipe | 🆕 |
| "AGORA NÃO" | hard-coded | overlay swipe | 🆕 |
| "Desfazer último" (aria-label UNDO) | hard-coded | button | 🆕 |
| "Ver perfil" (aria-label info) | hard-coded | button | 🆕 |
| "Curtir este pet" (aria-label) | hard-coded | button | ✅ |
| "Passar este pet" (aria-label) | hard-coded | button | ✅ |
| "Você deseja ver todos os pets disponíveis? Clique aqui" | 🆕 V3 | CollapsibleCard fechado | 🆕 |
| "Todos os pets disponíveis" | hard-coded | grid title | 🆕 |
| "Nenhum pet encontrado com esses filtros." | hard-coded | empty grid | 🆕 |
| "Tente ampliar o raio, mudar a cidade ou limpar os filtros para ver todos os pets da plataforma." | hard-coded | empty grid | 🆕 |
| "Limpar filtros" | hard-coded | empty button | 🆕 |
| "Ampliar raio" | hard-coded | empty button | 🆕 |
| "Mostrar meus pets no feed" | hard-coded | toggle label | ✅ |
| "Use o controle para incluir ou ocultar pets cadastrados por você." | hard-coded | toggle description | ✅ |
| "Sem cidade definida — mostrando todos os pets disponíveis na plataforma" | hard-coded | helper text | ✅ |
| "Pets até {radius} km de {city}..." | interpolation | helper text | ✅ |
| "Não conhecemos a localização de {city}..." | hard-coded | helper text | ✅ |
| "Ordenar por" | hard-coded | sort label | 🆕 |
| "Mais recentes" | hard-coded | sort option | 🆕 |
| "Mais próximos" | hard-coded | sort option | 🆕 |
| "Prioridade" | hard-coded | sort option | 🆕 |
| "Página {n} de {total}" | interpolation | pagination | 🆕 |
| "Primeira" (aria) | hard-coded | button | 🆕 |
| "Anterior" (aria) | hard-coded | button | 🆕 |
| "Próxima" (aria) | hard-coded | button | 🆕 |
| "Última" (aria) | hard-coded | button | 🆕 |
| "Filtrar por cidade" | hard-coded | input placeholder | ✅ |
| "Erro ao carregar pets. Tente novamente." | hard-coded | error state | ✅ |
| "Carregando pets..." | hard-coded | skeleton | 🆕 |

---

## 6. Estados da página

| Estado | Trigger | UI | Implementação |
|---|---|---|---|
| **Loading (SwipeDeck)** | `usePetFeed().isLoading` | `<Skeleton variant="swipe-card" />` | `<Skeleton>` 🆕 |
| **Loading (Grid)** | `usePetFeed().isLoading` | `<Skeleton variant="pet-card" count={8} />` | `<Skeleton>` 🆕 |
| **Empty (SwipeDeck)** | `pets.length === 0` (todos passados) | `<EmptyState icon="pets" title="Você viu todos os destaques!" description="Veja a lista completa logo abaixo." />` | `<EmptyState>` 🆕 |
| **Empty (Grid)** | filtros sem resultado | `<EmptyState icon="search" title="Nenhum pet encontrado com esses filtros." buttons={[{label:'Limpar filtros', onClick:clear}, {label:'Ampliar raio', onClick:expandRadius}]} />` | `<EmptyState>` 🆕 |
| **Error** | `usePetFeed().isError` | `<ErrorState onRetry={refetch} title="Erro ao carregar pets" />` | `<ErrorState>` 🆕 |
| **Success** | dados carregados | render principal | — |
| **Auth required action** | `createInterest` sem user | `navigate('/login')` | — |
| **Reduced motion** | `prefers-reduced-motion` ou `prefs.reduceMotion` | desabilita transições | `useReducedMotionSafe` |
| **Dark mode** | `useColorMode().mode === 'dark'` | tokens `.dark` | — |
| **Top bar collapsed** | `prefs.topBarMode === 'hidden'` | `<header>` `hidden` | 🆕 |
| **Top bar autohide** | `prefs.topBarMode === 'autohide'` | `<header>` aparece com scroll up | 🆕 |
| **Bottom bar collapsed** | `prefs.bottomTabBarMode === 'hidden'` | `<nav>` hidden | ✅ |
| **Compact mode** | `prefs.compactMode === true` | cards com `p-3` em vez de `p-4` | 🆕 |
| **Collapsible closed** | default | card com chevron right | `<CollapsibleCard>` 🆕 |
| **Collapsible open** | click | grid + sort + pagination | `<CollapsibleCard>` 🆕 |
| **Haptic supported** | `navigator.vibrate` disponível | vibra em swipe | `navigator.vibrate(10)` |
| **Drag mid** | `dx > 0` | overlay verde "CURTIR" | `transform: translateX(${dx}px) rotate(${dx/12}deg)` |

---

## 7. Acessibilidade

| Item | Status | Notas |
|---|---|---|
| `<button>` com `aria-label` | ✅ | curtir, passar, info, undo |
| `aria-live="polite"` em mudanças | 🆕 | `role="status"` no toast após swipe |
| `aria-live="assertive"` em erros | 🆕 | `role="alert"` no ErrorState |
| `role="status"` em loading | ✅ | `<Skeleton>` |
| `<nav aria-label="Filtros">` em chips | ✅ | FilterChipsRow |
| `<main>` semântico | ✅ | Layout |
| `prefers-reduced-motion` | ✅ | `useReducedMotionSafe` |
| Contraste WCAG AA | ✅ | tokens do DS |
| Foco visível | ✅ | `outline` global |
| Drag por teclado | 🆕 | setas (←→) + espaço/enter |
| Alt text em fotos | ✅ | `pet.title` |
| Tab order lógico | ✅ | top-down |
| `lang="pt-BR"` | ✅ | `<html>` |
| Filtros com `aria-pressed` | 🆕 | chips de toggle |
| Pagination com `aria-current="page"` | 🆕 | página atual |
| `aria-expanded` no CollapsibleCard | 🆕 | fechado/aberto |

---

## 8. Performance

| Item | Status | Notas |
|---|---|---|
| React.memo em PetCard | 🆕 | `React.memo` |
| React.memo em SwipeCard | 🆕 | `React.memo` |
| `useCallback` em handlers | ✅ | já existia |
| `useMemo` em pets filtrados | 🆕 | `pets.filter(...).sort(...)` |
| `useDeferredValue` em input cidade | 🆕 | autocomplete |
| Virtual scroll (lista > 50) | 🆕 | `react-window` ou similar |
| Imagens `loading="lazy"` | ✅ | `<img>` |
| Bundle size | < 50kb | Vite code splitting |
| LCP < 2.5s | 🆕 | prioridade: foto do SwipeCard |
| CLS < 0.1 | 🆕 | skeleton mantém espaço |
| FID < 100ms | 🆕 | handlers leves |

---

## 9. Testes

### 9.1. Unit (Vitest)
- [ ] `PetFeedV3.test.jsx` — render, loading, empty, error
- [ ] `SwipeCard.test.jsx` — drag thresholds, like, pass, undo
- [ ] `SwipeDeck.test.jsx` — UNDO funciona, vazio
- [ ] `FilterChipsRow.test.jsx` — selection, multi-select, URL sync
- [ ] `InputCityAutocomplete.test.jsx` — autocomplete, default = user.city
- [ ] `PaginationControls.test.jsx` — primeira/última/próxima/anterior
- [ ] `CollapsibleCard.test.jsx` — abre/fecha, FadeIn
- [ ] `useUrlFilters.test.js` — sync bidirecional, sanitização
- [ ] `useSwipeGesture.test.js` — thresholds, callbacks
- [ ] `useUiPreferences.test.js` (atualizar) — topBarMode, feedCardsPerPage

### 9.2. E2E (Playwright)
- [ ] `/feed` desktop 1280x800
- [ ] `/feed` mobile 360x640
- [ ] `/feed` tablet 768x1024
- [ ] Drag → like → toast
- [ ] Drag → pass → próximo
- [ ] UNDO → volta último
- [ ] Filtro espécie → grid filtra
- [ ] Filtro cidade + raio → grid filtra
- [ ] Toggle "meus pets" → some
- [ ] Collapsible: fechado → aberto → fechado
- [ ] Pagination: 1ª → próxima → última
- [ ] Dark mode toggle → tokens propagam
- [ ] topBarMode=hidden → header some
- [ ] compactMode=true → cards menores
- [ ] Acessibilidade: teclado, screen reader

### 9.3. Visual regression
- [ ] Screenshot 4 viewports
- [ ] Screenshot empty state
- [ ] Screenshot error state
- [ ] Screenshot dark mode
- [ ] Screenshot CollapsibleCard open

---

## 10. Histórico de mudanças

| Data | Versão | Mudança | Autor |
|---|---|---|---|
| 2026-07-17 13:55 | V3.0 (DRAFT) | Refactor completo planejado | Mavis |

---

## 11. Links relacionados

- `docs/PLAN_V3_REDESIGN.md` — plano V3 macro
- `docs/PAGE_REGENCY_TEMPLATE.md` — template
- `docs/design-system-v2/DESIGN_SYSTEM.md` — spec DS V2
- `docs/CORE_DIRECTIVES.md` — regras permanentes
- `src/modules/pets/pages/PetFeedV3.jsx` — código (será criado)
- `src/modules/pets/pages/PetFeed.jsx` — wrapper (será atualizado)
- `src/modules/pets/pages/PetFeed.v1.jsx` — fallback (mantido)
- `src/modules/pets/pages/PetFeedEnhanced.jsx` — deprecado
- `src/modules/pets/components/SwipeCard.jsx` 🆕
- `src/modules/pets/components/SwipeDeck.jsx` 🆕
- `src/components/EmptyState.jsx` 🆕
- `src/components/Skeleton.jsx` 🆕
- `src/components/CollapsibleCard.jsx` 🆕
- `src/components/PaginationControls.jsx` 🆕
- `src/components/FilterChipsRow.jsx` 🆕
- `src/components/InputCityAutocomplete.jsx` 🆕
- `src/core/hooks/useUrlFilters.js` 🆕
- `src/core/hooks/useSwipeGesture.js` 🆕
- `src/core/hooks/useUiPreferences.js` — adicionar topBarMode, feedCardsPerPage, feedGridColumns

---

**Última atualização**: 2026-07-17 13:55 UTC
**Mantido por**: Mavis
**Status**: DRAFT (aguardando início da implementação)
