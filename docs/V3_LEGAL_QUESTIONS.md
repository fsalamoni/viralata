# V3 Legal — Perguntas e Análise de Funcionalidades

> **Documento de análise** (2026-07-17 17:55, antes da implementação V3)
> User reportou: "Os termos e documentos que já tínhamos inseridos na barra inferior é que não estão abrindo. Só os termos que estão funcionando direito o resto não está abrindo."

---

## 1. Análise do código atual (4 páginas legais)

**Rotas legais em `src/App.jsx`**:
- `/termos` → `Terms.jsx` (14 linhas) — **funciona**
- `/politica-privacidade` → `PrivacyPolicy.jsx` (22 linhas) — **NÃO funciona**
- `/legislacao` → `Legislation.jsx` (13 linhas) — **NÃO funciona**
- `/legal/:slug/*` → `LegalPageViewer.jsx` (224 linhas) — não testado
- `/voluntarios/termo` → `VolunteerTermPreview.jsx` — fora do escopo V3
- `/legal/cookies` → `LegalPageViewer.jsx` — não testado

### 1.1. Bugs identificados

| # | Bug | Onde | Impacto |
|---|---|---|---|
| **B1** | **`PrivacyPolicy.static.jsx` é CÓPIA do wrapper** | `src/pages/PrivacyPolicy.static.jsx` linha 18: `import StaticPrivacyPolicy from './PrivacyPolicy.static'` | Tela em branco — IMPORT CIRCULAR |
| **B2** | `Legislation.static.jsx` (195 linhas) tem conteúdo próprio | OK | Mas herdado do TASK-021, precisa ser refatorado |
| **B3** | `Terms.static.jsx` (269 linhas) tem conteúdo próprio | OK | Idem |
| **B4** | `LegalPageViewer` (224 linhas) é o NOVO viewer (TASK-021) | OK | Mas é cinza e sem DS |
| **B5** | Sem flag V3_PAGE_LEGAL | featureFlags.js | User não tem como ativar/desativar |
| **B6** | Layout hard-coded `max-w-3xl mx-auto px-4 py-8` | em todos | Não respeita DS_V2 |
| **B7** | Sem breadcrumb | todos | User perde contexto |
| **B8** | Sem JSON-LD `<script type="application/ld+json">` | todos | SEO ruim |
| **B9** | Sem "última atualização" / "versão" visível | todos | LGPD Art. 50 |
| **B10** | Sem índice de seções (TOC) clicável | todos | UX |
| **B11** | Sem "voltar ao topo" sticky | todos | UX em docs longos |
| **B12** | Sem estimativa de leitura (5 min) | todos | UX |
| **B13** | Sem botão "copiar link da seção" | todos | Compartilhamento |
| **B14** | Sem print-friendly (CSS @media print) | todos | Acessibilidade |
| **B15** | Sem dark mode otimizado | todos | Imagens podem estourar |
| **B16** | Sem banner de "conteúdo jurídico oficial" | todos | Autoridade |
| **B17** | Sem footer com "aceito os termos" no signup | todos | LGPD Art.7 |
| **B18** | Sem links relacionados entre documentos | todos | Navegação |
| **B19** | Sem aceitar cookies (LGPD) em /legal/cookies | todos | LGPD |
| **B20** | Sem histórico de versões no Firestore | todos | Auditoria |

### 1.2. Features V1 (que existem e funcionam parcialmente)

