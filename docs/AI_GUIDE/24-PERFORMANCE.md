# 24-PERFORMANCE.md — Performance Optimization

> **Atualizado em 2026-07-24** (inclui LazyAdSlot + CollapsibleCard lazy)

## §1. Core Web Vitals (Google)

Métricas oficiais que afetam SEO e UX:

| Métrica | Limite | O que medir |
|---------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Tempo até maior elemento visível |
| **FID** (First Input Delay) | < 100ms | Tempo até primeira interação |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Estabilidade visual |
| **INP** (Interaction to Next Paint) | < 200ms | Reatividade a interações |
| **TTFB** (Time to First Byte) | < 800ms | Tempo de resposta do servidor |
| **FCP** (First Contentful Paint) | < 1.8s | Tempo até primeiro conteúdo |

## §2. Medir Core Web Vitals

### §2.1. Lighthouse (local)

```bash
# DevTools → Lighthouse → Performance
# Ou via CLI:
npx lighthouse https://viralata.web.app --output=json --output-path=./report.json
```

### §2.2. PageSpeed Insights (remoto)

https://pagespeed.web.dev/

Cole URL: `https://viralata.web.app/feed`

### §2.3. Web Vitals (produção)

```js
import { onLCP, onFID, onCLS, onINP } from 'web-vitals';

onLCP(console.log);
onFID(console.log);
onCLS(console.log);
onINP(console.log);
```

### §2.4. Google Analytics

```js
gtag('event', 'web_vitals', {
  metric_name: 'LCP',
  metric_value: lcp,
  metric_id: lcpId,
});
```

## §3. Bundle Optimization

### §3.1. Analisar bundle

```bash
# Visualizar
npx vite-bundle-visualizer

# Saída: treemap de chunks
```

### §3.2. Code splitting (já feito)

```js
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        if (id.includes('node_modules/react')) return 'vendor-react';
        if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
        if (id.includes('node_modules/firebase')) return 'vendor-firebase';
      },
    },
  },
},
```

### §3.3. Lazy loading

```jsx
// ✅ Componentes grandes lazy
const PetDetailV3 = React.lazy(() => import('./PetDetailV3'));
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));

<Suspense fallback={<Skeleton />}>
  <PetDetailV3 />
</Suspense>
```

### §3.4. Tree-shaking (vendor)

Framer Motion: importar apenas o necessário:

```js
// ❌ Ruim: import tree inteiro
import { motion } from 'framer-motion';

// ✅ Melhor: import específico
import { motion } from 'framer-motion/dist/framer-motion';
```

### §3.5. Preload (critical chunks)

```html
<!-- index.html -->
<link rel="preload" href="/assets/index-XXX.js" as="script">
<link rel="preload" href="/assets/index-XXX.css" as="style">
```

### §3.6. Compression

```js
// vite.config.js
import viteCompression from 'vite-plugin-compression';

plugins: [
  viteCompression({
    algorithm: 'gzip',
    ext: '.gz',
  }),
],
```

## §4. Image Optimization

### §4.1. WebP com fallback

```html
<picture>
  <source srcset="pet-320w.webp 320w, pet-640w.webp 640w" type="image/webp">
  <img src="pet-640w.jpg" alt="Rex" loading="lazy" decoding="async" class="w-full aspect-square object-cover">
</picture>
```

### §4.2. Srcset + sizes

```jsx
<img
  src={pet.photo_url}
  srcSet={`
    ${pet.photo_url}_320w.webp 320w,
    ${pet.photo_url}_640w.webp 640w,
    ${pet.photo_url}_1024w.webp 1024w
  `}
  sizes="(max-width: 768px) 100vw, 50vw"
  alt={pet.name}
  loading="lazy"
  decoding="async"
  className="w-full aspect-square object-cover"
/>
```

### §4.3. Cloudinary / imgix

