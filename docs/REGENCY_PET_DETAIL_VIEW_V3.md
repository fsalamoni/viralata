# REGENCY · PetDetailView V3 — Página pública de visualização de pet

> Documento de regência do redesign V3 da página pública de visualização de
> um pet (`/pet/:petId`, singular). Define propósito, comportamento,
> arquitetura, regras de segurança, testes e critérios de aceitação.

- **SCRUM parent**: TASK-V3-PET-DETAIL-VIEW
- **PR**: (preencher quando commitado)
- **Flag**: `PET_DETAIL_VIEW_V1` (default ON)
- **Rota pública**: `/pet/:petId` (singular, sem 's')
- **Rota admin** (separada): `/pets/:petId` (plural) — `PetDetailV3` (com 4 abas)
- **Implementado em**: 2026-07-20
- **Versão SW**: v67

---

## 1. Propósito e contexto

A página `/pet/:petId` (singular) é a porta de entrada de **adotantes
interessados**. O usuário chega por compartilhamento, feed, busca, ou redes
sociais. O objetivo é:

1. **Atr** — a primeira impressão precisa ser visualmente impactante e
   emocionalmente convidativa. O pet é o protagonista.
2. **Informar com clareza** — espécie, porte, idade, sexo, cidade, saúde,
   personalidade, requisitos do lar, descrição do responsável.
3. **Facilitar a ação** — um clique leva ao "Quero adotar" (login se
   necessário) ou "Falar com o responsável".
4. **Nunca vazar permissões** — botões de editar/excluir/administrar NÃO
   EXISTEM para quem não é gestor. Essa é a razão de ser desta página.

Esta página **separa claramente** o que é público do que é admin:

- **Público (esta página)**: `/pet/:petId` (singular) — `PetDetailView` V3
- **Admin (já existia)**: `/pets/:petId` (plural) — `PetDetailV3` (4 abas)

A motivação do user foi explícita:

> "Os usuários que não são donos dos pets disponíveis, que não criaram
> esses pets, que não adotaram esses pets, que não possuem atribuição de
> abrigo que está vinculada ao pet não pode ter o botão 'editar' e
> 'excluir' visível e disponível para clicar. Esses usuários não devem
> ter o poder de editar ou excluir pets de outros usuários e abrigos."

> "A página do pet da forma como está agora deve ser a página de admin
> do pet, com acesso exclusivo aos usuários citados."

> "Criar uma nova página de visualização do pet, completamente apropriada
> a função de chamar a atenção dos interessados e de fazer com que eles
> gostem e queiram o pet que estão olhando, com as informações (que
> existem) disponíveis e apresentadas de forma clara e facilitada, uma
> página só, sem abas."

---

## 2. Decisões de arquitetura (D-)

- **D-PET-PUBLIC-V3-FLAG (NEW)**: flag exclusiva `PET_DETAIL_VIEW_V1`,
  separada de `V3_PAGE_PET_DETAIL` (que é a flag da página de ADMIN).
  Default ON. Toggle via Painel Master de Feature Flags.

- **D-PET-PUBLIC-NO-TABS (NEW)**: a página pública **NÃO TEM ABAS**.
  Tudo em uma página só, organizado em seções verticais com scroll.
  Justificativa: o objetivo é "convencer" — visitor deve ver TUDO sem
  precisar clicar. Abas criam fricção cognitiva.

- **D-PET-PUBLIC-CTA (NEW)**: o botão "Administrar este pet" aparece
  **SOMENTE** se `usePetPermissions(pet).canEdit === true`.
  Leva para `/pets/:petId` (página admin, com abas).

- **D-PET-PUBLIC-DO-ZERO (NEW)**: a página foi criada **DO ZERO** no padrão
  DS-V2, sem aproveitar `PetDetailV3.jsx`. JSX é novo; hooks V1
  (`usePetPermissions`, `useAuth`) são reusados porque encapsulam regras
  de domínio.

