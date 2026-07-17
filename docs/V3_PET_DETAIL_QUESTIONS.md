# V3 PetDetail — Perguntas e Análise de Funcionalidades

> **Documento de análise** (2026-07-17, antes da implementação V3)
> Baseado no comando: "vai analisar todos os elementos que devem compor a página... funcionalidade por funcionalidade, detalhe por detalhe, sem pressa"

---

## 1. Análise do código atual (`src/modules/pets/pages/PetDetail.jsx`)

**419 linhas**, importações extensas, muita lógica inline.

### Funcionalidades EXISTENTES (V1 + DS_V2)

| # | Funcionalidade | Linha | Status |
|---|---|---|---|
| 1 | Galeria de fotos (principal + thumbs) | 200-220 | ✅ Funciona |
| 2 | Setas de foto / navegação por thumbs | 213-219 | ✅ Funciona |
| 3 | Badges (espécie, porte, idade, sexo, raça) | 240-247 | ✅ Funciona |
| 4 | Badges de saúde (castrado, vacinado, vermifugado) | 248-250 | ✅ Funciona |
| 5 | Localização (cidade + estado) | 252-257 | ✅ Funciona |
| 6 | Notas de saúde (bloco destaque) | 259-262 | ✅ Funciona |
| 7 | Requisitos para adoção | 264-267 | ✅ Funciona |
| 8 | Link formulário externo | 269-279 | ✅ Funciona |
| 9 | Card do responsável (avatar + chat) | 281-302 | ✅ Funciona |
| 10 | Botão "Quero adotar" (org) / "Tenho interesse" | 348-372 | ✅ Funciona |
| 11 | Compartilhar (com geração de imagem) | 32, 39, 130-136, 379 | ✅ Funciona |
| 12 | Tabs de gestão (interessados, info) | 391-407 | ✅ Funciona |
| 13 | Rating pós-adoção | 410-413 | ✅ Funciona |
| 14 | AdoptionFormFill (modal) | 415-422 | ✅ Funciona |
| 15 | Card explicativo de bloqueio (PET_ADOPTION_GATING) | 358-389 | ✅ Funciona |
| 16 | Ações de gestão (editar, deletar) | 314-336 | ✅ Funciona |
| 17 | Back button | 184-186 | ✅ Funciona |
| 18 | SEO (title, description, image OG) | 178-183 | ✅ Funciona |
| 19 | Skeleton (PetDetailSkeleton) | 142 | ✅ Funciona |
| 20 | NotFound (PetNotFound) | 143 | ✅ Funciona |

### Funcionalidades LACUNARES / FALTANTES (issues identificados)

| # | Lacuna | Impacto | Solução V3 |
|---|---|---|---|
| L1 | **SEM breadcrumb** | User perde contexto de navegação | Breadcrumb Home > Feed > {pet.name} |
| L2 | **SEM mapa** | User não vê onde o pet está | Mapa (Leaflet ou similar) com cidade pinada |
| L3 | **SEM pets similares** | User não tem continuidade no fluxo | Carrossel "Outros pets deste abrigo" |
| L4 | **SEM favoritar persistente** | User não pode salvar pets para ver depois | Botão heart persistente (Firestore) |
| L5 | **SEM reportar** | User não pode denunciar conteúdo impróprio | Botão "Reportar" → modal |
| L6 | **SEM contador de visualizações** | Dono não sabe alcance do pet | Contador discreto "23 pessoas viram" |
| L7 | **SEM tags de temperamento** | Pet pode ser "calmo", "brincalhão" etc | Badges temperament (já tem schema) |
| L8 | **SEM energia/exercício** | Informação crítica para adotantes | Badge "Energia: alta/média/baixa" |
| L9 | **SEM data de castração/vacina** | Adotante quer saber quando foi | Datas + próxima dose |
| L10 | **SEM informações do abrigo (se for org)** | Link para página do abrigo | Card link "Sobre {abrigo}" → /organizacoes/{id} |
| L11 | **SEM história do pet (timeline)** | Adotante quer saber de onde veio | Timeline "Resgatado em X / Vacinado em Y" |
| L12 | **SEM "necessidades especiais"** | Adotante precisa saber | Seção especial se aplicável |
| L13 | **SEM seção "Sobre mim"** | Personalidade do pet | Texto + traits |
| L14 | **SEM collapsible para descrição longa** | Tela fica poluída | Collapsible "Sobre {pet}" |
| L15 | **SEM loading específico para fotos** | Foto aparece vazia até carregar | Skeleton com aspect ratio + blur |
| L16 | **SEM empty state para pet sem fotos** | User vê placeholder feio | EmptyState com SVG viralata |
| L17 | **SEM error state dedicado para carregamento** | Tela branca em erro | ErrorState específico |
| L18 | **SEM dark mode dedicado (além de tokens)** | Imagens claras demais no dark | Backdrop shadow + filter no dark |
| L19 | **SEM breadcrumb JSON-LD** | SEO | Schema.org BreadcrumbList |
| L20 | **SEM "X pessoas viram" com animação** | Engajamento | Counter com motion |
| L21 | **SEM "histórico de mudanças"** | Adotante quer ver updates | Timeline de eventos do pet |
| L22 | **SEM 2-layer tab navigation** | Tab única em mobile | 2-layer se houver sub-tabs |
| L23 | **SEM paginação de fotos (swipe)** | User tem que clicar thumbs | Swipe horizontal na galeria |
| L24 | **SEM zoom nas fotos** | User quer ver detalhes | Click → modal zoom |
| L25 | **SEM descrição "X de Y" nas fotos** | User não sabe quantas | "1 de 5" |
| L26 | **SEM breadcrumb no PetNotFound** | User fica perdido | Voltar ao feed |
| L27 | **SEM verificação de foto consistente** | Layout quebra com 1 foto | Adaptar galeria p/ 1, 2, 3+ fotos |
| L28 | **SEM loading otimista de interesse** | User clica e não vê feedback | Optimistic UI |
| L29 | **SEM animação de entrada da galeria** | Tela aparece abruptamente | FadeIn + scale |
| L30 | **SEM preferências visuais do user** | Não respeita compactMode | Padding ajustável |

