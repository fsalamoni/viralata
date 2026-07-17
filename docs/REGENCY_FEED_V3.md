# Documento de Regência — Feed V3

> **Status**: ✅ V3 IMPLEMENTADO E EM PRODUÇÃO (TASK-V3-FEED-1 + TASK-920..924)
> **Diretriz ETERNA**: ver `docs/PAGE_REGENCY_TEMPLATE.md`
> **Primeira página V3** entregue com redesign real (não fachada)
> **Atualizado em**: 2026-07-17 19:50 UTC

---

## 0. Identidade

| Campo | Valor |
|---|---|
| **Rota** | `/feed` (também `/inicio` redireciona) |
| **Componente** | `src/modules/pets/pages/PetFeedV3.jsx` (lógica + render) |
| **Wrapper** | `src/modules/pets/pages/PetFeed.jsx` (escolhe versão via flag, lazy load) |
| **Fallback V1** | `src/modules/pets/pages/PetFeed.v1.jsx` (mantido) |
| **Fallback Enhanced** | `src/modules/pets/pages/PetFeedEnhanced.jsx` (mantido) |
| **Flag V3** | `V3_PAGE_FEED` (default OFF) |
| **Flag Enhanced** | `PET_FEED_RELIABILITY_FIX` (default OFF) |
| **Auth** | Anon-ok (público, com auth opcional p/ curtir + toggle "meus pets") |
| **Plataforma** | Mobile-first, responsivo (360/768/1280+) |
| **Doc atualizada em** | 2026-07-17 19:50 UTC |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_FEED) === true     → <PetFeedV3 />       (lazy)
2. useFeatureFlag(PET_FEED_RELIABILITY_FIX)   → <PetFeedEnhanced /> (lazy)
3. Senão                                       → <PetFeedOriginal /> (V1)
```

> **Lição D-VITE-LAZY-01**: o wrapper DEVE usar `React.lazy()` com dynamic import.
> Vite faz constant folding em if/else com feature flag estática e ELIMINA as branches
> alternativas, gerando bundle que ignora V3 mesmo com flag ON.

---

## 1. Estrutura visual (de cima para baixo)

```
1. PageHero (eyebrow="Feed", title="Encontre seu novo melhor amigo, {firstName}",
              description={settings.ui_text.feed_hero_description})

2. FilterChipsRow — ESPÉCIE (Todos / Cães / Gatos / Coelhos)

3. FilterChipsRow — PORTE (Todos os portes / Mini / Pequeno / Médio / Grande / Gigante)

4. FilterChipsRow — IDADE (Todas / Filhote / Adulto / Idoso)

5. FilterChipsRow — SEXO (Todos / Macho / Fêmea)

6. Linha de cidade + raio
   ├─ InputCityAutocomplete (200+ cidades conhecidas, com user.city como default)
   └─ FilterChipsRow RAIO (Sem limite / 10 / 25 / 50 / 100 km)

7. Toggle "Mostrar meus pets" (Switch on/off, só autenticado)
   Texto: "Mostrar meus pets no feed — use o controle para incluir
           ou ocultar pets cadastrados por você."
   Estado visual: "Exibindo" / "Ocultando" + Switch

8. Helper text do filtro de cidade (3 variações)
   - Sem cidade: "Sem cidade definida — mostrando todos os pets..."
   - Raio ativo: "Pets até {radius} km de {city} (distância aproximada)..."
   - Cidade fora da tabela: "Não conhecemos a localização de {city}..."

9. SwipeDeck (cartas tinder — destaque)
   ├─ Stack de SwipeCards (com AnimatePresence + transform)
   ├─ Botão X (passar) — esquerda
   ├─ Botão ♥ (curtir) — direita
   ├─ Botão ↶ (UNDO) — centro, aparece após primeiro swipe
   └─ Empty state quando zerou o deck

10. AdSlot "Espaço para parceiros"  ← MOVIDO PRA FORA do Collapsible (TASK-922)
    Margem my-8 sm:my-10 (balanceada)
    slotId="feed-between-sections", fallbackTitle="Espaço para parceiros"

