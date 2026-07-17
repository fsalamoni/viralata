# UI Standards — Padrões de Implementação

> Referência operacional para implementar UI consistente na Viralata.
> Para tokens e design oficial, ver `docs/DESIGN_SYSTEM.md`.
> Para padrões DS_V2 auditados, ver `docs/AUDIT_DS_V2.md`.

---

## Regras de Ouro

1. **SEMPRE usar tokens semânticos** (`bg-primary`, `text-foreground`, `border-border`) — nunca cores literais Tailwind.
2. **SEMPRE dark mode** — toda cor de background/badge/borda precisa ter variante `dark:`.
3. **SEMPRE Skeleton + EmptyState** em listas/tabelas loading states.
4. **Tabs com 5+ items** → `arena-admin-tabs` (`flex-nowrap + overflow-x-auto`), nunca `arena-tab-bar` (flex-wrap).

---

## Tokens Semânticos (CSS Custom Properties)

### Cores de Background

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-background` | `#F8F5F0` | Fundo base |
| `bg-card` | `#FFFFFF` | Cards, painéis |
| `bg-muted` | `#EDE4D6` | Fundos secundários |
| `bg-primary` | `#C85A28` | CTAs, ações |
| `bg-destructive` | `#E74C3C` | Erros, exclusões |
| `bg-success` | `#26A65B` | Sucesso |

### Cores de Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `text-foreground` | `#2D1F14` | Texto principal |
| `text-muted-foreground` | `#6B5D52` | Texto secundário |
| `text-primary` | `#C85A28` | Links, destaques |
| `text-destructive` | `#E74C3C` | Erros |
| `text-success` | `#26A65B` | Sucesso |
| `text-card-foreground` | `#2D1F14` | Texto sobre bg-card |

### Bordas

| Token | Uso |
|-------|-----|
| `border-border` | Bordas de cards, inputs, tabelas |
| `border-input` | Bordas de inputs |
| `border-primary` | Bordas de destaque |
| `border-destructive` | Bordas de erro |

---

## Dark Mode

### Padrão Obrigatório

Toda cor de UI precisa de variante dark:

```jsx
// ✅ CORRETO — tem dark mode
<span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
  Disponível
</span>

// ❌ ERRADO — sem dark mode
<span className="bg-emerald-100 text-emerald-800">
  Disponível
</span>
```

### Armadilha Comum: bg-white/80

`bg-white/80` é **invisível** em dark mode (fundo escuro). Substituir por:

```jsx
// ❌ ERRADO
<div className="border-white/80 bg-white/80 shadow-lg">

// ✅ CORRETO
<div className="border-border bg-card shadow-lg">
```

---

## Loading States

### Skeleton

```jsx
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton array for lists
const LoadingSkeleton = () => (
  <>
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
    ))}
  </>
);

// Usage
{isLoading ? <LoadingSkeleton /> : data?.map(item => <ItemCard key={item.id} {...item} />)}
```

### EmptyState

```jsx
import { EmptyState } from '@/components/ui/empty-state';

{!isLoading && data?.length === 0 && (
  <EmptyState
    icon={<PawPrint />}
    title="Nenhum pet encontrado"
    description="Tente ajustar os filtros de busca."
  />
)}
```

---

## Tabs / Navegação

### 5+ items → arena-admin-tabs

```jsx
// ❌ ERRADO — arena-tab-bar faz wrap em 2 fileiras
<div className="arena-tab-bar flex flex-wrap gap-1">
  {tabs.map(t => <Tab key={t.value} value={t.value}>{t.label}</Tab>)}
</div>

// ✅ CORRETO — arena-admin-tabs com scroll horizontal
<div className="arena-admin-tabs">
  <TabsList className="flex flex-nowrap overflow-x-auto">
    {tabs.map(t => <Tab key={t.value} value={t.value}>{t.label}</Tab>)}
  </TabsList>
</div>
```

### 2-4 items → arena-tab-bar OK

