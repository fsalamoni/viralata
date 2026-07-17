# Documento de Regência — Páginas Legais V3

> **Status**: ✅ V3 IMPLEMENTADO (TASK-930)
> **Diretriz ETERNA**: ver `docs/PAGE_REGENCY_TEMPLATE.md`
> **Terceira página V3** (TASK-920 → Feed; TASK-927 → PetDetail; TASK-930 → Legal)
> **Atualizado em**: 2026-07-17 23:40 UTC
> **Cobre 8 páginas legais**: `/termos`, `/politica-privacidade`, `/legislacao`, `/legal/cookies`, `/legal/avisos-legais`, `/legal/legislacao-animal`, `/legal/codigo-de-conduta`, `/legal/termos-de-uso`

---

## 0. Identidade

| Campo | Valor |
|---|---|
| **Rotas** | `/termos`, `/politica-privacidade`, `/legislacao`, `/legal/:slug/*` (5 slugs públicos) |
| **Componentes V3** | `Terms.v3.jsx`, `PrivacyPolicy.v3.jsx`, `Legislation.v3.jsx`, `LegalPageViewer.v3.jsx` |
| **Wrappers (lazy)** | `Terms.jsx`, `PrivacyPolicy.jsx`, `Legislation.jsx`, `legal/LegalPageViewer.jsx` |
| **Fallback V1** | `Terms.v1.jsx`, `PrivacyPolicy.v1.jsx`, `Legislation.v1.jsx`, `LegalPageViewer.v1.jsx` (mantidos) |
| **Flag V3** | `V3_PAGE_LEGAL` (default OFF) |
| **Auth** | Anon-ok (público) |
| **Plataforma** | Mobile-first, responsivo (testado em 360/768/1280) |
| **LGPD** | Art. 50 (transparência), Art. 18 (direitos do titular), Art. 7 (consentimento) |
| **Doc atualizada em** | 2026-07-17 23:40 UTC |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_LEGAL) === true → <LegalV3 /> (lazy)
2. Senão                                   → <LegalV1 />
```

> **Lição D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

### Cobertura (8 páginas)

| # | Rota | Slug/Key | Página V3 | Fallback V1 |
|---|---|---|---|---|
| 1 | `/termos` | `TERMS` | `Terms.v3.jsx` | `Terms.static.jsx` (269 linhas) |
| 2 | `/politica-privacidade` | `PRIVACY_POLICY` | `PrivacyPolicy.v3.jsx` | `PrivacyPolicy.static.jsx` (10 seções LGPD) |
| 3 | `/legislacao` | `LEGISLATION` | `Legislation.v3.jsx` | `Legislation.static.jsx` (195 linhas) |
| 4 | `/legal/cookies` | `cookies` | `LegalPageViewer.v3.jsx` | (texto em `texts/cookies.js`) |
| 5 | `/legal/avisos-legais` | `avisos-legais` | `LegalPageViewer.v3.jsx` | (texto em `texts/avisosLegais.js`) |
| 6 | `/legal/legislacao-animal` | `legislacao-animal` | `LegalPageViewer.v3.jsx` | (texto em `texts/legislacaoAnimal.js`) |
| 7 | `/legal/codigo-de-conduta` | `codigo-de-conduta` | `LegalPageViewer.v3.jsx` | (texto em `texts/codigoDeConduta.js`) |
| 8 | `/legal/termos-de-uso` | `termos-de-uso` | `LegalPageViewer.v3.jsx` | (texto em `texts/termosDeUso.js`) |

### Bug fix crítico (TASK-930)

**`PrivacyPolicy.static.jsx` era um wrapper recursivo** — importava ele mesmo
(`import StaticPrivacyPolicy from './PrivacyPolicy.static'`), causando tela em branco
em /politica-privacidade e /legislacao. **Termos** funcionava porque seu `.static.jsx`
tinha conteúdo real. V3 corrigiu isso, criando o conteúdo estático da Privacy
com 10 seções canônicas da LGPD.

---

## 1. Estrutura visual (mobile-first, 1 col → 2 col md+)

```
Mobile (< 768px):
  1. Breadcrumb (Início > Documentos legais > {Doc})  ← inline
  2. Banner jurídico (ícone Scale + título + meta)
  3. Conteúdo Markdown (full-width, prose)
  4. [TOC colapsável (details/summary)]
  5. Cross-links (Documentos relacionados)
  6. [Floating actions (voltar ao topo, imprimir, copiar) — aparece scrollY > 400]