- **D-PET-PUBLIC-LAZY-01**: a página é carregada via `React.lazy()` +
  Suspense. Wrapper `PetDetailView.jsx` resolve V1/V3 com base na flag
  (igual aos outros V3 do projeto). Justificativa: D-VITE-LAZY-01.

- **D-PET-PUBLIC-SEM-SECRETS (NEW)**: NUNCA expor
  - clinical_notes
  - histórico médico completo (medicações, consultas, tratamentos)
  - lista de interessados
  - devoluções
  - adotantes anteriores (dados pessoais)
  - localização exata do resgate
  - informações do tutor original
  Apenas dados públicos, conforme LGPD Art. 7 §1 (mínimo necessário).

- **D-PET-PUBLIC-STICKY (NEW)**: em mobile, o CTA "Quero adotar" fica
  fixo no rodapé. Em desktop, fica dentro do card de ação. Justificativa:
  padrão de UX para mobile commerce (reduz fricção na decisão).

- **D-PET-PUBLIC-REPORT (NEW)**: link "Reportar este anúncio" sempre
  visível, leva para `/denuncias/nova?pet=:petId`. Reforça confiança.

---

## 3. Feature flag

### `PET_DETAIL_VIEW_V1`

| Atributo | Valor |
|---|---|
| **Chave** | `pet_detail_view_v1` |
| **Label** | V3 · Visualização pública de pet (/pet/:petId) |
| **Description** | Página PÚBLICA de visualização de um pet (sem abas, sem botões de gestão). Apresenta o pet de forma atraente. Botão "Administrar" só para quem tem permissão de gestão. |
| **Default** | **ON** (TASK-V3-PET-DETAIL-VIEW, user pediu "todas as flags ON") |
| **Local** | `src/core/featureFlags.js` (FEATURE_FLAG, FEATURE_FLAG_META, DEFAULT_FEATURE_FLAGS) |
| **Toggle** | Painel Master de Feature Flags (`/admin/feature-flags`) |
| **Fallback UI** | Skeleton do hero (lightbox) + 3 cards skeleton |

Quando OFF, cai no V1 (legado): `PublicPet.jsx`. Wrapper resolve via
`useFeatureFlag(FEATURE_FLAG.PET_DETAIL_VIEW_V1)`.

---

## 4. Estrutura de arquivos

```
src/modules/pets/pages/
├── PetDetail.jsx              # wrapper V3 admin (com canManage + ProtectedRoute)
├── PetDetail.v1.jsx           # legacy V1 (preserva)
├── PetDetailV3.jsx            # V3 ADMIN (4 abas) — FICA como está
├── PublicPet.jsx              # V1 legacy público (preserva como PetDetailView.v1)
├── PublicPet.test.jsx         # tests do V1
├── PetDetailView.v1.jsx       # wrapper V1 → re-exporta PublicPet
├── PetDetailView.v3.jsx       # ⭐ V3 NOVO — página pública sem abas
└── PetDetailView.jsx          # ⭐ WRAPPER — lazy + flag

src/App.jsx                    # rota /pet/:petId → PetDetailView
```

---

## 5. Layout (DS-V2)

### Mobile (default, < 640px)