```jsx
// arena-tab-bar é aceitável para tabs curtas (2-4 items)
<div className="arena-tab-bar">
  <TabsList className="flex flex-wrap gap-1">
    <Tab value="overview">Visão Geral</Tab>
    <Tab value="team">Equipe</Tab>
  </TabsList>
</div>
```

---

## Badges de Status

```jsx
// Padrão de badge de status com dark mode
const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  adopted: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

<span className={STATUS_STYLES[status]}>
  {LABEL}
</span>
```

⚠️ **NUNCA usar `bg-emerald-100` sem a variante `dark:bg-emerald-900/40`** — o badge fica invisível em dark mode.

---

## Cards / Containers

### Card Padrão (DS_V2)

```jsx
<div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
  {/* conteúdo */}
</div>
```

### Card com Hover

```jsx
<div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-border/80">
  {/* conteúdo */}
</div>
```

### Arena Panels (Glass Effect)

```jsx
<div className="arena-panel rounded-3xl border border-border/60 bg-white/60 p-6 backdrop-blur-sm">
  {/* conteúdo com glass effect */}
</div>

<div className="arena-panel-strong rounded-3xl bg-gradient-to-br from-[hsl(16,60%,30%)] to-[hsl(20,25%,11%)] p-6">
  {/* conteúdo escuro (banner, hero) */}
</div>
```

---

## Form Inputs

```jsx
import { Input } from '@/components/ui/input';

// Input padrão
<Input
  className="rounded-xl border border-border bg-card text-foreground
            placeholder:text-muted-foreground
            focus:border-primary focus:ring-2 focus:ring-primary/20"
  placeholder="Digite o nome do abrigo..."
/>

// Com erro
<Input
  className="rounded-xl border border-destructive bg-destructive/5"
  aria-invalid="true"
  aria-describedby="name-error"
/>
```

---

## Data Display (Tabelas)

```jsx
// Table wrapper com overflow-x
<div className="arena-table-wrap w-full overflow-x-auto rounded-2xl border border-border bg-card">
  <Table>
    <TableHeader>
      <TableRow className="border-border hover:bg-transparent">
        <TableHead className="text-muted-foreground">Nome</TableHead>
        <TableHead className="text-muted-foreground">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data?.map(item => (
        <TableRow key={item.id} className="border-border">
          <TableCell>{item.name}</TableCell>
          <TableCell><Badge>{item.status}</Badge></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

⚠️ **SEMPRE `overflow-x-auto`** em tabelas — evita scroll horizontal na página.

---

## Ícones + Cores

```jsx
import { AlertTriangle, CheckCircle } from 'lucide-react';

// Erro
<AlertTriangle className="h-4 w-4 text-destructive" />

// Sucesso
<CheckCircle className="h-4 w-4 text-success" />
```

---

## Acessibilidade (WCAG AA)

| Padrão | Implementação |
|---------|---------------|
| Imagens | `alt="descrição"` ou `alt=""` se decorativa |
| Inputs | `aria-label` ou label associado |
| Badges dinâmicos | `role="status"` ou `aria-live="polite"` |
| Botões sem texto | `aria-label="Descrição da ação"` |
| Contraste mínimo | 4.5:1 para texto normal, 3:1 para texto grande |
| Focus visível | `focus-visible:ring-2 focus-visible:ring-primary` |
| Erros | `aria-invalid="true"` + `aria-describedby` |

---

## Anti-Patterns

| ❌ Errado | ✅ Correto |
|-----------|-----------|
| `bg-white/80` (invisível em dark) | `bg-card` ou `bg-background` |
| `bg-emerald-100` sem dark | `dark:bg-emerald-900/40 dark:text-emerald-300` |
| `text-red-600` | `text-destructive` |
| Native `<select>` | `<Select>` do shadcn/ui |
| Native `<button>` | `<Button>` do shadcn/ui |
| Inline styles | Classes Tailwind com tokens |
| `orange-500`, `gray-50` | Tokens semânticos |
| Tabela sem `overflow-x-auto` | Wrapping com scroll horizontal |
