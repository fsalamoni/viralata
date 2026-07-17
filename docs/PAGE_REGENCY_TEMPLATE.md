# Template de Documento de Regência de Página

> **Diretriz ETERNA** (2026-07-17, TASK-V3-REGENCY-1)
>
> Toda página do Viralata deve ter um documento `docs/REGENCY_<PAGE_KEY>.md` seguindo este template.
> O documento é a fonte de verdade do que EXISTE na página. Qualquer pessoa/IA lendo este arquivo deve ser capaz de compreender, navegar e modificar a página sem ambiguidade.

---

## 0. Identidade

| Campo | Valor |
|---|---|
| **Rota** | `/caminho/da/rota` (com `:param` se aplicável) |
| **Componente** | `src/modules/<módulo>/pages/<PageName>.jsx` |
| **Wrapper** | `src/modules/<módulo>/pages/<PageName>Wrapper.jsx` (se houver) |
| **Flag V3** | `V3_PAGE_<KEY>` (default OFF) |
| **Auth** | Pública / Anon-ok / Login-required / Admin-required |
| **Plataforma** | Mobile-first (também desktop), responsivo |
| **Doc atualizada em** | YYYY-MM-DD HH:MM UTC |

---

## 1. Estrutura visual (de cima para baixo)

```
1. PageHero (eyebrow + título + descrição)
2. FilterChipsRow (espécie, porte, idade, sexo)
3. FilterRow (cidade + raio + ordenação)
4. Toggle "Mostrar meus pets" (se autenticado)
5. Texto explicativo do filtro de cidade
6. SwipeDeck (cartas tinder)
7. CollapsibleCard "Ver todos os pets disponíveis"
   - Fechado: chevron + texto
   - Aberto: SortDropdown + Grid de PetCards + PaginationControls
8. AdSlot (a cada 8 cards visíveis)
9. EmptyState / ErrorState / Skeleton (em cada seção)
```

---

## 2. Funcionalidades (exaustivo)

| # | Funcionalidade | Onde está no código | Hook / Service | Status |
|---|---|---|---|---|
| F1 | Drag horizontal de cartas | `<SwipeCard>` onPointerDown/Move/Up | `useSwipeGesture` | ✅ V3 |
| F2 | Botão curtir (♥) | `<SwipeDeck>` button | `useCreateInterest` | ✅ V1 |
| F3 | Botão passar (X) | `<SwipeDeck>` button | `useCreatePass` | 🆕 V3 |
| F4 | Botão UNDO | `<SwipeDeck>` button | `useUndoSwipe` | 🆕 V3 |
| F5 | Haptic feedback | navigator.vibrate em cada swipe | — | 🆕 V3 |
| F6 | Filtro espécie | `<FilterChipsRow>` species | `useUrlFilters` | ✅ V1 |
| F7 | Filtro porte | `<FilterChipsRow>` size | `useUrlFilters` | ✅ V1 |
| F8 | Filtro idade | `<FilterChipsRow>` age | `useUrlFilters` | 🆕 V3 |
| F9 | Filtro sexo | `<FilterChipsRow>` sex | `useUrlFilters` | 🆕 V3 |
| F10 | Filtro cidade | `<InputCityAutocomplete>` | `useUrlFilters` + `lookupCityCoordsByName` | 🆕 V3 |
| F11 | Filtro raio | `<FilterChipsRow>` radius | `useUrlFilters` | ✅ V1 |
| F12 | Ordenação | `<Select>` | `useUrlFilters` | 🆕 V3 |
| F13 | Sincronizar filtros com URL | `useUrlFilters` | hook | 🆕 V3 |
| F14 | Paginação | `<PaginationControls>` | `useUrlFilters` | 🆕 V3 |
| F15 | Mostrar/ocultar meus pets | `<Switch>` | `useFeedPreferences` | ✅ V1 |
| F16 | Cards por página (config) | `useUiPreferences().feedCardsPerPage` | hook | 🆕 V3 |
| F17 | Colunas do grid (config) | `useUiPreferences().feedGridColumns` | hook | 🆕 V3 |
| F18 | TopBar mode (config) | `useUiPreferences().topBarMode` | hook | 🆕 V3 |
| F19 | Dark mode | `useColorMode` | hook | ✅ V2 |
| F20 | Reduced motion | `useReducedMotionSafe` | hook | ✅ V2 |
| F21 | Autenticação (login) | `useAuth` | hook | ✅ V1 |

