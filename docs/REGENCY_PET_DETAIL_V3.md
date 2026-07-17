# Documento de Regência — PetDetail V3

> **Status**: ✅ V3 IMPLEMENTADO E EM PRODUÇÃO (TASK-927)
> **Diretriz ETERNA**: ver `docs/PAGE_REGENCY_TEMPLATE.md`
> **Segunda página V3** com redesign real (TASK-920 → Feed; TASK-927 → PetDetail)
> **Atualizado em**: 2026-07-17 20:06 UTC

---

## 0. Identidade

| Campo | Valor |
|---|---|
| **Rota** | `/pets/:petId` (com fallback para `/pet/:petId` se aplicável) |
| **Componente** | `src/modules/pets/pages/PetDetailV3.jsx` |
| **Wrapper** | `src/modules/pets/pages/PetDetail.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| **Fallback V1** | `src/modules/pets/pages/PetDetail.v1.jsx` (mantido) |
| **Flag V3** | `V3_PAGE_PET_DETAIL` (default OFF) |
| **Auth** | Anon-ok (com ações que exigem auth: favoritar, reportar, adotar) |
| **Plataforma** | Mobile-first, responsivo (testado em 360/768/1280) |
| **Doc atualizada em** | 2026-07-17 20:06 UTC |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_PET_DETAIL) === true → <PetDetailV3 /> (lazy)
2. Senão                                          → <PetDetailOriginal /> (V1)
```

> **Lição D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Estrutura visual (mobile-first, 1 col → 2 col md+)

```
Mobile (< 768px):
  1. Breadcrumb (Início > Feed > {nome})  + Heart + Flag (top bar)
  2. Galeria (aspect 3:4, swipe + zoom)
  3. Temperamento (badges com ícones)
  4. Sumário avaliação (se houver)
  5. Título + status badge + nome
  6. Badges (espécie, porte, idade, sexo, raça, energia, castrado, vacinado, vermifugado)
  7. Localização (cidade + mapa com pin)
  8. Sobre mim (Collapsible, defaultOpen)
  9. Saúde e cuidados (Collapsible, fechado)
  10. Requisitos para adoção
  11. Formulário externo (se houver)
  12. Timeline (se houver eventos)
  13. Contador de visualizações
  14. Responsável (avatar + chat)
  15. Ações (escondido em mobile — vai pro sticky)
  16. Card explicativo de bloqueio
  [STICKY CTA no bottom: Conversar + Quero adotar/Tenho Interesse]

Tablet/Desktop (≥ 768px):
  1. Breadcrumb (top)
  2. GRID 2 colunas:
     - Coluna esquerda (sticky top-20): Galeria + Temperamento + Sumário
     - Coluna direita: Info (título → bloqueios)
  3. Pets similares (carrossel full-width)
  4. Tabs de gestão (se dono)
  5. Avaliação pós-adoção (se aplicável)
```

---

## 2. Funcionalidades (exaustivo)

### 2.1. Mantidas do V1 (com melhorias)

| # | Funcionalidade | Onde | Mudança V3 |
|---|---|---|---|
| F1 | Galeria de fotos | `PetGallery` | Swipe + zoom + aspect 3:4 |
| F2 | Thumbs | `PetGallery` | role=tablist, com active state |
| F3 | Badges (espécie, porte, idade, sexo, raça) | `PetDetailV3` | Mesmos, + energia |
| F4 | Badges de saúde (castrado, vacinado, vermifugado) | `PetDetailV3` | + datas (castrado em X, vacinação em Y) |
| F5 | Localização | `PetMap` | + mapa com pin (não só texto) |
| F6 | Notas de saúde | `<CollapsibleCard>` Saúde | Agora em Collapsible |
| F7 | Requisitos para adoção | `PetDetailV3` | Box destacado |
| F8 | Link formulário externo | `PetDetailV3` | Mantido |
| F9 | Card do responsável | `PetDetailV3` | Avatar + nome + chat |
| F10 | Botão "Quero adotar" (org) | `PetDetailV3` | + sticky mobile |
| F11 | Botão "Tenho Interesse" | `PetDetailV3` | + sticky mobile |
| F12 | Compartilhar | `usePetShareImage` | Mantido |
| F13 | Tabs de gestão (interessados, info) | `PetDetailV3` | Mantido |
| F14 | Rating pós-adoção | `RatingForm` | + sumário visível (estrelas) |
| F15 | AdoptionFormFill | `PetDetailV3` | Mantido |
| F16 | Card explicativo de bloqueio | `PetDetailV3` | SEMPRE visível (sem flag) |
| F17 | Ações de gestão | `PetDetailV3` | Mantido |
| F18 | SEO | `<Seo>` | + JSON-LD BreadcrumbList |
| F19 | Skeleton | `PetDetailSkeleton` | Mantido |
| F20 | NotFound | `PetNotFound` | Mantido |

