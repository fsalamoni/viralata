# 05-DESIGN-SYSTEM.md — Design System, Tokens, Cores

> **Atualizado em 2026-07-24**

## §1. Princípios

1. **Mobile-first**: projetar primeiro para mobile, depois para desktop
2. **Acessibilidade**: WCAG 2.1 AA mínimo, ARIA correto
3. **Consistência**: tokens semânticos, não literais
4. **Baixa conectividade**: imagens otimizadas, lazy load, skeleton
5. **Paleta quente**: terracota + creme (não usar azul de "tech")
6. **Zero emoji em UI**: emojis NÃO são permitidos (D-USER-EMOJIS)
7. **Sem placeholder visual de "em progresso"**: animações, skeleto, ou
   real (não usar `// TODO: implementar` visual)

## §2. Paleta de Cores

### §2.1. Cores da Marca

| Token | Hex | Uso |
|-------|-----|-----|
| `terracota` | `#A0312D` | Botões primários, CTAs |
| `terracota-dark` | `#7B1F1A` | Hover/active |
| `terracota-light` | `#C4544F` | Backgrounds suaves |
| `creme` | `#FAF3E7` | Background principal |
| `oliva` | `#4A5743` | Acentos, links |
| `mostarda` | `#D4A017` | Badges, destaques |
| `cinza-quente` | `#3D3A38` | Texto principal |
| `cinza-claro` | `#8C8B8A` | Texto secundário |

### §2.2. Cores Semânticas

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-background` | creme | Backgrounds |
| `bg-foreground` | cinza-quente | Texto |
| `bg-muted` | `bg-creme/50` | Backgrounds secundários |
| `bg-muted-foreground` | cinza-claro | Texto secundário |
| `bg-primary` | terracota | Botões primários |
| `bg-primary-foreground` | creme | Texto em botões primários |
| `bg-accent` | oliva | Acentos |
| `bg-accent-foreground` | creme | Texto em acentos |
| `bg-destructive` | terracota-dark | Ações destrutivas |
| `bg-border` | `bg-cinza-claro/20` | Bordas |

### §2.3. Cores por Domínio

| Domínio | Cor | Uso |
|---------|-----|-----|
| Pets (público) | rosa-laranja | `from-rose-500 via-orange-500 to-amber-500` (Hero) |
| Adoção | verde-azul | `from-emerald-500 to-teal-500` (success) |
| Comunidade | violeta | `from-violet-500 to-purple-500` |
| Organização | amarelo | `from-yellow-500 to-orange-500` |
| Admin | cinza | `from-slate-700 to-slate-900` |

### §2.4. Não usar (regra absoluta)

- ❌ Azul padrão do Tailwind (`bg-blue-500`) — usar oliva ou terra para CTAs
- ❌ Verde padrão do Tailwind (`bg-green-500`) — usar olive ou amarelo
- ❌ Cinza puro (`bg-gray-100`) — usar `bg-muted` (creme)
- ❌ Branco puro (`bg-white`) — usar `bg-background` (creme)
- ❌ Emoji como ícone — usar `lucide-react`

## §3. Tipografia

### §3.1. Fontes

| Família | Uso | Carregamento |
|---------|-----|--------------|
| **Manrope** | UI (text, headings) | Google Fonts |
| **JetBrains Mono** | Code, IDs | Google Fonts |

### §3.2. Escala

| Nível | Tamanho | Peso | Uso |
|-------|---------|------|-----|
| `text-xs` | 12px | 400 | Badges, helpers |
| `text-sm` | 14px | 400 | Body small |
| `text-base` | 16px | 400 | Body |
| `text-lg` | 18px | 500 | Body large |
| `text-xl` | 20px | 600 | Subtitles |
| `text-2xl` | 24px | 700 | H4 |
| `text-3xl` | 30px | 700 | H3 |
| `text-4xl` | 36px | 800 | H2 |
| `text-5xl` | 48px | 800 | H1 mobile |
| `text-6xl` | 60px | 800 | H1 desktop |

### §3.3. Line height

- `leading-tight` (1.25) — headings
- `leading-normal` (1.5) — body
- `leading-relaxed` (1.625) — body large, leitura

## §4. Espaçamento

Múltiplos de 4px. Usar tokens do Tailwind:

| Token | px | Uso |
|-------|----|----|
| `p-0` / `m-0` | 0 | sem espaço |
| `p-1` / `m-1` | 4 | micro |
| `p-2` / `m-2` | 8 | tight |
| `p-3` / `m-3` | 12 | default |
| `p-4` / `m-4` | 16 | padrão |
| `p-6` / `m-6` | 24 | medium |
| `p-8` / `m-8` | 32 | large |
| `p-12` / `m-12` | 48 | section |
| `p-16` / `m-16` | 64 | section large |
| `p-24` / `m-24` | 96 | page |

## §5. Raios (Border Radius)

| Token | px | Uso |
|-------|----|----|
| `rounded-none` | 0 | sem raio |
| `rounded-sm` | 4 | badges |
| `rounded` | 8 | default |
| `rounded-md` | 12 | cards |
| `rounded-lg` | 16 | cards large |
| `rounded-xl` | 24 | modais, sheets |
| `rounded-full` | 9999 | botões circular, avatares |

## §6. Sombras

| Token | CSS | Uso |
|-------|-----|-----|
| `shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.05)` | botões |
| `shadow` | `0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | cards |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | cards hovered |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | modais |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | dropdowns |