```
┌─────────────────────────────────────────┐
│ [← Voltar]          [Share] [Social]    │ ← topbar flutuante sobre hero
├─────────────────────────────────────────┤
│                                         │
│           ┌─────────────────┐           │
│           │                 │           │
│           │  Foto principal │           │ ← aspect 4:3
│           │   (lightbox)    │           │
│           │                 │           │
│           │  [Disponível]   │           │ ← badge canto sup. esq
│           └─────────────────┘           │
│                                         │
│   [thumb][thumb][thumb][thumb]          │ ← só se photos > 1
├─────────────────────────────────────────┤
│ 🐕  Rex                                  │ ← IdentityCard
│     Pastor Alemão · Grande · Adulto     │
│     [📍 SP] [🎂 2 anos] [⚖️ 30kg]       │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Sobre                               │ │
│ │ Rex é um cachorro...                │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Personalidade                       │ │
│ │ [Brincalhão][Carinhoso][Tímido]     │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Saúde                               │ │
│ │ [✓ Vacinação] [✓ Castrado] [...]    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Lar ideal                           │ │
│ │ • Precisa de quintal                │ │
│ │ • Sem crianças pequenas             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Responsável: Abrigo A               │ │ ← só se ONG
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Localização: São Paulo, SP          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Características                     │ │
│ │ Espécie: Cachorro  │ Porte: Grande  │ │
│ │ Idade: Adulto     │ Sexo: Macho    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Identificação                       │ │
│ │ VLT-000123                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [♥ Quero adotar]                    │ │ ← CTA Card
│ │ [💬 Falar com o responsável]         │ │
│ │ [🔒 Administrar] (só canManage)     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│    Reportar este anúncio                │
│                                         │
└─────────────────────────────────────────┘
│ [♥ Quero adotar] [💬] [🔒?]            │ ← STICKY CTA (mobile)
└─────────────────────────────────────────┘
```

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│ [← Voltar]                                    [Share] [Social]│
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │              Foto principal (16:10)                    │  │
│  │                                                        │  │
│  │  [Disponível]                                          │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  [thumb][thumb][thumb][thumb]                                │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌──────────────────┐  │
│  │ 🐕 Rex                          │  │ Responsável      │  │
│  │  ...                            │  │ [Abrigo A]       │  │
│  └────────────────────────────────┘  └──────────────────┘  │
│  ┌────────────────────────────────┐  ┌──────────────────┐  │
│  │ Sobre                          │  │ Localização      │  │
│  │ ...                            │  │ São Paulo, SP    │  │
│  └────────────────────────────────┘  └──────────────────┘  │
│  ┌────────────────────────────────┐  ┌──────────────────┐  │
│  │ Personalidade                  │  │ Características  │  │
│  │ ...                            │  │ Espécie, Porte,  │  │
│  └────────────────────────────────┘  │ Idade, Sexo      │  │
│  ┌────────────────────────────────┐  └──────────────────┘  │
│  │ Saúde                          │  ┌──────────────────┐  │
│  │ ...                            │  │ Identificação    │  │
│  └────────────────────────────────┘  │ VLT-000123       │  │
│  ┌────────────────────────────────┐  └──────────────────┘  │
│  │ Lar ideal                      │  ┌──────────────────┐  │
│  │ ...                            │  │ ✓ Adoção resp.   │  │
│  └────────────────────────────────┘  └──────────────────┘  │
│  ┌────────────────────────────────┐                         │
│  │ [♥ Quero adotar]               │                         │
│  │ [💬 Falar com responsável]      │                         │
│  │ [🔒 Administrar] (só canManage)│                         │
│  └────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Componentes e responsabilidades

| Componente | Responsabilidade | Onde mora |
|---|---|---|
| `PetDetailViewV3` | Página completa, orquestra todos os sub-componentes | `pages/PetDetailView.v3.jsx` |
| `PetDetailViewHero` | Foto em destaque, status badge, thumbs, top bar | (interno) |
| `PetIdentityCard` | Nome, espécie, badges de características | (interno) |
| `PetAboutCard` | Descrição completa | (interno) |
| `PetTemperamentCard` | Tags de personalidade | (interno) |
| `PetHealthCard` | Vacinação, castração, vermifugação (PÚBLICO) | (interno) |
| `PetRequirementsCard` | Lar ideal (com base em flags do schema) | (interno) |
| `PetCtaCard` | Quero adotar / Falar / Administrar / Compartilhar | (interno) |
| `PetStickyCtaView` | Bottom CTA no mobile | (interno) |
| `OwnerCard` | Card do abrigo (se pet é ONG) | (interno) |
| `PetLocationCard` | Cidade / UF / bairro | (interno) |
| `PetQuickFactsCard` | Espécie / Porte / Idade / Sexo / Peso | (interno) |
| `PetIdCard` | pet_code, microchip (se houver) | (interno) |
| `PetTrustBadge` | Badge "adoção responsável" (LGPD) | (interno) |
| `Lightbox` | Visualizador fullscreen da galeria | `components/Lightbox.jsx` |
| `Seo` | OG tags para preview social | `components/Seo.jsx` |
| `SocialShare` | Compartilhar (Web Share + fallback) | `components/SocialShare.jsx` |

