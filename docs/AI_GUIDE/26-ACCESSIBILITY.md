# 26-ACCESSIBILITY.md — Accessibility (a11y) Patterns

> **Atualizado em 2026-07-24**
>
> Padrões de acessibilidade WCAG 2.1 AA, ARIA, keyboard, screen
> readers, color contrast.

## §1. Visão Geral

**WCAG 2.1 AA** é o padrão mínimo. Existem 3 níveis:
- **A**: mínimo (obrigatório)
- **AA**: recomendado (padrão legal em vários países)
- **AAA**: máximo (nem sempre possível)

### §1.1. Princípios (POUR)

- **P**erceivable: informação deve ser apresentada de forma que todos percebam
- **O**perable: interface deve ser operável (mouse, keyboard, touch)
- **U**nderstandable: informação e operação devem ser compreensíveis
- **R**obust: conteúdo deve funcionar com tecnologias assistivas

## §2. Princípios Práticos

### §2.1. Semântica HTML

```jsx
// ❌ Ruim: <div> para tudo
<div onClick={handleClick}>Clique aqui</div>

// ✅ Bom: <button>
<button onClick={handleClick}>Clique aqui</button>
```

```jsx
// ❌ Ruim: heading errado
<h1>...</h1>
<h4>Sub-título</h4>  // pula h2, h3

// ✅ Bom: hierarquia correta
<h1>Título principal</h1>
<h2>Seção</h2>
<h3>Sub-seção</h3>
```

### §2.2. Contraste de Cores

| Texto | Background | Mínimo |
|-------|-----------|--------|
| Texto normal | Cor | 4.5:1 |
| Texto grande (> 18px) | Cor | 3:1 |
| UI components | Cor | 3:1 |

**Validação**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools → Accessibility panel

**Viralata usa tokens semânticos** que já têm contraste AA.

### §2.3. Foco Visível

```css
/* Tailwind */
.focus-visible:ring-2
.focus-visible:ring-primary
.focus-visible:ring-offset-2

/* OU */
*:focus-visible {
  outline: 2px solid theme('colors.primary');
  outline-offset: 2px;
}
```

```jsx
// ❌ Ruim: sem foco visível
<button>...</button>

// ✅ Bom: com foco visível
<button className="focus-visible:ring-2 focus-visible:ring-primary">
  ...
</button>
```

## §3. ARIA

### §3.1. Quando usar ARIA

ARIA (Accessible Rich Internet Applications) complementa HTML, mas
**não substitui semântica HTML**.

**Regra**: prefira HTML semântico. Use ARIA apenas quando necessário.

### §3.2. Padrões comuns

#### aria-label

```jsx
// Botão de ícone sem texto
<button aria-label="Fechar">
  <X className="w-5 h-5" />
</button>
```

#### aria-current

```jsx
// Link ativo
<NavLink
  to="/feed"
  aria-current={isActive ? 'page' : undefined}
>
  Feed
</NavLink>
```

#### aria-expanded

```jsx
// Dropdown
<button
  aria-expanded={isOpen}
  aria-controls="menu-1"
  onClick={() => setIsOpen(!isOpen)}
>
  Menu
</button>
{isOpen && (
  <ul id="menu-1" role="menu">
    <li role="menuitem">Item 1</li>
  </ul>
)}
```

#### aria-live

```jsx
// Notificação que aparece
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>
```

#### aria-describedby

```jsx
// Input com helper
<input
  id="email"
  aria-describedby="email-help"
  aria-invalid={hasError}
/>
<p id="email-help">
  {hasError ? 'Email inválido' : 'Use seu email principal'}
</p>
```

#### aria-busy

```jsx
// Loading
<div aria-busy={isLoading}>
  {isLoading ? <Spinner /> : <Content />}
</div>
```

#### role

```jsx
// Alert
<div role="alert">
  Erro ao salvar!
</div>

// Status
<div role="status">
  Carregando...
</div>
```

### §3.3. Padrões WAI-ARIA

- [Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubutton/)

shadcn/ui já implementa esses padrões.

## §4. Keyboard Navigation

### §4.1. Tab order

```jsx
// ❌ Ruim: tabindex positivo (muda ordem)
<input tabIndex={2} />
<input tabIndex={1} />

// ✅ Bom: ordem natural no DOM
<form>
  <input />  {/* tab 1 */}
  <input />  {/* tab 2 */}
  <button /> {/* tab 3 */}
</form>
```

### §4.2. Skip links

```jsx
// No Layout, primeiro item focusable
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-white"
>
  Pular para conteúdo principal
</a>

<main id="main-content" tabIndex={-1}>
  {/* conteúdo */}
</main>
```

### §4.3. Keyboard handlers

```jsx
function Modal({ onClose, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return (
    <div role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### §4.4. Focus trap (em modais)

```jsx
import { useRef, useEffect } from 'react';