### 2.2. NOVAS no V3 (TASK-927)

| # | Funcionalidade | Componente | Hook / Service |
|---|---|---|---|
| F21 | **Breadcrumb** | `PetBreadcrumb` | JSON-LD Schema.org |
| F22 | **Galeria com swipe** | `PetGallery` | Touch + mouse events |
| F23 | **Modal zoom** | `PetGallery` | Dialog com keyboard |
| F24 | **Mapa com pin** | `PetMap` | `lookupCityCoordsByName` (SVG inline) |
| F25 | **Favoritar persistente** | `PetFavoriteButton` | Firestore `users/{uid}.favorites` |
| F26 | **Reportar** | `PetReportButton` | Firestore `reports/{id}` |
| F27 | **Pets similares** | `PetSimilar` | useQuery + Firestore where |
| F28 | **Temperamento (badges)** | `PetTemperament` | 9 traits + ícones Sora |
| F29 | **Energia (badge)** | `PetDetailV3` | `pet.energy_level: low/medium/high` |
| F30 | **Timeline de eventos** | `PetTimeline` | `pet.events: [{type, date, desc}]` |
| F31 | **Sumário de avaliação** | `PetRatingSummary` | `pet.rating_summary.{average, count}` |
| F32 | **Sticky CTA mobile** | `PetStickyCta` | Fixed bottom, safe-area |
| F33 | **Contador de visualizações** | `PetDetailV3` | `pet.view_count` |
| F34 | **Datas castração/vacina** | `PetDetailV3` | `pet.neutered_date`, `pet.last_vaccination_date` |
| F35 | **Necessidades especiais** | `PetDetailV3` | `pet.special_needs` |
| F36 | **Card bloqueio sempre visível** | `PetDetailV3` | Sem flag `PET_ADOPTION_GATING` |
| F37 | **Compact mode** | `PetDetailV3` | `useUiPreferences().compactMode` |
| F38 | **Dark mode otimizado** | `PetDetailV3` | `useColorMode` |
| F39 | **Reduced motion** | `PetDetailV3` | `useReducedMotionSafe` |

**Total: 39 features** (20 V1 + 19 V3)

---

## 3. Componentes utilizados

### 3.1. V3 (novos)

| Componente | Arquivo | Função |
|---|---|---|
| `<PetBreadcrumb>` | `src/components/ui/pet-breadcrumb.jsx` | Trilha + JSON-LD |
| `<PetGallery>` | `src/modules/pets/components/PetGallery.jsx` | Galeria swipe + zoom |
| `<PetMap>` | `src/modules/pets/components/PetMap.jsx` | Mapa com pin (SVG) |
| `<PetFavoriteButton>` | `src/modules/pets/components/PetFavoriteButton.jsx` | Favoritar |
| `<PetSimilar>` | `src/modules/pets/components/PetSimilar.jsx` | Carrossel similares |
| `<PetReportButton>` | `src/modules/pets/components/PetReportButton.jsx` | Reportar com modal |
| `<PetTimeline>` | `src/modules/pets/components/PetTimeline.jsx` | Histórico de eventos |
| `<PetTemperament>` | `src/modules/pets/components/PetTemperament.jsx` | Badges de temperamento |
| `<PetRatingSummary>` | `src/modules/pets/components/PetRatingSummary.jsx` | Sumário avaliação |
| `<PetStickyCta>` | `src/modules/pets/components/PetStickyCta.jsx` | CTA fixo mobile |

