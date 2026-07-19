# Documento de Regência — CHAT V3

> **Status**: ✅ DEPLOYED (TASK-V3-CHAT)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | CHAT |
| Rota | `/chat` |
| Componente V3 | `src/modules/chat/pages/ChatPage.v3.jsx` (26KB) |
| Wrapper | `src/modules/chat/pages/ChatPage.jsx` (escolhe V3 ou V1 via flag) |
| Fallback V1 | `src/modules/chat/pages/ChatPage.v1.jsx` (mantido, 167 linhas) |
| Flag V3 | `V3_PAGE_CHAT` (default OFF) |
| Auth | Requer autenticação (preview mode se !isAuthAvailable) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_CHAT) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Listar conversas | Conversas visíveis | 100% |
| O2 | Conversão para abrir conversa | Cliques em cards | ≥ 60% |
| O3 | Filtragem eficiente | Uso de filtros | ≥ 30% |
| O4 | Conversão para nova conversa | Cliques "Nova" | ≥ 10% |
| O5 | Real-time updates | `useConversations` | ativo |
| O6 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO exigir login para VER conversas (preview mode)
- **AO2**: NÃO esconder filtros atrás de menu
- **AO3**: NÃO misturar conversas diretas com grupos sem distinção

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradient: sky-500 → indigo-600 → violet-600
- Badge "Suas conversas" com MessageCircle
- H1: "Chat"
- Descrição
- CTA: "Nova conversa"
- 3 stat cards decorativos (desktop): Total / Diretas / Não lidas
- Mobile: 3 stat cards horizontais abaixo

### S2 — Stats (mobile)
- 3 stat cards: Total (primary), Diretas (sky), Não lidas (amber)

### S3 — Preview mode
- Alerta amber (se !isAuthAvailable em DEV)

### S4 — Filtros + Busca
- 4 chips: Todas / Diretas / Grupos / Não lidas (com contagem)
- Input de busca com clear button
- Contador contextual: "X conversas encontradas (não lidas)"

### S5 — Lista de conversas
- 4 cards skeleton
- Empty state rico: "Comece uma conversa" + CTA "Nova conversa"
- Empty state com filtro: "Nenhuma conversa encontrada" + "Limpar filtros"
- Grid 1/2 colunas de cards
- Cada card:
  - Avatar (UserAvatar OU gradient group)
  - Unread badge (top-right, se unread > 0)
  - Title + timestamp (relative)
  - Last message preview (com sender name se grupo)
  - Badge "Grupo" se for grupo
  - Pin icon se pinned
  - ChevronRight hover

### S6 — Conversation view (quando ativa)
- Botão "Voltar" (mobile only)
- ChatWindow com ConversationList + ChatComposer
- URL state: `?c=:conversationId`

### S7 — CTA Final (se tiver conversas)
- Gradient sky → indigo → violet
- H2: "Conecte-se com a comunidade"
- 1 CTA: "Iniciar nova conversa"

### Loading
- 6 cards skeleton