function Modal({ onClose, children }) {
  const modalRef = useRef(null);
  
  useEffect(() => {
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    
    first?.focus();
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);
  
  return <div ref={modalRef}>{children}</div>;
}
```

## §5. Screen Readers

### §5.1. sr-only (só para screen reader)

```jsx
<button>
  <Heart className="w-5 h-5" />
  <span className="sr-only">Adicionar aos favoritos</span>
</button>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### §5.2. aria-hidden (esconder de screen reader)

```jsx
// Ícone decorativo
<button>
  <Check aria-hidden="true" className="w-5 h-5" />
  Confirmar
</button>
```

### §5.3. aria-labelledby (label múltiplo)

```jsx
<section aria-labelledby="section-title" aria-describedby="section-desc">
  <h2 id="section-title">Adoção</h2>
  <p id="section-desc">
    Encontre pets para adoção em todo o Brasil
  </p>
</section>
```

## §6. Imagens e Mídia

### §6.1. Alt text

```jsx
// ❌ Ruim: vazio ou redundante
<img src="pet.jpg" alt="" />
<img src="pet.jpg" alt="imagem" />

// ✅ Bom: descritivo
<img src="pet.jpg" alt="Cachorro Rex, vira-lata, porte médio, em São Paulo" />

// ✅ Decorativo (skip para screen reader)
<img src="decorative.jpg" alt="" role="presentation" />
```

### §6.2. Decisão tree

```
A imagem é informativa?
├── SIM → alt descritivo
└── NÃO
    ├── É decorativa? → alt="" role="presentation"
    └── É redundante? → aria-hidden="true"
```

### §6.3. Vídeos

```jsx
<video controls>
  <source src="pet-story.mp4" type="video/mp4" />
  <track kind="captions" src="captions.vtt" srcLang="pt-BR" label="Português" default />
  <p>Seu browser não suporta vídeo. <a href="pet-story.mp4">Baixar vídeo</a></p>
</video>
```

## §7. Forms

### §7.1. Labels

```jsx
// ❌ Ruim: sem label
<input type="email" placeholder="Email" />

// ✅ Bom: com label
<div>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />
</div>

// ✅ Aceitável: aria-label (quando label visual não é apropriado)
<input type="search" aria-label="Buscar pets" />
```

### §7.2. Validação

```jsx
<div>
  <label htmlFor="email">Email</label>
  <input 
    id="email" 
    type="email"
    aria-invalid={hasError}
    aria-describedby="email-error"
  />
  {hasError && (
    <p id="email-error" role="alert">
      Email inválido
    </p>
  )}
</div>
```

### §7.3. Required

```jsx
<label htmlFor="name">
  Nome <span aria-hidden="true">*</span>
  <span className="sr-only">(obrigatório)</span>
</label>
<input id="name" required aria-required="true" />
```

## §8. Tabelas

### §8.1. Cabeçalho

```jsx
<table>
  <caption>Pets para adoção</caption>
  <thead>
    <tr>
      <th scope="col">Nome</th>
      <th scope="col">Espécie</th>
      <th scope="col">Cidade</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Rex</th>
      <td>Cachorro</td>
      <td>São Paulo</td>
    </tr>
  </tbody>
</table>
```

## §9. Mobile

### §9.1. Touch targets (mínimo 44x44px)

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

```jsx
<button className="min-w-[44px] min-h-[44px]">
  <X className="w-5 h-5" />
</button>
```

### §9.2. Zoom (não desabilitar)

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

❌ NUNCA: `user-scalable=no` ou `maximum-scale=1` (anti-pattern).

## §10. Auditoria

### §10.1. Lighthouse

```bash
# DevTools → Lighthouse → Accessibility
# Score deve ser >= 95
```

### §10.2. axe DevTools

```js
import { axe } from 'jest-axe';

it('has no a11y violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### §10.3. Screen reader testing

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (grátis) ou JAWS
- **iOS**: VoiceOver (Settings → Accessibility)
- **Android**: TalkBack (Settings → Accessibility)

### §10.4. Manual keyboard testing

1. Desplugue o mouse
2. Navegue a página inteira com Tab
3. Verifique que tudo é focusable
4. Verifique que o foco é visível
5. Use Enter/Space em botões
6. Use Esc para fechar modais
7. Use arrow keys em menus/listas

## §11. Padrões do Viralata

### §11.1. ErrorState

```jsx
<ErrorState
  title="Erro ao carregar"
  description="Tente novamente em alguns instantes."
  action={{ label: "Tentar de novo", onClick: refetch }}
/>
// ↓ gera
<div role="alert">
  <h3>Erro ao carregar</h3>
  <p>Tente novamente em alguns instantes.</p>
  <button>Tentar de novo</button>
</div>
```

### §11.2. Loading (Spinner)

```jsx
<div role="status" aria-live="polite">
  <Spinner />
  <span className="sr-only">Carregando...</span>
</div>
```

### §11.3. Skeleton

```jsx
<div aria-busy="true" aria-label="Carregando lista de pets">
  <div className="animate-pulse">...</div>
</div>
```

### §11.4. NavLink ativo

```jsx
<NavLink
  to="/feed"
  className={({ isActive }) =>
    isActive ? 'text-primary font-bold' : 'text-foreground'
  }
  aria-current={isActive ? 'page' : undefined}
>
  Feed
</NavLink>
```

## §12. Checklist

- [ ] Semântica HTML correta
- [ ] Contraste de cores WCAG AA
- [ ] Foco visível em todos interativos
- [ ] Tab order natural
- [ ] Skip links
- [ ] ARIA correto (aria-label, aria-current, etc)
- [ ] Alt text em imagens
- [ ] Labels em forms
- [ ] Touch targets >= 44x44px
- [ ] Sem zoom desabilitado
- [ ] Lighthouse a11y score >= 95
- [ ] axe DevTools: 0 violations
- [ ] Testado com screen reader
- [ ] Testado com keyboard only

## §13. Recursos

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Próxima leitura**: `05-DESIGN-SYSTEM.md` (tokens), `19-FAQ-AND-MISTAKES.md` (FAQ)