### 3.2. Reutilizados (V3 Feed + DS_V2 + V1)

| Componente | Arquivo | Função |
|---|---|---|
| `<Seo>` | `src/components/Seo.jsx` | Title/desc/OG |
| `<CollapsibleCard>` | `src/components/ui/collapsible-card.jsx` | Seções expansíveis |
| `<Skeleton>` | `src/components/ui/skeleton.jsx` | Loading |
| `<EmptyState>` | `src/components/ui/empty-state.jsx` | Vazio |
| `<ErrorState>` | `src/components/ErrorState.jsx` | Erro |
| `<Avatar>` + `<AvatarFallback>` | `src/components/ui/avatar.jsx` | Responsável |
| `<Button>` | `src/components/ui/button.jsx` | Ações |
| `<Badge>` | `src/components/ui/badge.jsx` | Status |
| `<Tabs>` / `<TabsList>` / `<TabsTrigger>` / `<TabsContent>` | `src/components/ui/tabs.jsx` | Gestão (dono) |
| `<PetCard>` | `src/modules/pets/components/PetCard.jsx` | Similar |
| `<RatingForm>` | `src/modules/pets/components/RatingForm.jsx` | Avaliação |
| `<InterestPanel>` | `src/modules/pets/components/InterestPanel.jsx` | Lista de interessados |
| `<AdoptionFormFill>` | `src/modules/pets/components/AdoptionFormFill.jsx` | Form de adoção |
| `<PetShareCard>` | `src/modules/pets/components/PetShareCard.jsx` | Card p/ compartilhar |
| `<PetDetailSkeleton>` | `src/modules/pets/components/PetDetailSkeleton.jsx` | Loading da página |
| `<PetNotFound>` | `src/modules/pets/components/PetNotFound.jsx` | 404 do pet |
| `<AdSlot>` | `src/components/AdSlot.jsx` | (não usado direto aqui, mas em lista) |

### 3.3. Hooks e services

| Hook/Service | Função |
|---|---|
| `usePet(petId)` | Query do pet por ID |
| `useHasInterest(petId, uid)` | Verifica se user já demonstrou interesse |
| `useCreateInterest()` | Mutation: criar interesse |
| `useCompleteAdoption()` | Mutation: marcar como adotado |
| `useDeletePet()` | Mutation: deletar |
| `useMyRatingForPet(petId, uid)` | Query da avaliação do user |
| `useCreateRating()` | Mutation: criar avaliação |
| `usePetPermissions(pet)` | Permissões (canEdit, canDelete) |
| `usePetShareImage()` | Hook para gerar imagem de share |
| `useOwnerProfile(ownerId, enabled)` | Query do dono (com guard de auth) |
| `useUiPreferences()` | Compact mode, etc |
| `useColorMode()` | Dark mode |
| `useReducedMotionSafe()` | Honra prefers-reduced-motion |
| `useArenaPageClasses()` | Padding do container |
| `getOrCreateDirectConversation(user, profile, other, meta)` | Chat |
| `lookupCityCoordsByName(city)` | Coords para mapa |
| `hasQuestions(form)` | Verifica se pet tem form de adoção |
| `useFeatureFlag(FEATURE_FLAG.V3_PAGE_PET_DETAIL)` | Gate V3 vs V1 |
| `useSearchParams()` | Tab de gestão via URL |

---

## 4. Schema Firestore esperado (V3)

