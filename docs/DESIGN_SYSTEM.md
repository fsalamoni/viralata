# Design System · Viralata — v1.0 (oficial)

> **Esta é a especificação oficial e definitiva do design system da plataforma.**
> A fonte canônica é este arquivo. A versão visual navegável está em
> `docs/design-system-v2/design-system-preview.html` (HTML estático com
> todos os componentes renderizados). Os tokens machine-readable estão em
> `docs/design-system-v2/design-tokens.json`. O Figma está em
> `docs/design-system-v2/design-system.fig` (placeholder representativo
> do canvas, já que o Figma usa formato binário proprietário).
>
> O plano de aplicação do design system em código está em
> `docs/ROADMAP.md` → **Fase 4 (DS_V2 — Reaplicação)**. Nada do que está
> aqui foi propagado em massa ainda — está sendo aplicado por área
> (Home → Pets → Adoção → Organizações → Admin → Chat), cada área com
> feature flag própria default OFF.

---

## 1. Princípios de Design

As quatro premissas que orientam toda decisão de design na plataforma:

- **Clareza**: Hierarquia visual óbvia. Uma ação primária por tela, textos diretos, nunca fazer o usuário adivinhar o próximo passo.
- **Navegação intuitiva**: Estrutura estável (Feed, Abrigos, Voluntários, Comunidade, Chat) — muitas funcionalidades, sempre no mesmo lugar.
- **Empatia & apego**: Fotos grandes, tom caloroso, histórias reais. O pet é sempre protagonista visual.
- **Organicidade**: Formas orgânicas, cantos generosos, superfícies de vidro — nunca aspecto corporativo ou "feito por IA".

---

## 2. Tokens de Design (Fundamentos)

### 2.1. Cores

Paleta "quente e terrosa" — terracota como cor de ação, tons de areia e creme como base, oliva e mostarda como apoio. **Regra:** Máximo 1–2 cores de fundo por tela.

| Nome | Variável CSS | HSL | HEX | Uso |
|------|--------------|-----|-----|-----|
| **Primary · Terracota** | `--primary` | `17 72% 43%` | `#C85A28` | Ações principais, CTAs, wordmark |
| **Primary Foreground** | `--primary-foreground` | `40 45% 98%` | `#FFFBF5` | Texto sobre fundo primary |
| **Secondary · Areia** | `--secondary` | `38 42% 91%` | `#EDE4D6` | Chips neutros, fundos suaves |
| **Accent · Oliva** | `--accent` | `86 30% 32%` | `#5A7A2E` | Avatares, badges de comunidade |
| **Highlight · Mostarda** | `--highlight` | `40 88% 54%` | `#FFC107` | Gradiente CTA, badge "em processo" |
| **Success** | `--success` | `150 38% 36%` | `#26A65B` | Status "disponível", confirmações |
| **Destructive** | `--destructive` | `9 62% 46%` | `#E74C3C` | Denúncias, exclusões, alertas |
| **Background** | `--background` | `38 45% 97%` | `#F8F5F0` | Fundo base de todas as páginas |
| **Background Alt** | `--background-alt` | `34 40% 94%` | `#F0EBE3` | Seções alternadas |
| **Foreground** | `--foreground` | `20 25% 13%` | `#2D1F14` | Texto principal |
| **Muted Foreground** | `--muted-foreground` | `20 12% 37%` | `#6B5D52` | Texto secundário, legendas |
| **Border** | `--border` | `30 20% 88%` | `#E0D5C7` | Bordas de inputs, cards, divisores |

**Implementação atual (julho/2026):** os tokens já estão aplicados em
`src/index.css` com os valores oficiais — TASK-249 ajustou contraste WCAG AA
em `--primary` e `--muted-foreground`. Sem mudanças necessárias nos valores
brutos dos tokens. Use sempre as variáveis semânticas (`bg-primary`,
`text-foreground`, `text-muted-foreground`); nunca cores literais do
Tailwind (`bg-orange-500`, `text-gray-900`).

### 2.2. Gradientes

Usados com moderação — CTAs, marca e superfícies de destaque. Nunca em blocos de texto longos.

- **Gradiente de marca**: `linear-gradient(135deg, hsl(17,72%,43%), hsl(40,88%,54%))`
  - *Uso:* Botões primários, CTA final, ícone do logo
- **Wordmark**: `linear-gradient(90deg, hsl(16,68%,26%), hsl(16,60%,42%), hsl(42,88%,52%))`
  - *Uso:* Texto "Viralata" e títulos com destaque