### Error
- AlertCircle + "Erro ao carregar conversas" + retry

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | "Chat" |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Conecte-se com a comunidade" |
| H3 (card) | `text-sm font-semibold` | Título da conversa |
| Body | `text-sm` | Texto geral |
| Description | `text-xs` | Last message preview |
| Stats | `text-2xl sm:text-3xl` | Números de stats |
| Timestamp | `text-[10.5px]` | "5 min" / "2h" |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-sky-500 via-indigo-600 to-violet-600`

### CTA Final gradient:
- `from-sky-50 via-indigo-50 to-violet-50`
- Dark: `from-sky-950/20 via-indigo-950/10 to-violet-950/20`

### Stats (mobile):
- primary (Total) / sky (Diretas) / amber (Não lidas)

### Group avatar:
- `from-indigo-500 to-violet-600` (gradient)

### Unread badge:
- `bg-primary text-primary-foreground`

### Preview mode:
- `bg-amber-50 text-amber-950`
- Dark: `bg-amber-950/30 text-amber-200`

### Erro:
- `border-destructive/30 bg-destructive/5`

---

## 5. Estados Comportamentais

### Loading
- 6 cards skeleton (grid 1/2 colunas)

### Error
- Card vermelho com AlertCircle + retry button
- Botão "Tentar de novo" chama `refetch()`

### Empty (total)
- EmptyChatHero com ícone grande + "Comece uma conversa" + CTA
- Mostra mesmo se tem filtros, mas com variant diferente

### Empty (com filtro)
- EmptyState padrão + "Limpar filtros"

### Filtros
- 4 chips: Todas / Diretas / Grupos / Não lidas
- Click altera active state
- Contagem em cada chip (se > 0)

### Busca
- Debounce? NÃO (V1 não tem, mantém consistente)
- Filtra por title OU last message
- Clear button (X) quando search tem valor

### Preview mode (sem auth)
- Alerta amber visível
- EmptyChatHero ainda aparece

### Conversation view
- URL state: `?c=:id`
- Back button (mobile only, lg:hidden)
- ChatWindow com ConversationList e ChatComposer

### Real-time
- `useConversations` assina via `subscribeToConversations`
- Atualiza em tempo real (Firestore)

### Mobile
- Stack vertical
- Stats em grid 3 colunas
- Cards em 1 coluna
- Botão "Voltar" visível em conversation view

### Desktop
- Hero 2 colunas
- Stats 1+2 cards no hero
- Cards em grid 2 colunas
- Conversation view full-width

### Dark mode
- Background gradient mantém
- Badges com versões dark
- Cards `bg-card` adaptam
- CTA Final com tokens dark

### Reduced motion
- Animações staggered no hero + stats + lista
- Initial y: 8 em conversation view
- whileInView no CTA Final

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~26KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico
- `useMemo` para filteredConversations, stats, selectedConversation
- `useCallback` para selectConversation, handleCreate
- Real-time via Firestore listener (sem polling)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` + `<motion.section>` |
| Filter chips | `<button>` com `aria-pressed` |
| Cards | `<button type="button">` com `data-testid` |
| Contador | `role="status" aria-live="polite"` |
| Error state | AlertCircle + retry |
| Preview mode | `<div role="alert">` (já existia no V1) |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `WebPage` schema |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Chat — Viralata</title>
<meta name="description" content="Suas conversas com pessoas e grupos da comunidade Viralata." />
```

- **Canonical**: `/chat`
- **JSON-LD**: `WebPage` schema
- **Open Graph**: `og:title` "Chat — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useConversations` (useChat) | Lista de conversas | ✅ Reusado |
| `useChatActions` (useChat) | Criar conversa | ✅ Reusado |
| `conversationTitle` (chat domain) | Título da conversa | ✅ Reusado |
| `ConversationList` (chat) | Componente (legado) | ✅ Reusado |
| `ChatWindow` (chat) | Janela (legado) | ✅ Reusado |
| `NewChatDialog` (chat) | Dialog de nova conversa | ✅ Reusado |
| `parseTimestamp` (util) | Datas relativas | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | Auth state | ✅ Reusado |
| `useToast` | Feedback | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `UserAvatar`, `EmptyState`, `Skeleton` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 6 (UserAvatar, EmptyState, Skeleton, Badge, Button, Input, Seo)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Sem auth (DEV) | Preview mode + EmptyChatHero |
| Sem conversas | EmptyChatHero |
| Com filtro sem matches | "Nenhuma conversa encontrada" |
| Erro de rede | Error state com retry |
| Conversa selecionada via URL | View = 'conversation' |
| Mobile em conversation | Botão "Voltar" visível |
| Back button (mobile) | selectConversation(null) → view = 'list' |
| Click em conversa | Atualiza URL `?c=:id` |
| Group conversation | Avatar gradient + badge "Grupo" |
| Pinned conversation | Pin icon visível |
| Unread > 99 | Badge mostra "99+" |
| search.clear() | Filtros de busca resetam |
| Filter com search | Combina lógica |
| Anexo (sem text) | "Anexo" italic |
| Last sender em grupo | "Nome: mensagem" |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/chat/pages/ChatPage.v3.test.jsx`: render, filtros, seleção, error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 3 colunas
- [x] Tablet 768px: cards 1 coluna
- [x] Desktop 1280px: hero 2 colunas, stats no hero
- [x] Dark mode: tokens trocam
- [x] Filtros: 4 chips funcionam
- [x] Busca: filtra por nome/mensagem
- [x] Empty (sem conversas): EmptyChatHero
- [x] Empty (com filtro): CTA "Limpar filtros"
- [x] Conversation view: aparece com URL state
- [x] Back button (mobile): volta para lista
- [x] Loading: skeleton
- [x] Error: retry funciona
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Conversas visíveis | GA4 page view | 100% |
| Cliques em cards | GA4 event | ≥ 60% |
| Uso de filtros | GA4 event | ≥ 30% |
| Cliques "Nova" | GA4 event | ≥ 10% |
| Real-time updates | Firestore | ativo |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-CHAT-V3-01..10)

| ID | Decisão | Justificativa |
|---|---|---|
| D-CHAT-V3-01 | Hero impactante com gradient sky-indigo-violet | Match com Login (auth context) |
| D-CHAT-V3-02 | 3 stat cards (Total/Diretas/Não lidas) | Visão geral rápida |
| D-CHAT-V3-03 | 4 chips de filtro (Todas/Diretas/Grupos/Não lidas) | Discovery rápido |
| D-CHAT-V3-04 | Cards de preview com avatar + unread + last msg | Scan visual rápido |
| D-CHAT-V3-05 | Group avatar gradient (indigo→violet) | Diferencia de direct |
| D-CHAT-V3-06 | Unread badge (99+ se > 99) | Indicador forte de ação |
| D-CHAT-V3-07 | EmptyChatHero rico (não só EmptyState) | Onboarding de novos users |
| D-CHAT-V3-08 | URL state `?c=:id` (replace: true) | Deep linking sem poluir histórico |
| D-CHAT-V3-09 | Real-time via useConversations (Firestore) | Updates em tempo real |
| D-CHAT-V3-10 | Dark mode com tokens DS-V2 | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-CHAT-1 | Hero impactante gradient sky-indigo-violet | 1h | ✅ Feito |
| TASK-V3-CHAT-2 | 3 stat cards (Total/Diretas/Não lidas) | 1h | ✅ Feito |
| TASK-V3-CHAT-3 | 4 chips de filtro | 1h | ✅ Feito |
| TASK-V3-CHAT-4 | Busca avançada com clear | 0.5h | ✅ Feito |
| TASK-V3-CHAT-5 | Cards de preview | 1.5h | ✅ Feito |
| TASK-V3-CHAT-6 | Empty state rico (EmptyChatHero) | 0.5h | ✅ Feito |
| TASK-V3-CHAT-7 | Conversation view com URL state | 1h | ✅ Feito |
| TASK-V3-CHAT-8 | Error state com retry | 0.5h | ✅ Feito |
| TASK-V3-CHAT-9 | Loading skeleton | 0.5h | ✅ Feito |
| TASK-V3-CHAT-10 | JSON-LD WebPage schema | 0.5h | ✅ Feito |
| TASK-V3-CHAT-11 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-CHAT-12 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 23:30 | Análise V1 (167 linhas, grid simples) |
| 2026-07-19 23:30 | V3 implementada (26KB, 5 sub-componentes) |
| 2026-07-19 23:30 | Regência preenchida (15 seções) |
| 2026-07-19 23:30 | Deploy + SCRUM update |