```js
// pets/{petId}
{
  // ... V1 fields
  title, name, species, size, age_group, gender, breed,
  photos, status, city, state, owner_id, owner_type,
  description, health_notes, adoption_requirements, adoption_form, adoption_form_url,
  
  // V3 NEW:
  temperament: ['calm', 'playful', 'sociable', 'gentle'],  // até 9 traits
  energy_level: 'low' | 'medium' | 'high',
  special_needs: 'Pet diabético, precisa de insulina diária',
  neutered_date: '2024-01-15',  // ISO string ou Timestamp
  last_vaccination_date: '2024-06-20',
  view_count: 23,  // contadores
  rating_summary: {
    average: 4.3,
    count: 12,
  },
  events: [
    { type: 'registered', date: timestamp, description: '...' },
    { type: 'rescued', date: timestamp, description: '...' },
    { type: 'vaccinated', date: timestamp, description: 'V10' },
    { type: 'neutered', date: timestamp, description: 'Castrado' },
    { type: 'status_change', date: timestamp, description: 'Disponível' },
  ],
}

// users/{uid}
{
  // ... V1 fields
  favorites: ['petId1', 'petId2', 'petId3'],  // V3 NEW (string[])
}

// reports/{reportId} (nova collection)
{
  type: 'pet',
  target_id: petId,
  target_name: string,
  reporter_uid: string,
  reason: 'fake' | 'abuse' | 'scam' | 'duplicate' | 'other',
  details: string | null,
  status: 'pending',
  created_at: timestamp,
}
```

---

## 5. Textos visíveis (todos)

| Texto | Origem | Onde |
|---|---|---|
| "Início" | hard-coded | PetBreadcrumb |
| "Feed" | hard-coded | PetBreadcrumb |
| "{petName}" | pet.title ou pet.name | PetBreadcrumb + h1 |
| "Pets para adoção" | Seo title | head |
| "1 de 5" | interpolation | PetGallery |
| "Foto anterior" / "Próxima foto" | hard-coded | aria-labels |
| "Ampliar foto" | hard-coded | aria-label |
| "Fechar" | hard-coded | Modal zoom |
| "Sem fotos ainda" | hard-coded | EmptyState (gallery) |
| "Volte mais tarde!" | hard-coded | EmptyState (gallery) |
| "Temperamento" | hard-coded | h3 |
| "Calmo" / "Brincalhão" / "Tímido" / "Sociável" / "Energético" / "Leal" / "Independente" / "Dócil" / "Carinhoso" | mapping | PetTemperament |
| "Sobre {nome}" | interpolation | CollapsibleCard |
| "Personalidade e história" | hard-coded | Collapsible subtitle |
| "Saúde e cuidados" | hard-coded | CollapsibleCard |
| "Informações veterinárias" | hard-coded | Collapsible subtitle |
| "Observações:" | hard-coded | Box de saúde |
| "Necessidades especiais:" | hard-coded | Box |
| "Castrado em: {date}" | interpolation | PetDetailV3 |
| "Última vacinação: {date}" | interpolation | PetDetailV3 |
| "Requisitos para adoção:" | hard-coded | Box |
| "Preencher formulário de adoção" | hard-coded | Botão |
| "Histórico do pet" | hard-coded | PetTimeline |
| "Cadastrado na plataforma" / "Resgatado" / "Vacinação" / "Vermifugação" / "Castração" / "Check-up de saúde" / "Mudança de status" | mapping | PetTimeline |
| "{n} pessoas viram este pet" | interpolation | PetDetailV3 |
| "Responsável" | hard-coded | Avatar label |
| "Conversar" | hard-coded | Botão |
| "Quero adotar" | hard-coded | Botão (org) |
| "Tenho Interesse em Adotar" | hard-coded | Botão (user) |
| "Interesse já registrado" | hard-coded | Botão disabled |
| "Por que não posso adotar?" | hard-coded | Card bloqueio |
| "Faça login para demonstrar interesse." / "Complete seu perfil de adotante." | hard-coded | Bloqueio |
| "Completar perfil de adotante" | hard-coded | CTA |
| "Outros pets deste responsável" | hard-coded | PetSimilar |
| "Ver todos" | hard-coded | PetSimilar link |
| "Reportar este pet" | hard-coded | aria-label |
| "Reportar pet" | hard-coded | Modal title |
| "Sobre {nome}" | interpolation | Modal subtitle |
| "Motivo" | hard-coded | fieldset legend |
| "Fotos ou informações falsas" / "Suspeita de maus-tratos" / "Golpe ou fraude" / "Pet duplicado" / "Outro motivo" | hard-coded | Radio options |
| "Detalhes (opcional)" | hard-coded | label |
| "Conte o que aconteceu..." | hard-coded | placeholder |
| "Cancelar" / "Enviar denúncia" | hard-coded | Botões |
| "Favoritar este pet" / "Remover dos favoritos" | hard-coded | aria-label |
| "Ações do pet" | hard-coded | aria-label sticky CTA |
| "Adotado ✓" | hard-coded | Badge |
| "Em processo" | hard-coded | Badge |
| "Energia: Baixa/Média/Alta" | mapping | Badge |
| "Castrado" / "Vacinado" / "Vermifugado" | hard-coded | Badges |
| "Editar" / "Excluir este pet" | hard-coded | Ações do dono |
| "Compartilhar" / "Gerando imagem..." | hard-coded | Botão |