---

## 3. Componentes utilizados

| Componente | Arquivo | Onde é usado | DS_V2? |
|---|---|---|---|
| `<PageHero>` | `src/components/PageHero.jsx` | Topo da página | ✅ |
| `<FilterChipsRow>` | `src/components/FilterChipsRow.jsx` | Filtros chips | 🆕 V3 |
| `<InputCityAutocomplete>` | `src/components/InputCityAutocomplete.jsx` | Filtro cidade | 🆕 V3 |
| `<SwipeCard>` | `src/modules/pets/components/SwipeCard.jsx` | Carta tinder | 🆕 V3 |
| `<SwipeDeck>` | `src/modules/pets/components/SwipeDeck.jsx` | Container swipe | 🆕 V3 |
| `<PetCard>` | `src/modules/pets/components/PetCard.jsx` | Grid | ✅ DS_V2_PAGES-PETS |
| `<Select>` | `src/components/ui/select.jsx` | Ordenação | ✅ |
| `<Switch>` | `src/components/ui/switch.jsx` | Toggle | ✅ |
| `<Button>` | `src/components/ui/button.jsx` | Ações | ✅ DS_V2_COMPONENTS |
| `<Skeleton>` | `src/components/Skeleton.jsx` | Loading | 🆕 V3 |
| `<EmptyState>` | `src/components/EmptyState.jsx` | Vazio | 🆕 V3 |
| `<ErrorState>` | `src/components/ErrorState.jsx` | Erro | 🆕 V3 (refatora) |
| `<PaginationControls>` | `src/components/PaginationControls.jsx` | Paginação | 🆕 V3 |
| `<AdSlot>` | `src/components/AdSlot.jsx` | Anúncios | ✅ TASK-024 |
| `<FadeIn>` | `src/components/ui/motion.jsx` | Animação entrada | ✅ DS_V2_MOTION |
| `<HoverLift>` | `src/components/ui/motion.jsx` | Hover | ✅ DS_V2_MOTION |

---

## 4. Hooks e Services

| Hook/Service | Arquivo | Função |
|---|---|---|
| `usePetFeed` | `src/modules/pets/hooks/usePets.js` | Query de pets com filtros |
| `useCreateInterest` | `src/modules/pets/hooks/usePets.js` | Mutation curtir |
| `useFeedPreferences` | `src/core/hooks/useFeedPreferences.js` | Preferências do feed |
| `useUiPreferences` | `src/core/hooks/useUiPreferences.js` | Prefs visuais (TASK-401) |
| `useColorMode` | `src/core/hooks/useColorMode.js` | Modo claro/escuro/sistema |
| `useReducedMotionSafe` | `src/core/hooks/useReducedMotionSafe.js` | Honra prefers-reduced-motion |
| `useUrlFilters` | `src/core/hooks/useUrlFilters.js` | Sincroniza filtros com URL (🆕 V3) |
| `useSwipeGesture` | `src/core/hooks/useSwipeGesture.js` | Lógica de drag/swipe (🆕 V3) |
| `useAuth` | `src/core/lib/FirebaseAuthContext.jsx` | User logado |
| `usePlatformSettings` | `src/core/lib/FeatureFlagsContext.jsx` | Settings globais (hero text, etc) |
| `petsService` | `src/modules/pets/services/petsService.js` | CRUD de pets |
| `geoDistance` | `src/modules/pets/domain/geoDistance.js` | Cálculo de raio |
| `feedFilters` | `src/modules/pets/domain/feedFilters.js` | Lógica de filtros |