11. Collapsible "Todos os pets disponíveis" (FECHADO por padrão — TASK-V3-FEED-1)
    ├─ Fechado: chevron + badge de count + "Você deseja ver todos? Clique aqui"
    └─ Aberto (FadeIn):
       ├─ Sort dropdown (<select> HTML nativo, não Radix)
       │   - "Mais recentes" / "Mais próximos" / "Prioridade"
       ├─ PetCardGrid (4 colunas desktop, configurável)
       └─ PaginationControls (1ª / ← / → / última + "Página X de Y")
```

**Estados visuais por seção**:
- **Grid loading**: `<Skeleton.Grid count={perPage} variant="pet-card" />`
- **Grid empty**: `<EmptyState icon={Search} title="Nenhum pet encontrado com esses filtros." description="Tente ampliar o raio..." buttons={[{label:'Limpar filtros', onClick:clear}, {label:'Ampliar raio', onClick:expandRadius}]} />`
- **Grid error**: `<ErrorState title="Erro ao carregar pets" onRetry={refetch} />`

---

## 2. Funcionalidades (exaustivo)

| # | Funcionalidade | Onde está no código | Hook / Service | Status |
|---|---|---|---|---|
| F1 | Drag horizontal de cartas | `SwipeCard.jsx` (onPointerDown/Move/Up) | `useSwipeGesture` | 🆕 V3 |
| F2 | Botão curtir (♥) | `SwipeDeck.jsx` `<button>` | `useCreateInterest` | ✅ V1 |
| F3 | Botão passar (X) | `SwipeDeck.jsx` `<button>` | (no-op) | 🆕 V3 |
| F4 | Botão UNDO | `SwipeDeck.jsx` `<button>` ghost | (no-op) | 🆕 V3 |
| F5 | Haptic feedback (mobile) | `navigator.vibrate(10)` em swipe | — | 🆕 V3 |
| F6 | Filtro espécie (chips) | `<FilterChipsRow field="species">` | `useUrlFilters` | 🆕 V3 |
| F7 | Filtro porte (chips) | `<FilterChipsRow field="size">` | `useUrlFilters` | 🆕 V3 |
| F8 | Filtro idade (chips) | `<FilterChipsRow field="age">` | `useUrlFilters` | 🆕 V3 |
| F9 | Filtro sexo (chips) | `<FilterChipsRow field="sex">` | `useUrlFilters` | 🆕 V3 |
| F10 | Filtro cidade (autocomplete) | `<InputCityAutocomplete>` | `useUrlFilters` + `lookupCityCoordsByName` | 🆕 V3 |
| F11 | Filtro raio (chips) | `<FilterChipsRow field="radius">` | `useUrlFilters` | 🆕 V3 (com fix D-CHIPS-TYPE-01) |
| F12 | Ordenação (dropdown) | `<select>` HTML nativo | `useUrlFilters` | 🆕 V3 |
| F13 | Sincronizar filtros com URL | `useUrlFilters` | hook | 🆕 V3 |
| F14 | Paginação | `<PaginationControls>` | `useUrlFilters` | 🆕 V3 |
| F15 | Mostrar/ocultar meus pets | `<Switch>` | `useFeedPreferences` | ✅ V1 (corrigido em TASK-922) |
| F16 | Cards por página (config) | `useUiPreferences().feedCardsPerPage` | hook | 🆕 V3 |
| F17 | Colunas do grid (config) | `useUiPreferences().feedGridColumns` | hook | 🆕 V3 |
| F18 | TopBar mode (config) | `useUiPreferences().topBarMode` | hook | 🆕 V3 |
| F19 | Bottom tab bar mode (config) | `useUiPreferences().bottomTabBarMode` | hook | 🆕 V3 |
| F20 | Footer mode (config) | `useUiPreferences().footerMode` | hook | 🆕 V3 |
| F21 | Dark mode | `useColorMode` | hook | ✅ V2 |
| F22 | Reduced motion | `useReducedMotionSafe` | hook | ✅ V2 |
| F23 | Autenticação (login) | `useAuth` | hook | ✅ V1 |
| F24 | Cidade do user como default | `useUserProfile.city` (useEffect 1ª mount) | useAuth | 🆕 V3 |
| F25 | Filtro cidade cliente-side inteligente | `normalizePlaceText` (NFD + lowercase) | inline-ado no useMemo | 🆕 V3 |
| F26 | Empty state com 2 ações (Limpar / Ampliar) | `<EmptyState buttons={...}>` | — | 🆕 V3 |
| F27 | Animações FadeIn / HoverLift | `<FadeIn>`, `<HoverLift>` | framer-motion | ✅ V2 |
| F28 | Skeleton durante fetch | `<Skeleton variant="pet-card" />` | — | 🆕 V3 |
| F29 | AdSlot "Espaço para parceiros" (entre SwipeDeck e Collapsible) | `<AdSlot slotId="feed-between-sections">` | TASK-024 + TASK-922 | 🆕 V3 |
| F30 | Curated highlight (priority_score) | `priorityPets = sort by score` | useMemo | ✅ V1 |
| F31 | Reset page quando filtro muda | `useEffect [species,size,age,sex,city,radius,sort]` | useEffect | 🆕 V3 |
| F32 | Paginação por viewport (responsivo) | `getCardsPerPageForViewport(uiPrefs, viewport)` | hook helper | 🆕 V3 |

---

## 3. Componentes utilizados

| Componente | Arquivo | Onde | DS / V3 |
|---|---|---|---|
| `<PageHero>` | `src/components/PageHero.jsx` | Topo | ✅ DS |
| `<FilterChipsRow>` | `src/components/ui/filter-chips-row.jsx` | Filtros chips | 🆕 V3 (com fix String() TASK-924) |
| `<InputCityAutocomplete>` | `src/components/ui/input-city-autocomplete.jsx` | Filtro cidade | 🆕 V3 |
| `<SwipeCard>` | `src/modules/pets/components/SwipeCard.jsx` | Carta tinder | 🆕 V3 |
| `<SwipeDeck>` | `src/modules/pets/components/SwipeDeck.jsx` | Container swipe | 🆕 V3 |
| `<PetCard>` | `src/modules/pets/components/PetCard.jsx` | Grid | ✅ DS_V2 |
| `<Switch>` | `src/components/ui/switch.jsx` | Toggle "meus pets" | ✅ DS |
| `<Button>` | `src/components/ui/button.jsx` | Ações | ✅ DS |
| `<Skeleton>` / `<Skeleton.Grid>` | `src/components/ui/skeleton.jsx` | Loading (7 variants) | 🆕 V3 |
| `<EmptyState>` | `src/components/ui/empty-state.jsx` | Vazio (2 botões) | 🆕 V3 |
| `<ErrorState>` | `src/components/ErrorState.jsx` (refatorado) | Erro | 🆕 V3 |
| `<PaginationControls>` | `src/components/ui/pagination-controls.jsx` | Paginação | 🆕 V3 |
| `<AdSlot>` | `src/components/AdSlot.jsx` | Espaço de Parceiros | ✅ TASK-024 |
| `<CollapsibleCard>` | `src/components/ui/collapsible-card.jsx` | Seção expansível | 🆕 V3 |
| `<Seo>` | `src/components/Seo.jsx` | `<head>` title/description | ✅ |
| `useArenaPageClasses` | `src/core/lib/useArenaPageClasses.js` | Padding/layout container | ✅ |

### Componentes lazy (carregados sob demanda)

```js
// src/modules/pets/pages/PetFeed.jsx
const PetFeedV3 = lazy(() => import(/* webpackChunkName: "PetFeedV3" */ './PetFeedV3'));
const PetFeedEnhanced = lazy(() => import(/* webpackChunkName: "PetFeedEnhanced" */ './PetFeedEnhanced'));
```

Resultado do build: 3 chunks separados (V1+wrapper / Enhanced / V3), Vite não pode
fazer constant folding e eliminar a branch.

---

## 4. Hooks e Services

| Hook/Service | Arquivo | Função |
|---|---|---|
| `usePetFeed(filters)` | `src/modules/pets/hooks/usePets.js` | Query Firestore de pets com filtros |
| `useCreateInterest` | `src/modules/pets/hooks/usePets.js` | Mutation curtir |
| `useFeedPreferences` | `src/core/hooks/useFeedPreferences.js` | Persistência "meus pets" + filtros |
| `useUiPreferences` | `src/core/hooks/useUiPreferences.js` | Prefs visuais (TASK-401 + V3) |
| `useColorMode` | `src/core/hooks/useColorMode.js` | Light/dark/system |
| `useReducedMotionSafe` | `src/core/hooks/useReducedMotionSafe.js` | Honra prefers-reduced-motion |
| `useUrlFilters` | `src/core/hooks/useUrlFilters.js` | Sincroniza filtros com URL |
| `useSwipeGesture` | `src/core/hooks/useSwipeGesture.js` | Lógica drag/swipe |
| `useViewport` | `src/core/hooks/useViewport.js` | Detecta mobile/tablet/desktop |
| `useAuth` | `src/core/lib/FirebaseAuthContext.jsx` | User logado |
| `usePlatformSettings` | `src/core/lib/FeatureFlagsContext.jsx` | Settings globais (hero text, etc) |
| `useFeatureFlag` | `src/core/lib/FeatureFlagsContext.jsx` | Check flag |
| `useArenaPageClasses` | `src/core/lib/useArenaPageClasses.js` | Padding de arena |
| `getCitySuggestions(userCity)` | `src/modules/pets/domain/geoDistance.js` | Lista de cidades p/ autocomplete |
| `lookupCityCoordsByName(text)` | `src/modules/pets/domain/geoDistance.js` | Coords de cidade conhecida |
| `filterPetsByRadius(pets, origin, km)` | `src/modules/pets/domain/geoDistance.js` | Filtro geográfico |
| `normalizePlaceText(value)` | `src/modules/pets/domain/geoDistance.js` | NFD + lowercase + remove acentos |
| `getCardsPerPageForViewport(prefs, vp)` | `src/core/hooks/useUiPreferences.js` | Cards por página por viewport |
| `getGridColumnsForViewport(prefs, vp)` | `src/core/hooks/useUiPreferences.js` | Colunas do grid por viewport |
| `getAvailablePets(filters)` | `src/modules/pets/services/petService.js` | Query Firestore |
| `calculatePriorityScore(pet)` | `src/modules/pets/domain/priority.js` | Score de priorização |
| `AdSlot` | `src/components/AdSlot.jsx` | Provider de ads (placeholder) |

### Função chave: filtro de cidade cliente-side

```js
// PetFeedV3.jsx
if (trimmedCity && !radiusActive) {
  const needle = normalizePlaceText(trimmedCity);
  visiblePets = visiblePets.filter((pet) => {
    const hay = normalizePlaceText(pet.city || '');
    return hay.includes(needle);
  });
}
```

**Por que não passar `city` para o Firestore?** O Firestore faz match EXATO
(`where('city', '==', city)`), não suporta case/acento-insensitive nativamente.
Solução: pegar mais pets do Firestore e filtrar cliente-side com `normalizePlaceText`
(NFD + lowercase + remove acentos).

---

## 5. Textos visíveis (todos)

| Texto | Origem | Onde | i18n? |
|---|---|---|---|
| "Pets para adoção" | `Seo` title | `<head>` | ✅ pt-BR |
| "Feed" | hard-coded | `<PageHero>` eyebrow | ✅ |
| "Encontre seu novo melhor amigo, {firstName}" | `settings.ui_text.feed_hero_title` | `<PageHero>` | ✅ |
| "Feed de pets disponíveis para adoção responsável perto de você." | `settings.ui_text.feed_hero_description` | `<PageHero>` | ✅ |
| "Desfazer último" (aria-label UNDO) | hard-coded | `<button>` UNDO | 🆕 mover para settings |
| "Ver perfil" (aria-label info) | hard-coded | `<button>` info | 🆕 |
| "Curtir este pet" (aria-label) | hard-coded | `<button>` ♥ | ✅ |
| "Passar este pet" (aria-label) | hard-coded | `<button>` X | ✅ |
| "Espaço para parceiros" (fallback) | prop | `<AdSlot>` | 🆕 |
| "Conteúdo patrocinado" (label discreto) | hard-coded no AdSlot | banner | ✅ |
| "Todos os pets disponíveis" | hard-coded | `<CollapsibleCard>` title | ✅ |
| "Você deseja ver todos os pets disponíveis? Clique aqui" | hard-coded | `<CollapsibleCard>` description (fechado) | 🆕 |
| "Mostrando {shown} de {total}" | interpolation | grid header | 🆕 |
| "Ordenar por" | hard-coded | `<label>` sort | 🆕 |
| "Mais recentes" / "Mais próximos" / "Prioridade" | hard-coded | `<option>` | 🆕 |
| "Filtrar por espécie" / porte / idade / sexo / raio | hard-coded | `<nav aria-label>` | 🆕 |
| "Filtrar por cidade" | hard-coded | input placeholder + aria-label | ✅ |
| "Nenhum pet encontrado com esses filtros." | hard-coded | empty state | 🆕 |
| "Tente ampliar o raio, mudar a cidade ou limpar os filtros para ver todos os pets da plataforma." | hard-coded | empty state | 🆕 |
| "Limpar filtros" | hard-coded | empty button | 🆕 |
| "Ampliar raio" | hard-coded | empty button | 🆕 |
| "Mostrar meus pets no feed" | hard-coded | toggle label | ✅ |
| "Use o controle para incluir ou ocultar pets cadastrados por você." | hard-coded | toggle description | ✅ |
| "Exibindo" / "Ocultando" | hard-coded | toggle state | 🆕 |
| "Sem cidade definida — mostrando todos os pets disponíveis na plataforma" | hard-coded | helper text | ✅ |
| "Pets até {radius} km de {city} (distância aproximada). Use 'Sem limite' para ver pets de todo o Brasil." | interpolation | helper text (raio ativo) | ✅ |
| "Sem filtro de distância — mostrando pets de todo o Brasil." | hard-coded | helper text | ✅ |
| "Não conhecemos a localização de '{city}' para calcular distância — mostrando só pets cadastrados nessa cidade." | interpolation | helper text (cidade fora) | ✅ |
| "Erro ao carregar pets. Tente novamente." | hard-coded | error state | ✅ |
| "Página {n} de {total}" | interpolation | pagination | 🆕 |
| "Primeira" / "Anterior" / "Próxima" / "Última" (aria) | hard-coded | pagination buttons | 🆕 |

---

## 6. Estados da página

| Estado | Trigger | UI | Implementação |
|---|---|---|---|
| **Loading (Grid)** | `usePetFeed().isLoading` | `<Skeleton.Grid count={perPage} variant="pet-card" />` | `<Skeleton>` 🆕 |
| **Empty (Grid)** | `pagedPets.length === 0 && !isLoading` | `<EmptyState icon={Search} buttons={[Limpar, Ampliar]} />` | `<EmptyState>` 🆕 |
| **Error** | `usePetFeed().isError` | `<ErrorState title="Erro ao carregar pets" onRetry={refetch} />` | `<ErrorState>` 🆕 |
| **Success** | dados carregados | render principal | — |
| **Auth required action** | `createInterest` sem user | `navigate('/login')` | — |
| **Reduced motion** | `prefers-reduced-motion` ou `prefs.reduceMotion` | desabilita transições | `useReducedMotionSafe` |
| **Dark mode** | `useColorMode().mode === 'dark'` | tokens `.dark` | — |
| **Top bar FIXED** | `prefs.topBarMode === 'fixed'` (default) | `<header>` sticky top-0 | ✅ |
| **Top bar AUTOHIDE** | `prefs.topBarMode === 'autohide'` | scroll-up aparece, scroll-down some | 🆕 |
| **Top bar HIDDEN** | `prefs.topBarMode === 'hidden'` | `<header>` hidden | 🆕 |
| **Bottom bar FIXED** | `prefs.bottomTabBarMode === 'fixed'` (default) | `<BottomTabBar />` fixed + padding-bottom | 🆕 TASK-923 |
| **Bottom bar AUTOHIDE** | `prefs.bottomTabBarMode === 'autohide'` | `<BottomTabBar />` translate-y-full/0 | 🆕 TASK-923 |
| **Bottom bar HIDDEN** | `prefs.bottomTabBarMode === 'hidden'` | `<BottomTabBar />` null | 🆕 TASK-923 |
| **Footer FIXED** | `prefs.footerMode === 'fixed'` (default) | `<LegalFooter />` no flow | ✅ |
| **Footer AUTOHIDE** | `prefs.footerMode === 'autohide'` | `<LegalFooter />` fixed + visibility com mouse | ✅ |
| **Footer HIDDEN** | `prefs.footerMode === 'hidden'` | `<LegalFooter />` null | ✅ |
| **Compact mode** | `prefs.compactMode === true` | cards com `p-3` em vez de `p-4` | 🆕 |
| **Collapsible closed** | default | card com chevron right + badge | `<CollapsibleCard>` 🆕 |
| **Collapsible open** | click | grid + sort + pagination (FadeIn) | `<CollapsibleCard>` 🆕 |
| **Haptic supported** | `navigator.vibrate` disponível | vibra 10ms em swipe | `navigator.vibrate(10)` |
| **Drag mid** | `dx > 0` | overlay verde "CURTIR" | `transform: translateX(${dx}px) rotate(${dx/12}deg)` |
| **Pagination edge** | `safePage > totalPages` | clamp a `totalPages` | `Math.min(Math.max(1, page), totalPages)` |

---

## 7. Acessibilidade

| Item | Status | Notas |
|---|---|---|
| `<button>` com `aria-label` | ✅ | curtir, passar, info, undo |
| `aria-live="polite"` em mudanças | 🆕 | toast após swipe |
| `aria-live="assertive"` em erros | 🆕 | `role="alert"` no ErrorState |
| `role="status"` em loading | ✅ | `<Skeleton>` |
| `<nav aria-label="Filtros">` em chips | ✅ | `FilterChipsRow` |
| `<main>` semântico | ✅ | Layout |
| `prefers-reduced-motion` | ✅ | `useReducedMotionSafe` |
| Contraste WCAG AA | ✅ | tokens do DS |
| Foco visível | ✅ | `outline` global |
| Drag por teclado | 🆕 | setas (←→) + espaço/enter |
| Alt text em fotos | ✅ | `pet.title` |
| Tab order lógico | ✅ | top-down |
| `lang="pt-BR"` | ✅ | `<html>` |
| Filtros com `aria-pressed` | ✅ | chips de toggle |
| Pagination com `aria-current="page"` | 🆕 | página atual |
| `aria-expanded` no CollapsibleCard | ✅ | fechado/aberto |
| `aria-controls` no CollapsibleCard | ✅ | bodyId |
| `data-testid` em todos elementos testáveis | ✅ | PetFeedV3 + components |

---

## 8. Performance

| Item | Status | Notas |
|---|---|---|
| React.memo em PetCard | ✅ | export default memo |
| React.memo em SwipeCard | ✅ | export default memo |
| `useCallback` em handlers | ✅ | já existia |
| `useMemo` em pets filtrados | ✅ | `pets.filter(...).sort(...)` |
| `useDeferredValue` em input cidade | 🆕 | autocomplete |
| Virtual scroll (lista > 50) | 🆕 | `react-window` ou similar |
| Imagens `loading="lazy"` | ✅ | `<img>` |
| Code splitting via React.lazy | ✅ | V3/Enhanced em chunks separados |
| Bundle size V3 | 26.6KB | Otimizado |
| Bundle size wrapper | ~17KB | Apenas V1 + Suspense |
| LCP < 2.5s | ✅ | prioridade: foto do SwipeCard |
| CLS < 0.1 | ✅ | skeleton mantém espaço |
| FID < 100ms | ✅ | handlers leves |

---

## 9. Testes

### 9.1. Unit (Vitest) — 161 testes passando
- [x] `PetFeedV3` rendering básico (smoke)
- [x] `useFeedPreferences` retorno shape
- [x] `useUrlFilters` sync bidirecional
- [x] `FilterChipsRow` seleção + multi-select (com fix String() — TASK-924)
- [x] `PaginationControls` navegação
- [x] `EmptyState` com 2 botões
- [x] `ErrorState` retry
- [x] `Skeleton` 7 variants
- [x] `useUiPreferences` defaults
- [x] `BottomTabBar` 3 modos (TASK-923)
- [x] `LegalFooter` flag ON/OFF (atualizado TASK-922)

### 9.2. E2E (Playwright) — planejado
- [ ] `/feed` desktop 1280x800
- [ ] `/feed` mobile 360x640
- [ ] `/feed` tablet 768x1024
- [ ] Drag → like → toast
- [ ] Drag → pass → próximo
- [ ] UNDO → volta último
- [ ] Filtro espécie → grid filtra
- [ ] Filtro cidade (case-insensitive) → grid filtra
- [ ] Filtro raio → grid filtra
- [ ] Toggle "meus pets" → some
- [ ] Collapsible: fechado → aberto → fechado
- [ ] Pagination: 1ª → próxima → última
- [ ] Dark mode toggle → tokens propagam
- [ ] topBarMode=hidden → header some
- [ ] compactMode=true → cards menores
- [ ] Acessibilidade: teclado, screen reader

### 9.3. Visual regression — planejado
- [ ] Screenshot 4 viewports
- [ ] Screenshot empty state
- [ ] Screenshot error state
- [ ] Screenshot dark mode
- [ ] Screenshot CollapsibleCard open

---

## 10. Histórico de mudanças

| Data | Versão | Mudança | TASK | Commits |
|---|---|---|---|---|
| 2026-07-17 13:55 | V3.0 DRAFT | Doc de regência criado | TASK-V3-FEED-1 | `4fb8084d` |
| 2026-07-17 17:50 | V3.0 RC | 14 novos arquivos (1642 ins) + 9 modificados (555 ins) | TASK-920 | `0cab8ea9`, `5489420b` |
| 2026-07-17 18:46 | V3.0.1 | V3_PAGE_FEED no AdminFlags + spacing SwipeDeck (mt-5→mt-10) | TASK-921 | `5786fc52`, `6899e91c`, `bb82f182`, `853fb546`, `608cf163` |
| 2026-07-17 19:10 | V3.0.2 | 5 bugs corrigidos (toggle, AdSlot, sort, cidades, rodapé) | TASK-922 | `a4c401ae`, `da61b0a8` |
| 2026-07-17 19:39 | V3.0.3 | BottomTabBar dedicado + padding dinâmico | TASK-923 | `f4ddded4`, `43969d1e` |
| 2026-07-17 19:44 | V3.0.4 | Chips de raio (10/25/50/100) com normalização String() | TASK-924 | `9a94ad6f`, `c28a816a` |

---

## 11. Lições aprendidas (permanentes)

### D-VITE-LAZY-01
**Sintoma**: Liga `V3_PAGE_FEED` no admin, user vê V1.
**Causa**: Vite faz constant folding em `if (useV3) return <V3 />` e elimina a branch.
**Fix**: `React.lazy()` com dynamic import → V3 vira chunk separado.
**Regra**: TODA feature flag com 2+ branches DEVE usar React.lazy.

### D-FEATURE-META-01
**Sintoma**: AdminFlags não mostra `V3_PAGE_FEED`.
**Causa**: AdminFlags renderiza via `Object.entries(FEATURE_FLAG_META)`. Flag estava no enum
mas NÃO no META.
**Fix**: Toda flag em `FEATURE_FLAG` enum DEVE ter entrada em `FEATURE_FLAG_META` com
label + description.

### D-V3-FEED-FIX-01
**5 bugs reais** (TASK-922):
1. `useFeedPreferences` retorna array `[prefs, setPrefs, status]`, desestruturar como objeto
2. AdSlot estava DENTRO do Collapsible — movido para FORA
3. `<Select>` Radix não suporta `<option>` children — usar `<select>` HTML nativo
4. Firestore match exato — filtro de cidade cliente-side com `normalizePlaceText`
5. LegalFooter com `if (!enabled) return null` — flag agora só controla QUAL links

### D-BOTTOM-TAB-01
**Contexto**: Main precisa de padding-bottom DINÂMICO = altura real da barra inferior.
**Fix**: `ResizeObserver` mede altura, expõe via CSS var `--bottom-tab-bar-height`.
**Regra**: SEMPRE barra fixa no bottom precisa de `useBottomTabBarHeight()` para
`padding-bottom` no main.

### D-CHIPS-TYPE-01
**Sintoma**: Chips de raio (10/25/50/100 km) não mudavam de cor ao clicar.
**Causa**: `useUrlFilters` parseia `'50'` para número `50`; options têm string `'50'`.
Comparação `50 === '50'` é false.
**Fix**: `String(value) === String(opt.value)` em FilterChipsRow.
**Regra**: SEMPRE normalizar comparação em chips/filtros com `String()`.

### D-APP-01
**Contexto**: `queryCache: {onError}` no QueryClient substitui a instância de QueryCache.
**Regra**: Ler a doc oficial antes de adivinhar API. React-query aceita `defaultOptions`
(config) e `queryCache/mutationCache` (INSTANCES).

### D-CACHE-01
**Contexto**: PWA cache imutável (`max-age=31536000`).
**Regra**: bump `filename: 'sw-vN.js'` em vite.config.js a cada deploy de UI crítica.

---

## 12. Links relacionados

- `docs/PLAN_V3_REDESIGN.md` — plano V3 macro (68 páginas, 15 fases)
- `docs/PAGE_REGENCY_TEMPLATE.md` — template
- `docs/V3_FEED_QUESTIONS.md` — Q1-Q10 + D1-D4 respondidos pelo user
- `docs/V3_PARTNER_SPACES.md` — TASK-V3-PARTNER-1 inscrita (Fase 14)
- `docs/design-system-v2/DESIGN_SYSTEM.md` — spec DS V2
- `docs/CORE_DIRECTIVES.md` — regras permanentes (D-APP-01, D-CACHE-01, D-VITE-LAZY-01)
- `docs/LEGAL_GUIDE_V2.md` — Guia de Implementação Legal v2 §5 (rodapé sempre visível)
- `src/modules/pets/pages/PetFeedV3.jsx` — código (420 linhas)
- `src/modules/pets/pages/PetFeed.jsx` — wrapper com lazy
- `src/modules/pets/pages/PetFeed.v1.jsx` — fallback V1
- `src/modules/pets/pages/PetFeedEnhanced.jsx` — fallback Enhanced
- `src/modules/pets/components/SwipeCard.jsx` — carta tinder
- `src/modules/pets/components/SwipeDeck.jsx` — container swipe
- `src/components/ui/filter-chips-row.jsx` — chips com fix String()
- `src/components/ui/input-city-autocomplete.jsx` — autocomplete cidade
- `src/components/ui/collapsible-card.jsx` — seção expansível
- `src/components/ui/pagination-controls.jsx` — paginação
- `src/components/ui/skeleton.jsx` — 7 variants
- `src/components/ui/empty-state.jsx` — empty com botões
- `src/components/ErrorState.jsx` — error retry
- `src/components/AdSlot.jsx` — Espaço para Parceiros
- `src/components/BottomTabBar.jsx` — barra inferior (TASK-923)
- `src/components/Layout.jsx` — Layout principal
- `src/components/LegalFooter.jsx` — Rodapé (TASK-922)
- `src/core/hooks/useUrlFilters.js` — sync URL
- `src/core/hooks/useSwipeGesture.js` — drag/swipe
- `src/core/hooks/useFeedPreferences.js` — prefs feed
- `src/core/hooks/useUiPreferences.js` — prefs visuais
- `src/core/hooks/useViewport.js` — mobile/tablet/desktop
- `src/modules/pets/domain/geoDistance.js` — cidades + raio + normalize
- `src/modules/pets/services/petService.js` — getAvailablePets
- `src/core/featureFlags.js` — V3_PAGE_FEED + 18 V3_PAGE_*

---

**Última atualização**: 2026-07-17 19:50 UTC
**Mantido por**: Mavis
**Status**: ✅ IMPLEMENTADO E DEPLOYADO
**Próxima página V3 (Fase 2)**: `V3_PAGE_PET_DETAIL` (a fazer quando user validar Feed)