- **Banner escuro**: `linear-gradient(145deg, hsl(16,60%,30%), hsl(20,35%,18%) 55%, hsl(20,25%,11%))`
  - *Uso:* Cabeçalhos internos, CTA final, admin
- **Avatar**: `linear-gradient(135deg, hsl(86,30%,32%), hsl(17,72%,43%))`
  - *Uso:* Avatares com iniciais, ícones de equipe

### 2.3. Tipografia

**Sora** (700/800) para títulos, com leve tracking negativo. **Manrope** (400–800) para todo o resto — corpo, botões, legendas.

| Nível | Fonte & Peso | Tamanho / Line Height | Tracking | Uso |
|-------|--------------|-----------------------|----------|-----|
| **Display** | Sora 800 | 56px / 1.1 | -0.03em | Títulos heróis, landing pages |
| **H1** | Sora 800 | 30–34px / 1.2 | -0.02em | Títulos de página |
| **H2** | Sora 800 | 26–30px / 1.2 | -0.02em | Títulos de seção |
| **H3** | Sora 700 | 16–19px / 1.3 | 0 | Subtítulos, card titles |
| **Corpo grande** | Manrope 400 | 17.5px / 1.6 | 0 | Texto longo, descrições |
| **Corpo** | Manrope 500 | 14px / 1.6 | 0 | Texto principal, parágrafos |
| **Pequeno** | Manrope 600 | 12.5–13.5px / 1.4 | 0 | Labels, legendas, metadados |
| **Eyebrow** | Manrope 700 | 11px / 1.2 | +0.24em | Rótulos de categoria (maiúsculo) |

**Implementação atual:** `Sora` + `Manrope` já importados em `src/index.css`
via Google Fonts. As classes Tailwind aplicadas são:

- `font-sora` para títulos (Display, H1, H2, H3)
- `font-sans` (Manrope por padrão) para corpo

### 2.4. Espaçamento & Raios

Escala de espaçamento em incrementos de 4px. Raios generosos e cantos arredondados reforçam a sensação orgânica e acolhedora.

**Escala de Espaçamento:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96 px.

**Raios (Border Radius):**
- **Pill (999px)**: Botões, chips, inputs de busca
- **Card (22–24px)**: Cards de pet, abrigo, painéis
- **Banner (28–32px)**: Cabeçalhos, CTA final
- **Pequeno (12–14px)**: Miniaturas, badges quadrados
- **Orgânico/Blob (`40% 60% 55% 45%` / `48% 44% 56% 52%`)**: Moldura de foto hero (Home, 1× por página)

### 2.5. Sombras & Superfícies (Glass)

Sombras difusas e quentes (nunca cinza puro) dão profundidade sem parecer pesadas. Superfícies de vidro (glass) aparecem sobre fundos com glow.

- **Painel flutuante**: `0 24px 60px -28px rgba(64,34,18,0.28)`
- **Botão / CTA**: `0 18px 38px -22px rgba(64,34,18,0.7)`
- **Banner escuro**: `0 30px 80px -28px rgba(43,20,8,0.62)`
- **Hover leve**: `0 20px 50px -30px rgba(64,34,18,0.3)`

**Efeito Glassmorphism:**
`background: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.9); backdrop-filter: blur(14px); box-shadow: 0 24px 60px -28px rgba(64,34,18,0.28);`
*Sempre sobre fundo com glow radial.*

**Implementação atual:** as classes `arena-panel`, `arena-panel-strong`,
`arena-chip`, `match-surface` em `src/index.css` já encapsulam o efeito
glass com a paleta terracota oficial. Usar essas classes em vez de
reimplementar inline.

---

## 3. Componentes

### 3.1. Botões

Sempre em formato pílula (999px). Uma única ação primária por tela.

| Variante | Estilo Visual | Uso |
|----------|---------------|-----|
| **Primário** | Bg: Gradiente de marca, Cor: #fff, Borda: none | Uma por tela — ação principal |
| **Secundário** | Bg: Branco 90%, Cor: Escura, Borda: 2px solid primary 30% | Ação alternativa |
| **Terciário/Neutro** | Bg: Secondary (Areia), Cor: Escura, Borda: none | Dentro de cards, ações secundárias |
| **Administrativo** | Bg: Escuro (`hsl 20,15%,20%`), Cor: #fff, Borda: none | Contexto restrito, painel admin |
| **Crítico** | Bg: Destructive (Vermelho), Cor: #fff, Borda: none | Denúncias, exclusões (usar com moderação) |
| **Desabilitado** | Bg: Transparente, Cor: Cinza, Borda: 2px solid cinza, Opacity: 55% | Estado inativo |
| **Ícone Circular** | Bg: Gradiente de marca, Formato: Círculo perfeito (46–52px) | Swipe de descoberta, ações rápidas flutuantes |