### Bugs e Melhorias UX

| # | Bug | Onde | Solução V3 |
|---|---|---|---|
| B1 | `pet.name && pet.title` mostra "Nome: {name}" — confuso se for o mesmo | linha 239 | Se title==name, não mostrar linha |
| B2 | Botão "Voltar" usa navigate(-1) — pode voltar para página errada | linha 184 | Aceitar via prop ou sempre /feed |
| B3 | Galeria `aspect-square` mas pode ter fotos em outros ratios | linha 200 | `aspect-[3/4]` consistente |
| B4 | Sem "carregando" no card do responsável enquanto busca owner | linha 295 | Skeleton específico |
| B5 | `pet.photos?.length > 1` mas só 1 foto fica sem thumbs (bom) | linha 211 | OK |
| B6 | WhatsApp/telefone do responsável NÃO é exibido | - | Adicionar (se aplicável) |
| B7 | Card explicativo de bloqueio aparece SÓ se flag ON | linha 358 | Sempre visível, simplificado |
| B8 | Tabs "Interessados" / "Informações" muito simples | linha 391 | Expandir com mais seções |
| B9 | Rating form aparece SÓ se !myRating — mas não diz se já avaliou | linha 411 | Mostrar avaliação já feita |
| B10 | Sem confirmação visual de "Interesse registrado" no pet | - | Badge persistente + animação |

---

## 2. Pesquisa nos "comandos" — o que foi pedido

Vou olhar o que o user disse no histórico sobre PetDetail:

- **"DS_V2_PAGES-PETS"** — flag foi criada (TASK-704 + 7 tasks), mas auditoria só — refactor real
- **"Quero adotar"** vs "Tenho Interesse" — distinção para org vs user
- **"Adoção responsável"** — sempre reforçar mensagem
- **"Compatibilidade"** — perfil do adotante + pet (filtro comportamental)
- **"NotFound"** — tratamento de pet inexistente
- **"Compartilhamento"** — gerar imagem de share

---

## 3. Q&A para o user (decisões de design)

### Q1 — Layout: 2 colunas (V1) ou 1 coluna (mobile-first)?

V1 é `grid-cols-1 md:grid-cols-2 gap-8` com galeria à esquerda e info à direita.

V3 (mobile-first):
- **Mobile**: 1 coluna, galeria full-width, info embaixo
- **Tablet/Desktop**: galeria sticky à esquerda, info à direita

V3: **SIM, mobile-first com 2 colunas em md+**. Galeria **sticky** no desktop para não perder contexto ao rolar.

### Q2 — Galeria: setas + thumbs OU swipe + thumbs?

V1: só thumbs. **Sem swipe**.

V3: **swipe horizontal + setas + thumbs + zoom on click**.

### Q3 — Mapa: SIM ou NÃO?

V3: **SIM, mapa com pin da cidade** (Leaflet com OpenStreetMap, gratuito). Cidade já está no schema. Sem geocoding real, usa cidade conhecida.

### Q4 — Pets similares: carrossel abaixo?

V3: **SIM, "Outros pets deste responsável"** — pega 4 pets do mesmo `owner_id`, exclui o atual. Filtra por `status === 'available'`. Carrossel horizontal (scroll-x) com PetCard.

### Q5 — Favoritar: onde fica o botão?

V3: **Heart no canto superior da galeria** (compartilha posição com "Voltar"). Firestore: `users/{uid}.favorites` (array de petIds). Botão preenchido quando favoritado.