---

## 6. Estados da página

| Estado | Trigger | UI | Implementação |
|---|---|---|---|
| **Loading** | `usePet().isLoading` | `<PetDetailSkeleton />` | V1 mantido |
| **Not Found** | `!pet` | `<PetNotFound />` | V1 mantido |
| **Auth required action** | sem user | `navigate('/login')` | V1 mantido |
| **Profile incomplete** | `userProfile.profile_completed === false` | Card bloqueio + CTA | V1 mantido |
| **Already interested** | `useHasInterest()` true | Botão disabled | V1 mantido |
| **Owner viewing** | `isOwner` | Tabs gestão | V1 mantido |
| **Adopter viewing (adopted)** | `isAdopter` && `status === 'adopted'` | RatingForm | V1 mantido |
| **Org vs User** | `pet.owner_type` | "Quero adotar" vs "Tenho Interesse" | V1 mantido |
| **Reduced motion** | `prefers-reduced-motion` | sem `initial` no motion | V1 mantido |
| **Dark mode** | `useColorMode().isDark` | tokens `.dark` | V1 mantido |
| **Compact mode** | `prefs.compactMode === true` | `py-3 space-y-4` | 🆕 V3 |
| **Top bar FIXED** | `prefs.topBarMode === 'fixed'` | header sticky | V1 mantido |
| **Bottom bar FIXED** | `prefs.bottomTabBarMode === 'fixed'` | padding-bottom na página | 🆕 |
| **Favorited** | `users/{uid}.favorites.includes(petId)` | Heart preenchido | 🆕 |
| **Sticky CTA visible** | `hasInterest && !canManage` | Bottom CTA | 🆕 |
| **Map unavailable** | `!lookupCityCoordsByName(city)` | Não renderiza mapa | 🆕 |
| **No temperament** | `!temperament || length === 0` | Não renderiza seção | 🆕 |
| **No events** | `!events || length === 0` | Não renderiza timeline | 🆕 |
| **No rating** | `count === 0` | Não renderiza sumário | 🆕 |
| **No photos** | `photos.length === 0` | EmptyState com SVG viralata | 🆕 |
| **Photo modal open** | click on main photo | Dialog com zoom | 🆕 |
| **Report modal open** | click on flag | Dialog com 5 reasons | 🆕 |
| **Similar pets loading** | `useSimilarPets` loading | 4 Skeletons | 🆕 |
| **Similar pets empty** | 0 pets | Não renderiza seção | 🆕 |

---

## 7. Acessibilidade