---

## 5. Textos visíveis (todos)

| Texto | Origem | Onde aparece | V3? |
|---|---|---|---|
| "Pets para adoção" | `Seo` title | `<head>` | ✅ |
| "Encontre seu novo melhor amigo, {firstName}" | `settings.ui_text.feed_hero_title` + interpolation | `<PageHero>` | ✅ |
| "Feed de pets disponíveis para adoção responsável perto de você." | `settings.ui_text.feed_hero_description` | `<PageHero>` | ✅ |
| "Descobrir" | hard-coded | `<SwipeDeck>` title | 🆕 mover para i18n |
| "Você viu todos os destaques!" | hard-coded | empty state SwipeDeck | 🆕 |
| "Veja a lista completa logo abaixo." | hard-coded | empty state SwipeDeck | 🆕 |
| "CURTIR" | hard-coded | swipe overlay | 🆕 |
| "AGORA NÃO" | hard-coded | swipe overlay | 🆕 |
| "Todos os pets disponíveis" | hard-coded | grid title | ✅ |
| "Você deseja ver todos os pets disponíveis? Clique aqui" | 🆕 V3 | collapsible | 🆕 |
| "Nenhum pet encontrado com esses filtros." | hard-coded | empty grid | 🆕 mover para i18n |
| "Tente ampliar o raio, mudar a cidade ou limpar os filtros..." | hard-coded | empty grid | 🆕 |
| "Mostrar meus pets no feed" | hard-coded | toggle label | ✅ |
| "Sem cidade definida — mostrando todos os pets..." | hard-coded | helper text | ✅ |
| "Pets até {radius} km de {city}..." | interpolation | helper text | ✅ |
| "Salvar" / "Carregando..." / "Erro ao carregar pets" | i18n padrão | UI states | ✅ |

---

## 6. Estados da página

| Estado | Trigger | UI | DS |
|---|---|---|---|
| **Loading** | `usePetFeed().isLoading` | `<Skeleton variant="pet-card" count={8} />` | `<Skeleton>` 🆕 |
| **Empty (SwipeDeck)** | `pets.length === 0` | `<EmptyState icon="pets" title="..." description="..." />` | `<EmptyState>` 🆕 |
| **Empty (Grid)** | filtros sem resultado | `<EmptyState icon="search" title="..." buttons={['Limpar filtros', 'Ampliar raio']} />` | `<EmptyState>` 🆕 |
| **Error** | `usePetFeed().isError` | `<ErrorState onRetry={refetch} />` | `<ErrorState>` 🆕 |
| **Success** | dados carregados | render principal | — |
| **Auth required action** | `createInterest` sem user | `navigate('/login')` | — |
| **Reduced motion** | `prefers-reduced-motion` ou `prefs.reduceMotion` | desabilita transições | `useReducedMotionSafe` |
| **Dark mode** | `useColorMode().mode === 'dark'` | `<html class="dark">` | tokens `.dark` |
| **Top bar collapsed** | `prefs.topBarMode === 'hidden'` | `<header>` sem `sticky` ou `display: none` | 🆕 |
| **Bottom bar collapsed** | `prefs.bottomTabBarMode === 'hidden'` | `<nav>` hidden | ✅ |
| **Compact mode** | `prefs.compactMode === true` | reduz paddings | 🆕 aplicar nos cards |

---

## 7. Acessibilidade

| Item | Status | Notas |
|---|---|---|
| `<button>` com `aria-label` | ✅ | curtir, passar, info, undo |
| `aria-live="polite"` em mudanças | 🆕 | quando swipe acontece |
| `aria-live="assertive"` em erros | 🆕 | quando fetch falha |
| `role="status"` em loading | ✅ | skeleton |
| `<nav aria-label="...">` em tabs | ✅ | chips de filtro |
| `<main>` semântico | ✅ | Layout |
| `prefers-reduced-motion` | ✅ | `useReducedMotionSafe` |
| Contraste WCAG AA | ✅ | tokens do DS |
| Foco visível | ✅ | `outline` global |
| Drag por teclado (sem mouse) | 🆕 | setas + espaço/enter |
| Alt text em fotos | ✅ | `pet.photos[i]` + `pet.title` |
| Tab order lógico | ✅ | fluxo natural |
| `lang="pt-BR"` | ✅ | `<html>` |