---

## 7. Regras de segurança — defense-in-depth (3 camadas)

### Camada 1: UI (esta página)

```js
const petPermissions = usePetPermissions(pet);
const canManage = petPermissions.canEdit;
// Renderiza o botão "Administrar" SÓ se canManage
{canManage && <Button>Administrar este pet</Button>}
```

**Para usuário anônimo**: `canManage === false` sempre (sem `useAuth().user`).
**Para usuário comum** (não-dono, não-membro do abrigo): `canManage === false`.
**Para criador do pet** (`owner_id === user.uid`): `canManage === true`.
**Para membro do abrigo com permissão `animals`**: `canManage === true`.
**Para platform admin**: `canManage === true`.

### Camada 2: Service (já implementado)

- `ensureCanMutatePet(petId, actor)` em `petService.js` — checa no Firestore
  se o user pode mutar.
- Chamado em TODA escrita de pet (create, update, delete).
- Veja BUG-17, BUG-19, BUG-31.

### Camada 3: Firestore rules (já implementado)

- `canManagePet(petData)` helper em `firestore.rules` linha 110-115.
- `pets/{petId}` só permite update/delete se `canManagePet(petData)`.
- Subcoleções (medications, vet_visits, etc) só permitem write se
  `canManagePet(petData)`.

**A página pública (esta) NÃO TEM camada de escrita** — é read-only. Mas
se algum dia adicionar botão de edição acidental, a defesa de 3 camadas
irá bloquear o request.

---

## 8. Permissões (defense-in-depth)

### Quem pode ver a página
- **Qualquer visitante**, autenticado ou não.
- Rota: `/pet/:petId` (singular, sem 's').
- Layout: NÃO tem `ProtectedRoute`.

### Quem pode ver o botão "Administrar este pet"
- `usePetPermissions(pet).canEdit === true`, ou seja:
  - User é platform admin, OU
  - User é dono do pet (`owner_id === user.uid`), OU
  - User é membro do abrigo (`hasClubPermission('animals')` para o clube
    dono do pet).

### Quem pode adotar
- **Anônimo**: clica "Quero adotar" → salva URL em `sessionStorage` →
  redireciona para `/login`. Após login, volta para `/quero-adotar/:petId`.
- **Logado** (qualquer user, sem restrição de permissão): vai para
  `/quero-adotar/:petId` (fluxo de adoção).

### Quem pode falar com o responsável
- **Anônimo**: login primeiro.
- **Logado**: vai para `/pets/:petId` (se for ONG) ou `/chat?pet=:petId`
  (se for pet pessoal).

### Quem pode reportar
- **Qualquer visitante**. Link `/denuncias/nova?pet=:petId`.

---

## 9. Dados exibidos vs. ocultos

### ✅ Exibidos (público)
- Nome / title
- Espécie, raça, porte, idade, sexo, peso
- Cidade, UF, bairro (se público)
- Descrição (`description`)
- Saúde pública (vacinação, castração, vermifugação)
- Personalidade (`temperament` / `personality`)
- Requisitos do lar (`needs_yard`, `good_with_kids`, etc)
- Status (disponível, em processo, adotado)
- Nome do abrigo (se for ONG)
- pet_code (ex: VLT-000123) — útil para matching
- microchip (se houver) — útil para verificação veterinária
- Fotos (galeria)
- Status de avaliação (ex: `evaluation_status` se público)