### Q6 — Reportar: onde?

V3: **Menu kebab (...)** no canto superior da info. Opções: Reportar, Compartilhar, Copiar link.

### Q7 — Timeline do pet: o que mostrar?

V3: **Histórico de eventos** (se houver):
- Cadastrado em X
- Resgatado em Y
- Vacinado em Z
- Castrado em W
- Status mudou (em processo, adotado)

Se pet tem `events[]` no Firestore, renderiza. Senão, esconde a seção.

### Q8 — Temperamento: como mostrar?

V3: **Badges com ícones** (Sora icons):
- Calmo 😌, Brincalhão 🎾, Tímido 🙈, Sociável 🤗, Energético ⚡
- Até 5 traits, baseados em `pet.temperament` (array de strings)

### Q9 — "Sobre mim": Collapsible ou sempre aberto?

V3: **Collapsible "Sobre {nome}"** com FadeIn. Default fechado. Match com CollapsibleCard do Feed.

### Q10 — Dark mode: ajuste específico?

V3: **Backdrop shadow mais forte no dark** + `saturate(0.8)` no `img` para fotos não ofuscarem.

### Q11 — Card de bloqueio: quando mostrar?

V3: **Sempre visível** se há motivos, mas com design mais limpo (sem flag). Apenas ícones neutros.

### Q12 — Avaliação: user pode ver nota do pet?

V3: **SIM**, estrelas médias do pet (se houver ratings). Mostra abaixo do título: "★★★★☆ 4.3 (12 avaliações)".

### Q13 — Breadcrumb: qual estrutura?

V3: **Home > Feed > {Pet name}** (clicaveis). Schema.org BreadcrumbList para SEO.

### Q14 — Imagens: quantas? Como organizar?

V3: **Hero full-width (3:4) + thumbs (square 1:1)** embaixo. Suporte para 1, 2, 3+ fotos. Se 1 foto: sem thumbs. Se 2: grid 2 col. Se 3+: scroll-x.

### Q15 — Bottom CTA: fixo ou inline?

V3: **Inline no info section** (mantém o padrão V1), mas com **sticky bottom em mobile** (se houver intenção de ação). Em desktop: inline normal.

---

## D — Decisões de design (default)

- **D1**: Galeria em 3:4 (não 1:1) — melhor para fotos de pets em pé
- **D2**: Mapa: Leaflet com OpenStreetMap (gratuito) e tile cinza claro (harmonia DS)
- **D3**: Favoritar: save em `users/{uid}.favorites: string[]`
- **D4**: Similar pets: 4 do mesmo `owner_id`, ordem por `createdAt desc`
- **D5**: Temperamento: ícones Sora (não emojis), 5 traits max
- **D6**: Avaliação: estrelas + count + "Ver avaliações" link
- **D7**: Breadcrumb: 3 níveis (Home > Feed > Pet)
- **D8**: Sticky bottom CTA em mobile (apenas com ação disponível)
- **D9**: Skeleton específico com aspect-ratio 3:4
- **D10**: EmptyState quando pet sem fotos (SVG viralata)
- **D11**: ErrorState com retry (component dedicado)
- **D12**: 2-layer tabs se houver sub-tabs (ainda não há)

---

## Resumo do escopo V3

**Total de features V3** (implementação real):
- 20 features V1 (mantidas e melhoradas)
- 12 features NOVAS (galeria swipe, mapa, pets similares, favoritar, reportar, timeline, temperamento, avaliação visível, breadcrumb, contador, sticky CTA, dark mode específico)
- 10 correções de bug/UX
- ~2-3 dias de trabalho

**Reuso de componentes V3 já criados**:
- `<Skeleton>` / `<Skeleton.Grid>` (7 variants)
- `<EmptyState>` (2 botões)
- `<ErrorState>` (refator)
- `<CollapsibleCard>`
- `<PaginationControls>` (se necessário)
- `<FilterChipsRow>` (para temperamento?)
- `<AdSlot>` (Espaço de Parceiros)
- `useUrlFilters` (se houver query params)
- `useUiPreferences` (compactMode)
- `useColorMode` (dark mode)
- `useReducedMotionSafe`
- `useViewport` (responsivo)
- `useFeedPreferences` (reused pattern para favorites)

**Novos componentes a criar**:
- `<PetGallery>` (swipe + thumbs + zoom)
- `<PetMap>` (Leaflet)
- `<PetSimilar>` (carrossel)
- `<PetFavoriteButton>`
- `<PetReportButton>`
- `<PetBreadcrumb>`
- `<PetTemperament>`
- `<PetRatingSummary>`
- `<PetTimeline>` (eventos)
- `<PetStickyCta>` (mobile)

---

**Próximo passo**: aguardar user responder Q&A ou seguir com D (defaults) e implementar.