Tablet/Desktop (≥ 768px):
  1. Breadcrumb (top)
  2. Banner jurídico (largura total, com meta: versão, autor, data efetiva)
  3. GRID 2 colunas:
     - Coluna esquerda (~70%): Conteúdo Markdown
     - Coluna direita (256px, sticky top-24): TOC lateral
  4. Cross-links (full-width)
  5. [Floating actions (canto inferior direito)]
```

---

## 2. Funcionalidades (exaustivo)

### 2.1. Mantidas do V1 (com melhorias)

| # | Funcionalidade | Onde | Mudança V3 |
|---|---|---|---|
| F1 | Renderização Markdown | `MarkdownContent` | + IDs em h1-h6 (slugify) p/ TOC |
| F2 | Fallback estático (PrivacyPolicy/Terms/Legislation) | `*.static.jsx` | Privacy/static corrigido |
| F3 | useLegalDoc hook | `legalDocsService.jsx` | Mantido |
| F4 | LEGAL_DOCS enum | mesmo arquivo | Mantido |
| F5 | 5 páginas legais em /legal/* | `LegalPageViewer` | Mantido |
| F6 | Lazy load via React.lazy | `App.jsx` | Mantido |
| F7 | SEO title/description | `<Seo>` | Mantido |
| F8 | Layout responsivo básico | cada página | Refatorado p/ LegalLayoutV3 |

### 2.2. NOVAS no V3 (TASK-930)

| # | Funcionalidade | Componente | Hook / Service |
|---|---|---|---|
| F9 | **Layout unificado** | `LegalLayoutV3` | 8 páginas usam o mesmo |
| F10 | **Banner jurídico** | `LegalLayoutV3` | Ícone Scale + título + meta |
| F11 | **JSON-LD WebPage** | `LegalLayoutV3` | Schema.org inline |
| F12 | **JSON-LD BreadcrumbList** | `LegalLayoutV3` | Schema.org inline |
| F13 | **TOC auto-gerado** | `LegalToc` | `extractHeadings` regex h2/h3 |
| F14 | **TOC sticky lateral (md+)** | `LegalToc` | IntersectionObserver destaca ativo |
| F15 | **TOC colapsável mobile** | `LegalToc` | `<details>/<summary>` |
| F16 | **Scroll suave** | `LegalToc` | `scrollIntoView({behavior:'smooth'})` |
| F17 | **URL hash em scroll** | `LegalToc` | `window.history.replaceState('#id')` |
| F18 | **Meta: versão + autor + data** | `LegalMeta` | pt-BR formatted date |
| F19 | **Reading time** | `LegalLayoutV3` | 200 wpm, ceil() |
| F20 | **Voltar ao topo (FAB)** | `LegalFloatingActions` | Aparece scrollY > 400 |
| F21 | **Botão imprimir** | `LegalFloatingActions` | `window.print()` |
| F22 | **Botão copiar link** | `LegalFloatingActions` | `navigator.clipboard` + feedback |
| F23 | **Cross-links (Documentos relacionados)** | `LegalLayoutV3` | 8 links curados |
| F24 | **Compact mode** | `LegalLayoutV3` | `useUiPreferences().compactMode` |
| F25 | **Dark mode otimizado** | todos | `useColorMode` |
| F26 | **Reduced motion** | `LegalLayoutV3` | `useReducedMotionSafe` |
| F27 | **Page NotFound** | `LegalPageViewer.v3` | Para slugs inválidos |
| F28 | **Estado de loading (skeleton)** | `LegalPageViewer.v3` | Shimmer p/ 3 linhas |
| F29 | **Mensagem "em construção"** | `LegalPageViewer.v3` | Para docs sem texto |
| F30 | **Breadcrumb com JSON-LD** | `LegalLayoutV3` | Lista acessível |

**Total: 30 features** (8 V1 + 22 V3)

---

## 3. Componentes utilizados

### 3.1. V3 (novos)

| Componente | Arquivo | Bytes | Função |
|---|---|---|---|
| `<LegalLayoutV3>` | `src/components/legal/LegalLayoutV3.jsx` | ~8KB | Layout unificado, JSON-LD, grid, related |
| `<LegalToc>` | `src/components/legal/LegalToc.jsx` | ~6KB | TOC sticky md+ / colapsável mobile |
| `<LegalMeta>` | `src/components/legal/LegalMeta.jsx` | ~2.3KB | Versão + autor + data efetiva |
| `<LegalFloatingActions>` | `src/components/legal/LegalFloatingActions.jsx` | ~2.7KB | Voltar topo + imprimir + copiar |

### 3.2. Wrappers (lazy load com flag)

| Wrapper | V3 (lazy) | V1 (fallback) |
|---|---|---|
| `Terms.jsx` | `Terms.v3.jsx` | `Terms.v1.jsx` |
| `PrivacyPolicy.jsx` | `PrivacyPolicy.v3.jsx` | `PrivacyPolicy.v1.jsx` |
| `Legislation.jsx` | `Legislation.v3.jsx` | `Legislation.v1.jsx` |
| `legal/LegalPageViewer.jsx` | `LegalPageViewer.v3.jsx` | `LegalPageViewer.v1.jsx` |

### 3.3. Reutilizados (DS_V2 + V1)

| Componente | Arquivo | Função |
|---|---|---|
| `<Seo>` | `src/components/Seo.jsx` | Title/desc/OG |
| `<MarkdownContent>` | `src/components/ui/markdown-content.jsx` | Render seguro Markdown (V3 + IDs) |
| `<Skeleton>` | `src/components/ui/skeleton.jsx` | Loading |
| `<Button>` | `src/components/ui/button.jsx` | Ações (FAB) |
| `<Scale>`, `<List>`, `<ChevronRight>`, `<Home>` (lucide) | `lucide-react` | Ícones |
| `PageNotFound` | `src/pages/PageNotFound.jsx` | 404 (slugs inválidos) |

### 3.4. Hooks e services

| Hook/Service | Função |
|---|---|
| `useLegalDoc(docKey)` | Busca doc Markdown no Firestore + fallback |
| `useUiPreferences()` | Compact mode, reduce motion, etc |
| `useReducedMotionSafe()` | Honra `prefers-reduced-motion` |
| `getLegalPageBySlug(slug)` | Map slug → metadata do legal.js |
| `LEGAL_DOCS` enum | `privacy_policy`, `terms`, `legislation` |

---

## 4. Camadas de dados (data layer)

### 4.1. Fontes do conteúdo (ordem de prioridade)

```
1. Firestore: legal_docs/{docKey}        (editável pela equipe jurídica)
2. Markdown estático: texts/{slug}.js     (TASK-021 fallback V1)
3. JSX estático: *.static.jsx            (TASK-021 fallback offline)
```

### 4.2. Schema do doc Firestore (legal_docs/{docKey})

```js
{
  title: string,
  version: string,            // ex: "2.1.0"
  author: string,             // ex: "Equipe jurídica"
  effectiveAt: timestamp,     // ISO date de vigência
  content: string,            // Markdown GFM
  active: bool,
  publishedAt: timestamp,
}
```

### 4.3. Slugs do LegalPageViewer (whitelist)

```js
const PUBLIC_SLUGS = new Set([
  'cookies', 'avisos-legais', 'legislacao-animal',
  'codigo-de-conduta', 'politica-de-privacidade', 'termos-de-uso',
]);
```

Slugs fora da whitelist caem em `PageNotFound`.

---

## 5. UX/UI (decisões D-V3-LEGAL)

| # | Decisão | Motivo |
|---|---|---|
| D1 | 1 wrapper V3 para as 8 páginas | Consistência + DRY (vs 8 layouts diferentes) |
| D2 | TOC auto-gerado de headings (h2/h3) | Equipe jurídica só precisa escrever Markdown; TOC vem de graça |
| D3 | TOC sticky lateral em md+ (256px) | Docs longos (>3 telas) ganham navegação fixa |
| D4 | TOC colapsável no topo em mobile | Economia vertical; pode ser expandido sob demanda |
| D5 | Botão "voltar ao topo" só aparece scrollY > 400 | Não polui docs curtos |
| D6 | "5 min de leitura" calculado (200 wpm) | Padrão Medium/substack; ajuda a estimar tempo |
| D7 | Versão SEMPRE visível no header | LGPD Art. 50 (transparência) — versionamento explícito |
| D8 | JSON-LD WebPage + BreadcrumbList inline | SEO (Google rich results) — sem SSR, mas cliente já indexa |
| D9 | Cross-links no rodapé de cada doc | Navegação sem precisar da topbar (LGPD Art. 50) |
| D10 | Compact mode respeitado | `useUiPreferences().compactMode` reduz paddings |
| D11 | `<MarkdownContent>` melhorado | IDs em headings, code blocks, tables responsivas |
| D12 | Banner "Conteúdo jurídico oficial" | Autoridade + tom sério; ícone Scale |
| D13 | Floating actions: TOP → PRINT → COPY | Ordem de uso mais comum |
| D14 | CORREÇÃO: `PrivacyPolicy.static.jsx` agora tem conteúdo real | Era wrapper recursivo → tela em branco |
| D15 | JSON-LD dinâmico com `effectiveAt.toDate()` | Funciona com Timestamp do Firestore OU ISO string |

---

## 6. Estados (loading / empty / error / not-found)

| Estado | Componente | Visual |
|---|---|---|
| Loading | Skeleton (3 retângulos animados) | `<Skeleton className="h-6 w-1/2" />` × 3 |
| Empty (sem texto) | Banner "em construção" | `Scale icon` + links relacionados |
| Error (Firestore fail) | Fallback estático | `*.static.jsx` (Privacy/Terms/Legislation) |
| Not Found (slug inválido) | `PageNotFound` | 404 padrão do app |
| Mobile (TOC) | `<details>/<summary>` | Chevron rotaciona ao abrir |
| Desktop (TOC) | Sticky lateral | IntersectionObserver destaca ativo |

---

## 7. Acessibilidade (WCAG 2.1 AA)

| Requisito | Implementação |
|---|---|
| 1.3.1 Info and Relationships | `<nav aria-label="Índice">`, `<article>` para conteúdo, `<aside>` para TOC |
| 1.4.3 Contrast | Texto `text-foreground` (≥7:1) sobre `bg-card` (≥4.5:1) |
| 1.4.11 Non-text Contrast | Borders `border-border` (≥3:1 contra fundo) |
| 2.1.1 Keyboard | Todos botões (FAB, TOC, breadcrumb) focáveis; Enter ativa |
| 2.4.1 Bypass Blocks | Breadcrumb (skip-to-content equivalente) |
| 2.4.4 Link Purpose | Links com texto explícito ("Política de Privacidade", "Imprimir") |
| 2.4.6 Headings | h1 (título), h2 (seções Markdown) — hierarquia respeitada |
| 3.2.2 On Input | Nenhum form; só cliques |
| 4.1.2 Name, Role, Value | `aria-label` em todos os botões FAB, `aria-current="page"` no breadcrumb ativo |
| Color-scheme | `color-scheme: dark` no dark mode (forms e code blocks) |

**Detalhes importantes**:
- Botão "Voltar ao topo" tem `aria-label="Voltar ao topo"`
- Botão "Imprimir" tem `aria-label="Imprimir"`
- Botão "Copiar link" muda label para "Link copiado!" via `aria-label` dinâmico
- TOC tem `aria-label="Índice do documento"`
- Quando a seção ativa muda, o link recebe foco visual (não automático — evita scroll jump)

---

## 8. Performance

### 8.1. Bundle splitting

Cada página V3 é seu próprio chunk (Vite dynamic import via React.lazy):

```
TermsV3-XXX.js                   ~1-2 KB
PrivacyPolicyV3-XXX.js           ~1-2 KB
LegislationV3-XXX.js             ~1-2 KB
LegalPageViewerV3-XXX.js         ~3-4 KB
LegalLayoutV3 (in chunk)         ~8 KB
LegalToc (in chunk)              ~6 KB
LegalMeta (in chunk)             ~2.3 KB
LegalFloatingActions (in chunk)   ~2.7 KB
```

**Total V3 chunks**: ~22 KB (vs V1 monolítico ~30 KB).

**Lazy load é crítico (D-VITE-LAZY-01)**: Vite faz constant folding em if/else
estático, ELIMINANDO o branch V3 do bundle se não usar `React.lazy()`. O user
que NÃO tem a flag ON não paga o custo do V3.

### 8.2. Otimizações runtime

- **TOC**: usa `IntersectionObserver` (não scroll listener) — eficiente em docs longos
- **Markdown IDs**: calculados uma vez no `extractHeadings` (memo)
- **Floating actions**: scrollY listener com `passive: true`
- **Compact mode**: toggle de classes (sem re-render)
- **Reduced motion**: honrado em scroll suave (`behavior: 'auto'` se reduzir)

---

## 9. Padrões de design aplicados

| Padrão | Onde | Motivo |
|---|---|---|
| **Compound components** | `LegalLayoutV3` + filhos | Layout com seções opcionais (TOC, related) |
| **HOC for id injection** | `<MarkdownContent>` headings | Slugify automático, transparente |
| **Lazy load com Suspense** | 4 wrappers | Bundle splitting + flag-gated |
| **Data-fetching hook** | `useLegalDoc` | Encapsula Firestore + fallback |
| **Memoization** | `useMemo` em headings/readTime/LD-JSON | Evitar re-parse do Markdown |
| **Portal-less** | nenhum | Conteúdo cabe na main, sem overlay |
| **Scroll lock** | não aplicável | Sem modais fullscreen |
| **Context** | `useUiPreferences` | Theme/compact/reduce-motion global |
| **Schema.org** | JSON-LD inline | SEO sem SSR |
| **IntersectionObserver** | TOC | Performance em docs longos |

---

## 10. Risks & Mitigations (registro)

| Risco | Impacto | Mitigação |
|---|---|---|
| **PWA SW cache imutável** | User não vê V3 em mobile | Bump `sw-v10.js → sw-v11.js` no deploy |
| **Vite constant folding** | V3 não chega no bundle | React.lazy OBRIGATÓRIO (D-VITE-LAZY-01) |
| **Firestore offline** | Doc não carrega | Fallback `*.static.jsx` (3 camadas) |
| **Doc sem h2/h3** | TOC vazio | `LegalToc` retorna null se headings.length === 0 |
| **Slug inválido** | 404 inesperado | `PageNotFound` (rota catch-all) |
| **Markdown injection (XSS)** | Risco segurança | `react-markdown` sem `rehype-raw` (HTML escapado) |
| **Imprimir com cores ruins** | Acessibilidade | `@media print { color-scheme: light }` (futuro) |
| **Cópia falha em iOS** | UX | Fallback: `window.prompt('Copie:', url)` |
| **TOC scroll trava** | UX | `scrollIntoView` com `behavior: smooth` (respeita reduced-motion) |
| **URL hash não atualiza** | Compartilhamento | `window.history.replaceState('#id')` após scroll |

---

## 11. Métricas de sucesso (D-V3-LEGAL)

| KPI | Meta | Como medir |
|---|---|---|
| Páginas legais funcionando | 8/8 (V1 + V3) | Smoke test (Task 930) |
| Termos / Privacidade / Legislação abrem | 3/3 | Manual + bug fix Privacy/static |
| Fallback estático (3 camadas) | 100% | Offline test |
| WCAG AA | 100% | Manual + axe-core |
| Bundle V3 ≤ 25KB por chunk | ✅ | Build report |
| Lighthouse Performance | ≥ 90 | CI Lighthouse |
| Lighthouse SEO | ≥ 95 | Schema.org JSON-LD |
| Tempo de leitura exibido | Sempre | `readingTime(markdown)` |
| TOC auto-gerado | 100% se h2/h3 | `extractHeadings` |
| Cross-links presentes | 100% | Hardcoded por página |
| Imprimir / Copiar / Top funcionais | 3/3 | Manual test |
| Bugs encontrados no QA | 0 | Testes + manual |

---

## 12. Próximas evoluções (pós-V3)

| # | Melhoria | Estimativa |
|---|---|---|
| 1 | **Aceitar termos (LGPD Art. 7)** no signup | TASK-V3-LEGAL-7 (8h) |
| 2 | **Histórico de versões** no Firestore (lista expansível) | TASK-V3-LEGAL-8 (4h) |
| 3 | **Diff visual entre versões** (verde/vermelho inline) | TASK-V3-LEGAL-9 (16h) |
| 4 | **Print-friendly CSS** dedicado (`@media print`) | TASK-V3-LEGAL-10 (2h) |
| 5 | **Aceite obrigatório de cookies** (LGPD) em /legal/cookies | TASK-V3-LEGAL-11 (4h) |
| 6 | **Search interno nos docs** (full-text search em PT) | TASK-V3-LEGAL-12 (12h) |
| 7 | **Glossário de termos jurídicos** (link inline) | TASK-V3-LEGAL-13 (8h) |
| 8 | **Exportar para PDF** (jsPDF + print CSS) | TASK-V3-LEGAL-14 (4h) |
| 9 | **Multi-idioma** (PT/EN/ES) | TASK-V3-LEGAL-15 (40h) |
| 10 | **Watermark com IP do user** (anti-rascunho cópia) | TASK-V3-LEGAL-16 (2h) |

---

## 13. Referências

- **Análise inicial**: `docs/V3_LEGAL_QUESTIONS.md` (8.2KB, 20 features V1, 30 lacunas, 15 Q&A + 12 decisões)
- **D-DOC-REGENCY-01**: `docs/PAGE_REGENCY_TEMPLATE.md` (template base, 11 seções)
- **D-VITE-LAZY-01**: `docs/CORE_DIRECTIVES.md` (Vite constant folding + React.lazy)
- **D-V3-FEED-FIX-01**: 5 lições do Feed V3 (cross-ref)
- **D-UI-PREFS-01**: `useUiPreferences` (compact/reduce-motion)
- **Regências anteriores**: `docs/REGENCY_FEED_V3.md` (25.7KB), `docs/REGENCY_PET_DETAIL_V3.md` (22KB)
- **Roadmap do abrigo**: `docs/SHELTER_MGMT_ROADMAP.md` § Fase 19 (CMS Markdown)
- **LGPD**: Lei 13.709/2018 — Art. 7, 18, 50

---

**Status**: ✅ Pronto para produção. Aguardando deploy + validação do user.