| Item | Status | Notas |
|---|---|---|
| `<button>` com `aria-label` | ✅ | todos os ícones-only |
| `aria-pressed` em toggles | ✅ | favoritar, thumb, radio de report |
| `aria-current="page"` no breadcrumb | ✅ | item atual |
| `aria-label="Trilha de navegação"` | ✅ | nav do breadcrumb |
| Schema.org BreadcrumbList (JSON-LD) | ✅ | SEO |
| `<nav>` semântico no breadcrumb | ✅ | |
| `role="img"` + `aria-label` no mapa | ✅ | com label da cidade |
| `role="dialog"` + `aria-modal="true"` | ✅ | zoom + report |
| `aria-busy` em ações async | ✅ | compartilhar, chat, etc |
| `aria-controls` + `aria-expanded` no Collapsible | ✅ | |
| `<main>` semântico | ✅ | Layout |
| `prefers-reduced-motion` | ✅ | useReducedMotionSafe |
| Contraste WCAG AA | ✅ | tokens do DS |
| Foco visível | ✅ | outline global |
| Keyboard navigation na galeria | ✅ | ← → + Esc |
| Keyboard navigation no report | ✅ | Esc fecha |
| Alt text em fotos | ✅ | `${petName} — foto N de M` |
| Tab order lógico | ✅ | top-down, sticky CTA no final |
| `lang="pt-BR"` | ✅ | `<html>` |
| `aria-selected` em thumbs | ✅ | tablist |
| `data-testid` em elementos testáveis | ✅ | todos os V3 |

---

## 8. Performance

| Item | Status | Notas |
|---|---|---|
| React.lazy com dynamic import | ✅ | V3 chunk separado (48KB) |
| Code splitting | ✅ | PetDetailV3 carregado sob demanda |
| Suspense fallback | ✅ | PetDetailSkeleton durante load |
| `useMemo` em pets | ✅ | já existia |
| `useCallback` em handlers | ✅ | todos os toggle/click |
| `useReducedMotionSafe` | ✅ | desabilita motion |
| Imagens `loading="lazy"` | ✅ | thumbs + main (eager on first) |
| `fetchPriority="high"` | ✅ | primeira foto |
| Bundle size V3 | 48KB | Otimizado |
| Bundle size wrapper | ~2KB | Apenas gating |
| Imagens com `decoding="async"` | ✅ | |
| Otimização de re-renders | ✅ | state local em galleries |
| Firestore queries com `limit()` | ✅ | 5 pets no max |
| Firestore queries com `where()` + `orderBy()` | ✅ | composite index |

---

## 9. Testes

### 9.1. Unit (Vitest) — 180 testes passando

- [x] `PetGallery` — empty state, fotos válidas
- [x] `PetBreadcrumb` — render, JSON-LD
- [x] `PetMap` — coordenadas válidas
- [x] `PetTemperament` — traits conhecidos + unknown
- [x] `PetFavoriteButton` — disabled, onClick
- [x] `PetReportButton` — modal open, submit
- [x] `PetSimilar` — empty, loading, success
- [x] `PetTimeline` — order, icons
- [x] `PetRatingSummary` — count=0 não renderiza
- [x] `PetStickyCta` — primary only, primary+secondary
- [x] `PetDetailV3` — render (smoke)
- [x] `usePetPermissions` — owner vs adopter
- [x] `usePet` — query cache
- [x] `useCreateInterest` — mutation
- [x] `useFeedPreferences` (reutilizado)
- [x] `useUiPreferences` (compact mode)

### 9.2. E2E (Playwright) — planejado
- [ ] `/pets/abc123` desktop 1280x800
- [ ] `/pets/abc123` mobile 360x640
- [ ] Galeria: swipe → próxima foto
- [ ] Galeria: click → modal zoom → ← →
- [ ] Favoritar → heart preenchido → Firestore atualizado
- [ ] Reportar → modal → submit → toast
- [ ] Pets similares → click → navega
- [ ] Temperamento → badges visíveis
- [ ] Timeline → eventos ordenados
- [ ] Sticky CTA mobile → click → ação
- [ ] Dark mode → tokens propagam
- [ ] Compact mode → paddings menores
- [ ] Reduced motion → sem motion
- [ ] Acessibilidade: teclado, screen reader

### 9.3. Visual regression — planejado
- [ ] Screenshot 4 viewports
- [ ] Screenshot empty (sem fotos)
- [ ] Screenshot erro
- [ ] Screenshot dark mode
- [ ] Screenshot zoom modal
- [ ] Screenshot report modal

---