---

## 8. Performance

| Item | Status | Notas |
|---|---|---|
| React.memo em cards | 🆕 | `PetCard`, `SwipeCard` |
| `useCallback` em handlers | ✅ | já existia |
| `useMemo` em listas filtradas | 🆕 | `pets.filter(...)` |
| `useDeferredValue` em filtros | 🆕 | input de busca |
| Virtual scroll (lista grande) | 🆕 | se `pets.length > 50` |
| Imagens `loading="lazy"` | ✅ | `<img>` |
| `next/image` ou similar | ❌ | Vite build otimiza |
| Bundle size | < 50kb | Vite code splitting |
| LCP (Largest Contentful Paint) | < 2.5s | prioridade: foto do SwipeCard |
| CLS (Cumulative Layout Shift) | < 0.1 | skeleton mantém espaço |
| FID (First Input Delay) | < 100ms | handlers leves |

---

## 9. Testes

### 9.1. Unit (Vitest)
- [ ] `PetFeedV3.test.jsx` — renderiza, mostra loading, mostra empty, mostra erro
- [ ] `SwipeCard.test.jsx` — drag, like, pass, undo
- [ ] `FilterChipsRow.test.jsx` — seleção, multi-select, URL sync
- [ ] `InputCityAutocomplete.test.jsx` — autocomplete, cidade do user como default
- [ ] `PaginationControls.test.jsx` — primeira, próxima, anterior, última
- [ ] `useUrlFilters.test.js` — sync bidirecional, sanitização
- [ ] `useSwipeGesture.test.js` — thresholds, callbacks

### 9.2. E2E (Playwright)
- [ ] `/feed` desktop 1280x800 — renderiza SwipeDeck + Collapsible
- [ ] `/feed` mobile 360x640 — full-width, sem hover
- [ ] `/feed` tablet 768x1024 — 2 colunas grid
- [ ] Drag horizontal → like → toast sucesso
- [ ] Drag horizontal ← pass → próximo pet
- [ ] Botão UNDO volta o último
- [ ] Filtro espécie → grid filtra
- [ ] Filtro cidade + raio → grid filtra
- [ ] Toggle "meus pets" → some
- [ ] Dark mode toggle → tokens propagam
- [ ] `topBarMode=hidden` → header some
- [ ] Acessibilidade: navegação por teclado, screen reader

### 9.3. Visual regression (Playwright + Percy ou similar)
- [ ] Screenshot `/feed` 4 viewports
- [ ] Screenshot empty state
- [ ] Screenshot error state
- [ ] Screenshot dark mode

---

## 10. Histórico de mudanças

| Data | Versão | Mudança | Autor |
|---|---|---|---|
| 2026-07-17 | V3.0 | Refactor completo (criação) | Mavis |
| ... | ... | ... | ... |

---

## 11. Links relacionados

- `docs/PLAN_V3_REDESIGN.md` — plano V3 macro
- `docs/design-system-v2/DESIGN_SYSTEM.md` — spec DS V2
- `docs/CORE_DIRECTIVES.md` — regras permanentes
- `.harness/SCRUM_TASKS.json` — tasks TASK-V3-FEED-*
- `src/modules/pets/pages/PetFeedV3.jsx` — código da página
- `src/modules/pets/components/SwipeCard.jsx` — componente drag
- `src/modules/pets/components/SwipeDeck.jsx` — container

---

**Última atualização**: YYYY-MM-DD HH:MM UTC
**Mantido por**: Mavis
**Próxima revisão**: quando houver mudança significativa