## §7. Componentes (shadcn/ui)

| Componente | Path | Documentação |
|------------|------|--------------|
| Button | `src/components/ui/button.jsx` | [shadcn](https://ui.shadcn.com/docs/components/button) |
| Card | `src/components/ui/card.jsx` | [shadcn](https://ui.shadcn.com/docs/components/card) |
| Input | `src/components/ui/input.jsx` | [shadcn](https://ui.shadcn.com/docs/components/input) |
| Select | `src/components/ui/select.jsx` | [shadcn](https://ui.shadcn.com/docs/components/select) |
| Dialog | `src/components/ui/dialog.jsx` | [shadcn](https://ui.shadcn.com/docs/components/dialog) |
| Tabs | `src/components/ui/tabs.jsx` | [shadcn](https://ui.shadcn.com/docs/components/tabs) |
| Toast | `src/components/ui/sonner.jsx` | [Sonner](https://sonner.emilkowal.ski/) |
| Skeleton | `src/components/ui/skeleton.jsx` | custom |
| Avatar | `src/components/ui/avatar.jsx` | [shadcn](https://ui.shadcn.com/docs/components/avatar) |
| Badge | `src/components/ui/badge.jsx` | [shadcn](https://ui.shadcn.com/docs/components/badge) |
| Calendar | `src/components/ui/calendar.jsx` | [shadcn](https://ui.shadcn.com/docs/components/calendar) |
| Switch | `src/components/ui/switch.jsx` | [shadcn](https://ui.shadcn.com/docs/components/switch) |
| Checkbox | `src/components/ui/checkbox.jsx` | [shadcn](https://ui.shadcn.com/docs/components/checkbox) |

## §8. Padrões de UI

### §8.1. Hero de Página

```jsx
<section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white py-12">
  <div className="container">
    <h1 className="text-3xl md:text-5xl font-extrabold">{title}</h1>
    <p className="text-lg md:text-xl text-white/90 mt-2">{subtitle}</p>
  </div>
</section>
```

### §8.2. Card de Pet (Feed)

```jsx
<article className="rounded-md overflow-hidden shadow bg-card">
  <img src={photo_url} alt={name} className="w-full aspect-square object-cover" />
  <div className="p-3">
    <h3 className="font-semibold text-lg">{name}</h3>
    <p className="text-sm text-muted-foreground">
      {breed} • {city} • {size_label}
    </p>
  </div>
</article>
```

### §8.3. Botão Primário

```jsx
<button className="bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium hover:bg-primary/90 active:scale-95 transition">
  Adotar
</button>
```

### §8.4. Empty State

```jsx
<div className="flex flex-col items-center justify-center p-8 text-center">
  <Dog className="w-12 h-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold">{title}</h3>
  <p className="text-sm text-muted-foreground mt-1">{description}</p>
</div>
```

### §8.5. Error State

```jsx
<ErrorState
  title="Erro ao carregar"
  description="Tente novamente em alguns instantes."
  action={{ label: "Tentar de novo", onClick: refetch }}
/>
```

### §8.6. Skeleton

```jsx
<div className="animate-pulse">
  <div className="bg-muted rounded-md w-full aspect-square" />
  <div className="p-3 space-y-2">
    <div className="h-4 bg-muted rounded w-3/4" />
    <div className="h-3 bg-muted rounded w-1/2" />
  </div>
</div>
```

## §9. Estados Visuais

| Estado | Componente | Uso |
|--------|-----------|-----|
| Loading | `Skeleton` | Primeira carga |
| Loading (secundário) | Spinner / Sonner | Mutations |
| Empty | EmptyState pattern | Lista vazia |
| Error | `ErrorState` | Erro de carregamento |
| Offline | `OfflineBanner` | Sem internet |
| Maintenance | `MaintenanceBanner` | Plataforma em manutenção |

## §10. Ícones (lucide-react)

- **Sempre** importar do `lucide-react`
- **Sempre** listar no import todos os ícones usados em JSX
- **Validar** com `node scripts/validate-lucide-imports.mjs`
- **Tamanho padrão**: `w-4 h-4` (inline), `w-5 h-5` (button), `w-6 h-6` (heading)
- **Cor padrão**: `text-foreground` (default), `text-muted-foreground` (secundário)

```jsx
// ✅ Correto
import { Heart, MessageCircle, Share2 } from 'lucide-react';
<Heart className="w-5 h-5 text-primary" />

// ❌ Errado
import * as LucideIcons from 'lucide-react';  // tree-shaking não pega tudo
<LucideIcons.Heart />  // funciona mas não é explícito
```

## §11. Animações (Framer Motion)

- **Sparingly**: usar em CTAs principais, transições de página, modais
- **Padrão**: `transition={{ duration: 0.2, ease: 'easeOut' }}`
- **Não abusar**: animações excessivas distraem (público de baixa renda, baixa conectividade)

```jsx
// Exemplo: Card de pet com hover
<motion.article
  whileHover={{ y: -2, transition: { duration: 0.2 } }}
  className="rounded-md overflow-hidden shadow bg-card"
>
  {/* ... */}
</motion.article>
```

## §12. Imagens

### §12.1. Otimização

- **Formato**: WebP (com fallback JPG)
- **Tamanhos**: 320, 640, 1024, 1920
- **Loading**: `loading="lazy"` (exceto hero/LCP)
- **Decoding**: `decoding="async"`
- **Aspect ratio**: `aspect-square` ou `aspect-video` fixo

### §12.2. PetCard thumbnail

```jsx
<img
  src={pet.photo_url}
  alt={pet.name}
  loading="lazy"
  decoding="async"
  className="w-full aspect-square object-cover"
  srcSet={`
    ${pet.photo_url}_320w.webp 320w,
    ${pet.photo_url}_640w.webp 640w,
    ${pet.photo_url}_1024w.webp 1024w
  `}
  sizes="(max-width: 768px) 50vw, 33vw"
/>
```

## §13. Acessibilidade

### §13.1. Princípios

- **Keyboard**: tudo navegável por Tab
- **Focus visible**: `focus-visible:ring-2 focus-visible:ring-primary`
- **aria-label** em botões de ícone
- **aria-current="page"** em links ativos
- **role="status"** em skeletons, toasts
- **role="alert"** em erros críticos
- **Contraste mínimo 4.5:1** (WCAG AA)

### §13.2. Padrão de Link Ativo

```jsx
<NavLink
  to="/feed"
  className={({ isActive }) =>
    isActive
      ? 'text-primary font-semibold'
      : 'text-foreground hover:text-primary/80'
  }
  aria-current={isActive ? 'page' : undefined}
>
  Feed
</NavLink>
```

## §14. Documentação de Padrões

| Pattern | Documentado em |
|---------|----------------|
| Feed cards | `modules/01-PETS.md` §2 |
| Adoption wizard | `modules/12-ADOPTION.md` §2 |
| Admin dashboard | `modules/05-ADMIN.md` §2 |
| Club detail | `modules/02-ORGANIZATIONS.md` §3 |
| Chat thread | `modules/08-CHAT.md` §2 |

---

**Próxima leitura**: `06-PWA-CACHE.md` (Service Worker, hotfixes).