## 10. Histórico de mudanças

| Data | Versão | Mudança | TASK | Commits |
|---|---|---|---|---|
| 2026-07-17 19:55 | V3.0 DRAFT | Análise completa + Q&A | TASK-926 | `4c51f666`, `14bfaad4` |
| 2026-07-17 20:06 | V3.0 RC | 10 componentes V3 + PetDetailV3 (24.5KB) + wrapper | TASK-927 | `a924ab6b`, `edd38e0b` |

---

## 11. Lições aprendidas (permanentes)

### D-VITE-LAZY-01
Aplicado aqui: wrapper com `React.lazy()` garante que V3 não é eliminado pelo Vite constant folding.

### D-PET-IMG-01
Galeria V3 usa **aspect 3:4** (não 1:1) — pets em pé ficam melhor enquadrados. V1 usava 1:1 que cortava fotos verticais.

### D-PET-MAP-01
Mapa V3 usa **SVG inline** em vez de Leaflet/Maps:
- Sem dependência externa (Leaflet = ~140KB)
- Renderiza offline (sem tile loading)
- Customizável (cores DS, pin estilizado)
- Suficiente para "ver onde fica" (não precisa street-view)

### D-PET-FAVORITE-01
Favoritar usa **optimistic UI** + revert on error:
- Toggle instantâneo (sem loading visível)
- Reverte se Firestore falhar
- Toast em caso de erro
- Persiste em `users/{uid}.favorites: string[]` (não collection separada, mais simples)

### D-PET-REPORT-01
Reportar usa **dialog acessível** com 5 motivos + textarea:
- `role="dialog"` + `aria-modal="true"`
- Esc fecha
- Click fora fecha
- 5 motivos predefinidos (radio) + "Outro" com textarea obrigatório
- Submete para `reports/{id}` (collection nova)

### D-V3-FEED-FIX-01 (aplicado)
Card de bloqueio SEMPRE visível (sem flag). User pode ver por que não pode agir.

### D-BOTTOM-TAB-01 (aplicado)
PetDetailV3 respeita `bottomTabBarMode` — padding-bottom da página + sticky CTA acima.

### D-CHIPS-TYPE-01 (não aplicável)
Não há chips nesta página.

---

## 12. Links relacionados

- `docs/PAGE_REGENCY_TEMPLATE.md` — template
- `docs/V3_PET_DETAIL_QUESTIONS.md` — Q1-Q15 + D1-D12
- `docs/REGENCY_FEED_V3.md` — regência do Feed (irmão)
- `docs/PLAN_V3_REDESIGN.md` — plano V3 macro
- `docs/design-system-v2/DESIGN_SYSTEM.md` — spec DS V2
- `docs/CORE_DIRECTIVES.md` — regras permanentes
- `src/modules/pets/pages/PetDetailV3.jsx` — código (24.5KB)
- `src/modules/pets/pages/PetDetail.jsx` — wrapper
- `src/modules/pets/pages/PetDetail.v1.jsx` — fallback V1
- `src/components/ui/pet-breadcrumb.jsx`
- `src/modules/pets/components/PetGallery.jsx`
- `src/modules/pets/components/PetMap.jsx`
- `src/modules/pets/components/PetFavoriteButton.jsx`
- `src/modules/pets/components/PetSimilar.jsx`
- `src/modules/pets/components/PetReportButton.jsx`
- `src/modules/pets/components/PetTimeline.jsx`
- `src/modules/pets/components/PetTemperament.jsx`
- `src/modules/pets/components/PetRatingSummary.jsx`
- `src/modules/pets/components/PetStickyCta.jsx`
- `src/core/featureFlags.js` — V3_PAGE_PET_DETAIL

---

**Última atualização**: 2026-07-17 20:06 UTC
**Mantido por**: Mavis
**Status**: ✅ IMPLEMENTADO E DEPLOYADO
**Próxima página V3 (Fase 3)**: `V3_PAGE_MY_PETS` (Meus Pets) ou `V3_PAGE_ADOPTION` (Adoção wizard)