```js
// Build URL com transformações
const url = `https://res.cloudinary.com/viralata/image/upload/w_640,h_640,c_fill,q_auto,f_webp/${pet.public_id}`;
```

## §5. Runtime Performance

### §5.1. React.memo

```jsx
// Componente que re-renderiza muito
const PetCard = React.memo(({ pet }) => {
  return <article>...</article>;
});
```

### §5.2. useMemo

```jsx
// Cálculo caro
const sortedPets = useMemo(
  () => pets.sort((a, b) => b.priority_score - a.priority_score),
  [pets]
);
```

### §5.3. useCallback

```jsx
// Função passada como prop
const handleAdopt = useCallback((pet) => {
  navigate(`/quero-adotar/${pet.id}`);
}, [navigate]);
```

### §5.4. Virtualization (listas longas)

```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={pets.length}
  itemSize={200}
>
  {({ index, style }) => (
    <div style={style}>
      <PetCard pet={pets[index]} />
    </div>
  )}
</FixedSizeList>
```

### §5.5. Debounce / Throttle

```js
// Hook useDebounce
import { useEffect, useState } from 'react';

export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Uso
const debouncedSearch = useDebounce(search, 300);
```

## §6. React Query Optimization

### §6.1. staleTime correto

```js
// ❌ Errado: refetch sempre
staleTime: 0,

// ✅ Certo: 30s para dados que mudam pouco
staleTime: 30_000,

// ✅ Certo: 5min para dados estáticos
staleTime: 5 * 60 * 1000,
```

### §6.2. select para transformar dados

```js
const { data: petNames } = useQuery({
  queryKey: ['pets'],
  queryFn: () => fetch('/api/pets').then(r => r.json()),
  select: (data) => data.map(p => p.name),  // só o necessário
  staleTime: 60_000,
});
```

### §6.3. Prefetch

```js
// Em hover de link
const queryClient = useQueryClient();

<Link
  to={`/pet/${pet.id}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['pet', pet.id],
      queryFn: () => getPet(pet.id),
    });
  }}
>
  {pet.name}
</Link>
```

## §7. CSS Optimization

### §7.1. Tailwind JIT

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  // ↑ só inclui classes usadas
};
```

### §7.2. Critical CSS

```html
<!-- Inline critical CSS no <head> -->
<style>
  /* Above-the-fold styles */
  .hero { ... }
  .container { ... }
</style>
```

### §7.3. CSS purging

```js
// vite.config.js
// Tailwind já faz purge automático
```

## §8. JavaScript Optimization

### §8.1. Code splitting por rota

```jsx
// App.jsx
const Home = lazy(() => import('./pages/Home'));
const Feed = lazy(() => import('./pages/Feed'));
const PetDetail = lazy(() => import('./pages/PetDetail'));
// etc
```

### §8.2. Dynamic import

```js
// ❌ Ruim: import sempre
import { formatDate } from './dateUtils';

// ✅ Bom: import sob demanda
const { formatDate } = await import('./dateUtils');
```

### §8.3. Polyfills (sob demanda)

```js
// .babelrc
{
  "presets": [
    ["@babel/preset-env", {
      "useBuiltIns": "usage",  // só polyfills necessários
      "corejs": 3
    }]
  ]
}
```

## §9. Network Optimization

### §9.1. HTTP/2 + Server Push (Firebase)

Firebase Hosting já usa HTTP/2.

### §9.2. Cache-Control headers

```json
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=2592000" }
        ]
      }
    ]
  }
}
```

### §9.3. CDN (Firebase automático)

Firebase Hosting já é CDN.

## §10. Monitoring em Produção

### §10.1. Web Vitals (Sentry)

```js
import * as Sentry from '@sentry/react';
import { onLCP, onFID, onCLS, onINP } from 'web-vitals';

Sentry.init({ dsn: '...', tracesSampleRate: 0.1 });

onLCP(({ value }) => Sentry.captureMessage('LCP', { extra: { value } }));
onFID(({ value }) => Sentry.captureMessage('FID', { extra: { value } }));
onCLS(({ value }) => Sentry.captureMessage('CLS', { extra: { value } }));
onINP(({ value }) => Sentry.captureMessage('INP', { extra: { value } }));
```

### §10.2. Performance Observer

```js
const perfObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'navigation') {
      console.log('TTFB:', entry.responseStart);
    }
    if (entry.entryType === 'paint') {
      console.log(entry.name, entry.startTime);
    }
  });
});

perfObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
```

### §10.3. Bundle Analysis CI

```yaml
# .github/workflows/bundle-analysis.yml
- name: Analyze bundle
  run: |
    npx vite build
    npx vite-bundle-visualizer --output bundle.html
- name: Comment PR
  uses: actions/upload-artifact@v3
  with:
    name: bundle-analysis
    path: bundle.html
```

## §11. Otimizações Específicas do Viralata

### §11.1. Feed de pets (sw-v74+)

- Pagination (12 por página)
- Lazy load de imagens
- Filtros client-side (sem refetch)
- **LazyAdSlot** (NEW) — só carrega quando visível
- **CollapsibleCard lazy mount** (NEW) — body só monta após 1ª expansão
- AdSlot **defer** (NEW) — query só quando browser idle

Ver `27-PERFORMANCE-FEED.md` para detalhes completos.

### §11.2. Detalhe de pet

- Hero LCP com prioridade
- Skeleton em < 100ms

### §11.3. Admin

- Tabelas virtualizadas (se > 100 rows)
- Filtros server-side

### §11.4. PWA

- Precache 211 entries (6.5MB)
- NetworkFirst para HTML
- CacheFirst para assets

## §12. Padrão: LazyAdSlot (NEW, 2026-07-24)

Para qualquer AdSlot que NÃO está acima da fold, use `LazyAdSlot`
em vez de `AdSlotUnified`. Carrega só quando:

1. Browser está idle (`requestIdleCallback`)
2. Componente está visível (`IntersectionObserver`)
3. Timeout de 3s (sempre carrega eventualmente)

```jsx
// ❌ Bloqueia FCP (2 queries Firestore no load)
<AdSlotUnified slotId="top" />

// ✅ Zero impacto no FCP
<LazyAdSlot slotId="top" />

// ✅ Se for LCP (acima da fold), eager=true
<LazyAdSlot slotId="hero" eager />
```

**Resultado**: -67% LCP, -50% FCP, -100% render blocks.

Ver `27-PERFORMANCE-FEED.md` §4.1.

## §13. Padrão: CollapsibleCard lazy mount (NEW, 2026-07-24)

```jsx
// ❌ Body renderiza mesmo fechado
<CollapsibleCard title="Ver todos">
  {pets.map(p => <PetCard pet={p} />)}  // children SEMPRE montam
</CollapsibleCard>

// ✅ Body só monta após 1ª expansão (default)
<CollapsibleCard title="Ver todos" lazyMount>
  {pets.map(p => <PetCard pet={p} />)}  // só após click
</CollapsibleCard>
```

**Impacto**: queries internas só disparam quando user interage.

## §14. Checklist de Performance

Antes de deploy:

- [ ] Lighthouse score > 90 em todas as métricas
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Bundle principal < 300KB
- [ ] Imagens WebP
- [ ] Lazy load em imagens abaixo da fold
- [ ] **LazyAdSlot** em AdSlots não-LCP
- [ ] **CollapsibleCard lazyMount** em collapsibles com query interna
- [ ] Sem console.log em prod
- [ ] Sem polyfills desnecessários
- [ ] React.memo em componentes re-renderizados
- [ ] useMemo em cálculos caros
- [ ] staleTime correto em React Query

## §15. Quando Pedir Review de Performance

- Adicionar componente pesado
- Adicionar lib nova
- Aumentar bundle > 50KB
- Adicionar imagem grande
- Adicionar tabela com > 100 rows
- Implementar feature em tempo real

## §16. Recursos Externos

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Bundle Phobia](https://bundlephobia.com/) (analisa npm packages)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

**Próxima leitura**: `27-PERFORMANCE-FEED.md` (otimização detalhada do Feed)