### ❌ Ocultos (admin only)
- `clinical_notes`
- Histórico médico completo (medicações, consultas, tratamentos, cuidado)
- Lista de interessados
- Devoluções
- Histórico de adotantes (LGPD — dados pessoais)
- Localização exata do resgate
- ID do tutor original
- pet_code PRIVADO (se houver `national_pet_id` separado)
- Lista de pet_radars (quem busca esse perfil)
- Aprovações internas / moderação

---

## 10. Estados da UI

| Estado | UI |
|---|---|
| Loading | Skeleton com hero gradient + 3 cards placeholder |
| Not found (404) | Tela de "Pet não encontrado" com CTA "Ver feed" |
| Adopted | CTA "Quero adotar" fica desabilitado, diz "Já foi adotado" |
| In process | CTA "Quero adotar" desabilitado, diz "Em processo" |
| Sem fotos | Hero com emoji da espécie em gradient suave |
| Sem descrição | Seção "Sobre" não renderiza |
| Sem personalidade | Seção "Personalidade" não renderiza |
| Sem requisitos | Seção mostra "Adapta-se bem a diferentes lares" |
| Pet pessoal (não ONG) | Card "Responsável" não renderiza |
| canManage=true | Botão "Administrar" visível, leva para `/pets/:petId` |
| canManage=false | Botão "Administrar" NÃO EXISTE no DOM |

---

## 11. Acessibilidade (WCAG AA)

- Imagens com `alt` (nome do pet)
- Lightbox com ARIA (`aria-label`, foco trap, ESC fecha)
- Botões com contraste mínimo 4.5:1
- Foco visível em todos os botões (focus ring 2px primary)
- Navegação por teclado: Tab navega por thumbs → CTA → Sticky CTA
- `prefers-reduced-motion`: desativa animações do `framer-motion`
- Textos não dependem apenas de cor (ícones + texto)
- Tamanhos de toque ≥ 44x44px (mobile)
- Sticky CTA no mobile NÃO esconde conteúdo (overlay translúcido)

---

## 12. Performance

### Bundle
- Wrapper: `PetDetailView-<hash>.js` (~3KB)
- V3 lazy: `PetDetailView.v3-<hash>.js` (~22KB raw, ~7KB gzipped)
- V1 lazy: `PetDetailView.v1-<hash>.js` (~5KB)

### Cache
- SW version bump: v66 → v67
- `cleanupStaleCaches.js`: v67 atual, v66 stale
- `registerPwa.js`: v67

### Lazy load
- `React.lazy()` + `<Suspense>` no wrapper.
- `useFeatureFlag` resolve client-side, sem server roundtrip.

### Images
- Hero `<img loading="eager">` (LCP).
- Thumbs `<img loading="lazy">`.
- `aspect-ratio` no container para evitar CLS.

---

## 13. Testes

### Testes a serem adicionados (sugestão — TBD)

- **Render**: smoke test que renderiza com pet mock
- **Empty state**: pet não existe → tela 404
- **No photos**: hero mostra emoji
- **Adopted**: CTA desabilitado
- **canManage=false**: botão Administrar NÃO EXISTE
- **canManage=true**: botão Administrar EXISTE e leva para `/pets/:petId`
- **Anônimo + "Quero adotar"**: redireciona para `/login`
- **Logado + "Quero adotar"**: vai para `/quero-adotar/:petId`
- **Mobile sticky**: sticky CTA visível em viewport < 1024px
- **Lightbox**: abre ao clicar na foto, fecha com ESC
- **Flag OFF**: renderiza V1 (PublicPet)
- **Flag ON**: renderiza V3 (PetDetailViewV3)

### Critérios de aceitação visuais
- Layout responsivo funciona em 360px, 768px, 1024px, 1280px
- Sem tabs em nenhum breakpoint
- Foto do pet ocupa posição de destaque no hero
- Botão "Administrar" só aparece para `canManage=true`
- Sticky CTA no mobile não sobrepõe conteúdo crítico