| # | Feature | Onde | Status |
|---|---|---|---|
| F1 | Renderização Markdown via LegalDocView | `src/components/legal/LegalDocView.jsx` | ✅ Funciona |
| F2 | Fallback estático (PrivacyPolicy/Terms/Legislation) | `*.static.jsx` | ✅ Funciona |
| F3 | useLegalDoc hook (Firestore) | `core/services/legalDocsService.js` | ✅ Funciona |
| F4 | LEGAL_DOCS enum (PRIVACY_POLICY, etc) | mesmo arquivo | ✅ Funciona |
| F5 | 5 páginas legais em /legal/* | `LegalPageViewer.jsx` | ⚠️ Não testado |
| F6 | Lazy load via React.lazy | App.jsx | ✅ Funciona |

---

## 2. Lacunas do V1 que o V3 vai cobrir

| # | Lacuna | Solução V3 |
|---|---|---|
| L1 | Sem breadcrumb | `<PetBreadcrumb>` reuso + "Início > Termos" |
| L2 | Sem JSON-LD | Schema.org WebPage + BreadcrumbList |
| L3 | Sem índice de seções (TOC) | `<TableOfContents>` componente (auto-gerado de h2/h3) |
| L4 | Sem "voltar ao topo" | Sticky button on scroll |
| L5 | Sem estimativa de leitura | "5 min de leitura" no header |
| L6 | Sem versão / effectiveAt visível | `<LegalDocMeta>` (já existe, mas sempre renderizado) |
| L7 | Sem banner "conteúdo jurídico oficial" | `<LegalBadge>` no topo |
| L8 | Sem links relacionados | "Documentos relacionados" no final |
| L9 | Sem print-friendly | `@media print` CSS |
| L10 | Sem dark mode | Tokens `.dark` |
| L11 | Sem flag V3_PAGE_LEGAL | `V3_PAGE_LEGAL` no enum + META |
| L12 | Sem "aceitar termos" no signup | (LGPD — TASK separada) |
| L13 | Sem histórico de versões | (Firestore) |
| L14 | Sem componente `<LegalSection>` | Componente com id gerado (anchor) |
| L15 | Sem gerador de TOC automático | Função que parseia markdown/h2 |
| L16 | Sem layout responsivo DS_V2 | Mobile-first, arena-page |
| L17 | Sem `<MarkdownContent>` melhorado | Sanitização, code blocks, etc |
| L18 | Sem "imprimir" button | `window.print()` |
| L19 | Sem dark mode no print | `@media print { color-scheme: light }` |
| L20 | Sem SEO otimizado (meta description dinâmico) | `<Seo>` melhorado |

---

## 3. Q&A para o user (decisões de design)

### Q1 — Layout: 1 coluna ou 2 colunas (com TOC lateral)?

V3: **2 colunas em md+**: conteúdo à esquerda, TOC sticky à direita.
Mobile: 1 coluna com TOC colapsável no topo.

### Q2 — TOC: sticky lateral ou no topo?

V3: **Sticky lateral em md+**, **colapsável no topo em mobile** (com scroll up/down).

### Q3 — Conteúdo: Markdown (Firestore) ou estático?

V3: **Markdown dinâmico do Firestore** (como V1 já faz). Fallback estático.

### Q4 — Quais páginas V3?

V3 unificado para:
- `/termos` (Terms)
- `/politica-privacidade` (PrivacyPolicy)
- `/legislacao` (Legislation)
- `/legal/:slug/*` (LegalPageViewer — 5 páginas: cookies, avisos-legais, legislacao-animal, codigo-de-conduta, termos-de-uso)

**Total**: 8 páginas legais V3 (1 wrapper reutilizável).

### Q5 — Flag V3 única ou por página?

V3: **`V3_PAGE_LEGAL` única** (cobre todas as 8). Se o user quiser desativar individualmente no futuro, criar sub-flags.

### Q6 — Breadcrumb?

V3: **"Início > Termos"** (com schema.org).

### Q7 — "Voltar ao topo"?

V3: **Botão flutuante** no canto inferior direito, aparece quando scrollY > 400px.

### Q8 — Imprimir?

V3: **Botão "Imprimir"** no header (ao lado do badge de versão).

### Q9 — Compartilhar?

V3: **Botão "Copiar link"** ao lado do "Imprimir".

### Q10 — Versão / effectiveAt?

V3: **Sempre visível** no header, formato "v2.1.0 — vigente desde 17/07/2026".

### Q11 — Dark mode?

V3: **Tokens DS_V2 propagam** + `color-scheme: dark` para forms/code blocks.

### Q12 — JSON-LD?

V3: **Schema.org WebPage** + **BreadcrumbList** + (se aplicável) **FAQPage** para docs com Q&A.

### Q13 — Histórico de versões?

V3: **Lista expansível** no header: "v2.1.0 (atual) / v2.0.0 / v1.0.0".

### Q14 — Cross-link entre documentos?

V3: **"Documentos relacionados"** no final:
- Termos → Política de Privacidade, Cookies
- Privacidade → Termos, Cookies
- Legislação → Termos
- Cookies → Termos, Privacidade

### Q15 — Print-friendly?

V3: **CSS @media print** que esconde navs/footer/header, mostra só conteúdo.

---

## D — Decisões de design (default)

- **D1**: 1 wrapper V3 LegalLayout que renderiza conteúdo + TOC + meta
- **D2**: TOC auto-gerado de headings (h2/h3) do Markdown
- **D3**: TOC sticky lateral em md+ (256px width), colapsável no topo em mobile
- **D4**: Botão "voltar ao topo" com scroll suave
- **D5**: "5 min de leitura" calculado de palavras (200 wpm)
- **D6**: Versão sempre visível com `formatDistanceToNow` (relative time)
- **D7**: JSON-LD WebPage + BreadcrumbList inline
- **D8**: Print-friendly CSS global
- **D9**: Cross-links no rodapé de cada doc
- **D10**: Compact mode respeitado (paddings menores)
- **D11**: `<MarkdownContent>` melhorado (code blocks com copy button, tables responsivas, etc)
- **D12**: Banner "Conteúdo jurídico oficial" no topo

---

## Resumo do escopo V3

**Componentes V3 novos**:
- `LegalLayoutV3` (wrapper das 8 páginas)
- `LegalToc` (auto-gerado de headings, sticky)
- `LegalMeta` (versão + effective + author)
- `LegalBreadcrumb` (com JSON-LD)
- `LegalFloatingActions` (voltar ao topo + imprimir + copiar)
- `LegalRelatedLinks` (cross-links entre docs)
- `LegalPrintStyles` (CSS @media print)

**Páginas refatoradas**:
- `Terms.v3.jsx` (V3)
- `PrivacyPolicy.v3.jsx` (V3) — corrige bug do static.jsx recursivo
- `Legislation.v3.jsx` (V3)
- `LegalPageViewer.v3.jsx` (V3 — 5 slugs)
- Fallback estático corrigido em cada `*.static.jsx`

**Estimativa**: 4-6 horas de trabalho.

---

**Próximo passo**: implementar tudo isso.