**Implementação atual:** `src/components/ui/button.jsx` já implementa
o gradiente de marca no `Button` primário e o pill (radius 999px) por
padrão. Ajustes pendentes por componente — cobertos pela Fase 4
DS_V2_COMPONENTS do ROADMAP.

### 3.2. Chips & Badges

- **Status de Pet:**
  - *Disponível*: Bg verde translúcido, Texto verde escuro
  - *Em processo*: Bg mostarda translúcido, Texto marrom/laranja escuro
  - *Adotado*: Bg cinza translúcido, Texto cinza escuro
- **Filtros (Ativo/Inativo):**
  - *Ativo*: Bg Primary (Terracota), Texto branco, `fontWeight: 700`
  - *Inativo*: Bg branco, Borda cinza clara, Texto escuro, `fontWeight: 600`
- **Tags de Característica:** Bg Secondary (Areia), Texto escuro (Ex: Castrado, Vacinado)

### 3.3. Cards

Cantos 20–24px, fundo quase-branco translúcido, sombra difusa. Hover: leve elevação, sem tilt 3D.

- **Card de Pet**: Imagem no topo (aspect-ratio 1.3), conteúdo com padding 16px, título Sora 16px, metadados Manrope 12px, botão terciário full-width.
- **Feature Card**: Ícone grande (44px) com bg translúcido, título Sora 15.5px, descrição Manrope 13px. Padding 22px.
- **Card de Depoimento**: Avatar com gradiente (40px), nome em bold, ação em cinza, citação em itálico. Padding 22px.

### 3.4. Formulários

- **Campo de Texto / Input**: Altura 46px, raio 12px, borda cinza clara. Focus: borda primary + ring outline sutil.
- **Área de Texto / Textarea**: Min-height 80px, raio 12px, padding 12px 14px.
- **Controle Segmentado**: Altura 38px, formato pílula. Item ativo com bg primary e texto branco.
- **Toggle (Interruptor)**: 46×26px. Ativo: bg success (verde). Inativo: bg cinza. Knob branco 20×20px.

### 3.5. Navegação

Estrutura fixa: **Feed · Abrigos · Voluntários · Comunidade · Chat** — sempre no mesmo lugar.

- **Desktop (Menu em Abas)**: Formato pílula horizontal, bg branco, borda fina. Item ativo recebe bg primary e texto branco.
- **Mobile (Barra Inferior)**: Fundo escuro (`hsl 20,25%,13%`), raio 20px, padding 14px 28px. Ícones Material preenchidos para ativos, vazados para inativos.
  - *Botão Central*: Elevado (-10px Y), bg gradiente de marca, sombra forte.

### 3.6. Overlays & Menus

- **Menu Dropdown**: Raio 18px, bg branco, sombra "Painel flutuante". Itens com padding 9px 12px, gap 10px para ícone. Hover cinza muito claro.
- **Modal**: Raio 24px, padding 32px, max-width 480px. Sombra "Painel flutuante". Header em Sora 20px.

### 3.7. Tabelas

- Raio externo 18px, borda fina.
- **Header**: Bg Secondary (Areia), texto 12px uppercase (Eyebrow).
- **Linhas**: Padding 14px 16px, borda inferior fina. Linhas pares com bg Background Alt para zebragem. Hover com bg Areia claro.

### 3.8. Progresso & Métricas

- **Barra de Progresso**: Altura 8px, raio pílula, bg cinza claro. Preenchimento com gradiente de marca.
- **Card de Métrica**: Raio 18px, padding 20px. Label 12px cinza, Valor 28px Sora bold, Variação verde/vermelha.

### 3.9. Avatares

- **Iniciais**: Bg gradiente Avatar (oliva para terracota), texto branco bold.
- **Imagem**: Borda 2px branca ou cinza clara, `object-fit: cover`.
- **Status**: Bolinha 12px no canto inferior direito com borda branca (Verde = online, Cinza = offline).

### 3.10. Banners & Heróis

- **Banner Herói**: Raio 28–32px, bg "Banner escuro" (gradiente dark), padding 40–60px. Título 44px Sora branco.
- **Banner de Alerta**: Raio 16px, padding 16px. Bg com 10–15% de opacidade da cor semântica, borda esquerda 4px sólida da cor semântica.

---

## 4. Ícones & Marca

### 4.1. Ícones — decisão de coexistência

**Decisão (julho/2026):** **Coexistência pragmática**.