---

## 14. Critérios de aceitação (verificação)

### Functional
- [x] Rota `/pet/:petId` (singular) renderiza `PetDetailView`
- [x] Rota `/pets/:petId` (plural) renderiza `PetDetailV3` (admin)
- [x] Flag `PET_DETAIL_VIEW_V1` default ON
- [x] Flag OFF → fallback V1 (`PublicPet`)
- [x] Botão "Administrar" SÓ visível para `canManage=true`
- [x] Botão "Quero adotar" funciona (login → /quero-adotar/:petId)
- [x] Botão "Falar com responsável" funciona (login → chat/admin)
- [x] Compartilhar funciona (Web Share + clipboard fallback)
- [x] Lightbox abre/fecha
- [x] Reportar leva para `/denuncias/nova?pet=:petId`
- [x] Pet pessoal NÃO mostra card "Responsável"
- [x] Pet ONG mostra card "Responsável" com link para `/abrigos/:id`

### Não-functional
- [x] Sem abas
- [x] Sem dados sensíveis (LGPD)
- [x] WCAG AA (contraste, ARIA, focus, reduced-motion)
- [x] Mobile responsive
- [x] Lazy + Suspense
- [x] Cache version v67
- [x] Build passa (vite build)

### Negative (anti-patterns evitados)
- [x] **NÃO** reaproveita JSX de `PetDetailV3` (criado do zero)
- [x] **NÃO** tem botão de editar no DOM quando canManage=false
- [x] **NÃO** expõe dados sensíveis (clinical_notes, history)
- [x] **NÃO** tem `ProtectedRoute` (página é pública)
- [x] **NÃO** quebra `PetDetailV3` (admin) — feature flag independente

---

## 15. Referências e mudanças

### Arquivos criados (3)
- `src/modules/pets/pages/PetDetailView.v3.jsx` (40KB)
- `src/modules/pets/pages/PetDetailView.v1.jsx` (298B)
- `src/modules/pets/pages/PetDetailView.jsx` (2.3KB)
- `docs/REGENCY_PET_DETAIL_VIEW_V3.md` (este)

### Arquivos editados (3)
- `src/App.jsx` — rota `/pet/:petId` aponta para `PetDetailView`
- `src/core/featureFlags.js` — flag `PET_DETAIL_VIEW_V1` (3 entradas)
- (v67 cache) `src/core/pwa/cleanupStaleCaches.js`, `src/core/pwa/registerPwa.js`, `vite.config.js`

### Referências internas
- `src/modules/pets/hooks/usePetPermissions.js` — hook canManage
- `src/modules/pets/pages/PetDetailV3.jsx` — admin (4 abas)
- `src/modules/pets/pages/PublicPet.jsx` — V1 legacy (preservado)
- `src/components/Lightbox.jsx` — lightbox
- `src/core/lib/FeatureFlagsContext.jsx` — useFeatureFlag
- `docs/REGENCY_PET_DETAIL_V3.md` — regência da admin page
- `docs/REGENCY_PET_DETAIL_V3.md` (admin) — para diff entre admin vs público

### Comandos de verificação
```bash
# Build
npm run build

# Verificar flag default
grep "PET_DETAIL_VIEW_V1" src/core/featureFlags.js

# Verificar rota
grep "pet/:petId" src/App.jsx

# Verificar botão Administrar tem canManage
grep "canManage" src/modules/pets/pages/PetDetailView.v3.jsx

# Verificar que /pets/:petId (admin) não foi tocado
grep "PetDetail" src/App.jsx
```

### Próximos passos (opcional)
- Adicionar testes E2E (Playwright) para cenário canManage=true vs false
- Adicionar testes de unidade para `PetCtaCard` (renderiza condicional)
- Adicionar analytics: "Quero adotar" click, "Administrar" click
- Adicionar compartilhamento com imagem gerada (TASK-XXX)