- **lucide-react** continua sendo a biblioteca padrão para a UI existente
  (204 arquivos). É leve (~3KB gzip), segue o padrão shadcn/Tailwind,
  integra naturalmente com `cn()`, `size`, e herda cor de texto.
- **Material Symbols Outlined** é introduzido como **fonte variável**
  (subset) **apenas para**:
  - Logo / ícone de marca (pata com `FILL 1`)
  - Ícones afetivos (curtir, favorito) com `FILL 1`
  - Componentes novos nascidos sob a v1.0 (substitui `lucide` quando o
    componente é reescrito)
- Migração maciça de `lucide` → Material Symbols **NÃO** está no escopo.
  Esforço de 3-5 dias com zero ganho funcional. Reabrir como TASK se o
  design system oficial for revisado.

**Implementação:** adicionar subset da fonte Material Symbols em
`src/index.css` (`@import url('...Material+Symbols+Outlined...')`),
expor como utility `.material-symbols-outlined` e usar com a prop
`font-variation-settings: 'FILL' 0/1, 'wght' 500`.

### 4.2. Logo & Marca

- **Logo Completo**: Ícone de pata + Wordmark "Viralata".
- **Ícone (Pata)**: Fundo quadrado arredondado (11px) com gradiente de marca, ícone `pets` branco com sombra `0 10px 20px -10px rgba(64,34,18,0.6)`.
- **Wordmark**: Fonte Sora 800, 24px, com texto transparente e `background-clip: text` usando o gradiente "Wordmark".

---

## 5. Diretrizes

### 5.1. Motion & Animação

- **Entrada (fade + slide)**: `opacity 0→1`, `translateY 14–16px→0`, 400–600ms ease. Aciona apenas uma vez (`whileInView`).
- **Pop (imagem / hero)**: `scale .92–.94→1` + `opacity 0→1`, 600ms ease.
- **Hover em card**: Sombra cresce + `scale 1.01–1.02`. *Nunca usar tilt 3D*.
- **Stagger em grid**: 70–90ms de delay entre itens, máximo 6–8 itens.
- **Redução de movimento**: Sempre respeitar `prefers-reduced-motion: reduce`.

**Implementação:** `framer-motion` será instalado no **Bloco E (DS_V2_MOTION)**,
com uso restrito a: hero, grids de cards, modais, dropdowns, transições de
rota. Hover, focus e scroll-suave continuam em CSS puro. Padrão obrigatório
em todo componente com motion: `useReducedMotion()` e desligar variantes
quando ativo.

### 5.2. Voz & Tom

Tom de voz: caloroso, empático, direto e acessível.

**FAÇA:**
- "O Viralata conecta pets que precisam de um lar com famílias que têm amor para dar."
- "Encontre o pet ideal com base no seu espaço, rotina e estilo de vida."
- "Denuncie casos de maus-tratos ou abandono. Sua identidade fica confidencial."

**EVITE:**
- "Nossa plataforma disponibiliza uma solução integrada de matching entre ativos caninos e usuários finais." *(jargão corporativo)*
- "Bora adotar um mano peludo?? 🐶🔥" *(gírias e emoji em excesso na UI)*

### 5.3. Acessibilidade (guardrails)

- **Contraste**: Mínimo 4.5:1 para texto normal, 3:1 para texto grande (WCAG AA).
- **Foco Visível**: `outline: 2px solid hsl(17,72%,43%); outline-offset: 2px;` em todos os elementos interativos.
- **Semântica**: Hierarquia correta de headings (H1, H2, H3).
- **Labels**: Todo input com `<label>` associado.
- **Alt text**: Descrever conteúdo relevante em todas as imagens.
- **prefers-reduced-motion**: Honrado globalmente.

---

## 6. Arquivos de referência

| Arquivo | O que é |
|---|---|
| `docs/design-system-v2/DESIGN_SYSTEM.md` | Cópia da spec v1.0 (esta mesma, em formato portátil) |
| `docs/design-system-v2/design-tokens.json` | Tokens estruturados em JSON (machine-readable) |
| `docs/design-system-v2/design-system-preview.html` | Preview visual estático de todos os componentes |
| `docs/design-system-v2/design-system.fig` | Placeholder representativo do canvas Figma |
| `docs/design-system-v2/DESIGN_SYSTEM.pdf` | Mesma spec em PDF |

> **Nota:** o arquivo `docs/design-system-v2/` é material de referência.
> Não editar — é um snapshot da v1.0. Mudanças no design system devem
> ser feitas aqui em `docs/DESIGN_SYSTEM.md` (esta página canônica) e
> o snapshot regenerado.
