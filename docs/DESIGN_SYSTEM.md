# Design System — Viralata

> Fundamento visual da plataforma. Para o plano de execução por fases, ver
> `docs/ROADMAP.md`. Este documento é a especificação; a aplicação em código
> acontece na Fase 0/1 do roadmap — nada aqui foi implementado ainda.

## 1. Diagnóstico (por que este documento existe)

O app já tem uma base de design tokens relativamente sofisticada
(`src/index.css` + `tailwind.config.js` + `src/components/ui/button.jsx`):
fontes Manrope (corpo) + Sora (títulos), variáveis HSL para cor, glassmorphism
(`backdrop-blur-xl` + bordas translúcidas), gradientes, raio de borda generoso
(`--radius: 1.25rem`), sombras difusas coloridas e até um grid de fundo sutil
(`.arena-page::before`). O botão padrão (`buttonVariants` em `button.jsx`) já
é um gradiente com hover-lift — não é um `<button>` genérico.

O problema é que essa base foi construída para o produto anterior deste fork
(PickleTour, torneios de pickleball) e **não é usada de forma consistente**:

- `src/pages/Home.jsx`, `src/components/Layout.jsx`, `PetFeed.jsx`,
  `PetDetail.jsx`, `PetCard.jsx` e outras páginas centrais de pets ignoram os
  tokens e usam `bg-orange-500 hover:bg-orange-600` cru, cabeçalho branco
  chapado (`bg-white border-b`), fundo `bg-gray-50` genérico, emoji como
  substituto de imagem (`🐾` gigante no hero) e zero animação — o resultado é
  o visual "template de IA" que motivou este pedido.
- Já outras páginas, como `src/modules/organizations/pages/ClubsDirectory.jsx`
  e `ClubDetail.jsx`, **já usam** o sistema de tokens (`arena-panel`,
  `arena-chip`, gradientes) — só que na paleta verde-esmeralda/lima herdada
  do produto de torneios, que não tem relação com adoção de pets.
- `src/pages/Landing.jsx` é uma landing completa, bem-feita visualmente
  (blobs em gradiente, painéis de vidro, chips), mas **não está mais roteada**
  em `App.jsx` — é código órfão do produto antigo, com boa referência técnica.
- Não há nenhuma biblioteca de animação instalada (`framer-motion`, `gsap`,
  `aos` etc. — nenhuma). Scroll suave existe só via `scroll-behavior: smooth`
  no CSS; não há scroll-reveal nem microinterações.

Conclusão prática: **não vamos começar do zero**. Vamos re-harmonizar a
paleta e a linguagem visual para o tema de adoção de pets, propagar os tokens
para as páginas que hoje os ignoram, e adicionar uma camada de movimento leve
que hoje não existe.

## 2. Princípios de design

1. **Moderno sem ser frio** — gradientes suaves, vidro, sombras orgânicas
   coloridas. Nunca cinza-sobre-branco genérico.
2. **Minimalista com propósito** — hierarquia clara, bastante respiro, poucos
   elementos por tela; a personalidade vem da camada (glass/gradiente/forma
   orgânica), não de excesso de elementos.
3. **Humano e acolhedor** — paleta terrosa, fotografia real de pets em
   primeiro plano (nunca emoji no lugar de imagem), cantos bem arredondados,
   linguagem visual "caseira", não corporativa.
4. **Criativo, não genérico** — formas orgânicas (blobs), composições
   assimétricas, tipografia com peso e personalidade. Nunca hero centralizado
   raso (ícone + título + botão, tudo centralizado, sem profundidade).
5. **Acessível e performático** — contraste AA, `prefers-reduced-motion` já
   respeitado hoje e deve continuar sendo, motion sempre sutil.

## 3. Paleta de cores — tema "quente e terroso"

Direção escolhida: terracota, creme, verde-oliva, toque de mostarda —
transmite acolhimento, natureza e confiança ("lar" e cuidado), coerente com
adoção responsável de pets.

Importante: os nomes das variáveis CSS **não mudam** (`--primary`,
`--secondary`, `--accent`, etc.) — só os valores. Isso significa que todo
componente shadcn existente (`Button`, `Card`, `Badge`, `Input`...) herda a
nova paleta automaticamente, sem precisar reescrever nenhum componente de UI
de base.

Proposta de valores para `src/index.css` (`:root`), mantendo a estrutura
atual (HSL, mesmo bloco `@layer base`):

| Token | Valor HSL proposto | Uso |
|---|---|---|
| `--background` | `40 38% 97%` | Creme quente (fundo geral) |
| `--foreground` | `20 18% 15%` | Grafite quente (texto) |
| `--card` | `0 0% 100%` | Branco (mantém) |
| `--card-foreground` | `20 18% 15%` | — |
| `--primary` | `16 68% 46%` | Terracota (CTA principal, links ativos) |
| `--primary-foreground` | `40 45% 98%` | Texto sobre terracota |
| `--secondary` | `38 42% 91%` | Areia (fundos secundários, chips) |
| `--secondary-foreground` | `20 30% 20%` | — |
| `--muted` | `32 20% 92%` | Cinza-areia (fundos neutros) |
| `--muted-foreground` | `20 12% 42%` | Texto secundário |
| `--accent` | `84 24% 36%` | Verde-oliva (sucesso, "adotado", badges positivos) |
| `--accent-foreground` | `40 40% 97%` | — |
| `--destructive` | `4 72% 52%` | Vermelho quente (erros, denúncias, banimento) |
| `--destructive-foreground` | `0 0% 100%` | — |
| `--border` / `--input` | `30 20% 85%` | — |
| `--ring` | `16 68% 46%` | Foco (mesma cor do primary) |
| `--radius` | `1.25rem` (mantém; `1rem` no mobile) | — |
| *novo* `--highlight` | `42 88% 55%` | Mostarda — destaque de prioridade, "Compatibilidade alta" |

`--sidebar-*` (usado só pelo componente de sidebar do shadcn, hoje sem uso
real no app): pode virar uma variação escura terrosa (marrom-carvão) em vez
do azul-marinho atual, só por consistência, sem prioridade.

Fundo de página (`body` em `index.css`) hoje usa dois radiais verde/amarelo
— trocar para radiais terracota/creme muito sutis, mantendo a mesma técnica
(`radial-gradient` + `linear-gradient`), só recolorindo.

## 4. Tipografia

Manter o par já carregado — **Manrope** (corpo) + **Sora** (títulos,
`letter-spacing: -0.04em`) — já importado em `index.css` e já correto para o
tom "moderno e humano" pedido. Escala recomendada (Tailwind):

| Papel | Classe | Peso |
|---|---|---|
| Display (hero) | `text-5xl sm:text-6xl` | Sora 800 |
| H1 de página | `text-3xl sm:text-4xl` | Sora 700 |
| H2 de seção | `text-xl sm:text-2xl` | Sora 700 |
| Corpo | `text-base` | Manrope 400/500 |
| Legenda/eyebrow | `text-xs sm:text-sm uppercase tracking-wide` | Manrope 600 |

## 5. Espaçamento, raio e elevação

- Grid de espaçamento em múltiplos de 4px (padrão Tailwind). Seções públicas
  (Home, diretórios) com respiro generoso: `py-16 sm:py-24`.
- Raio: manter `--radius: 1.25rem` para cards/painéis grandes,
  `rounded-full` para botões/badges/avatares (já é o padrão de `button.jsx`).
- Elevação: sombras difusas **coloridas**, não cinza genérico — seguir o
  padrão já existente em `.arena-panel`/`.match-surface` de
  `src/index.css` (`box-shadow: 0 24px 60px -28px rgba(...)`), só trocando o
  matiz da sombra para tons terracota/marrom quente.
- Vidro (glass): `bg-white/75 backdrop-blur-xl` + borda branca translúcida —
  reaproveitar exatamente as classes `.arena-panel`/`.arena-panel-strong` já
  definidas, só recolorindo os gradientes internos.

## 6. Iconografia e imagens

- Ícones: `lucide-react` (já em uso em todo o app) — manter, é leve e
  consistente. Não introduzir uma segunda biblioteca de ícones.
- Fotografia: fotos reais de pets em destaque (proporção quadrada ou 4:5),
  tratamento leve de contraste. **Eliminar emoji como substituto de imagem**
  em pontos de destaque — o hero de `Home.jsx` hoje usa um `🐾` gigante
  sozinho; deve virar uma composição com foto real + forma orgânica atrás.
- Formas orgânicas: blobs em gradiente com `blur-3xl` atrás de imagens/heróis
  — a técnica já existe em `src/pages/Landing.jsx`
  (`bg-gradient-to-br ... blur-3xl`), só recolorir para terracota/mostarda.
- Estados vazios: já existe `src/components/ui/empty-state.jsx` — só
  reestilizar cores, manter a estrutura (não introduzir nova lib de
  ilustração).

## 7. Padrões estruturais de layout

- **Header** (`src/components/Layout.jsx`): trocar o header branco chapado
  por um header "glass" sticky (`bg-white/70 backdrop-blur-xl`, borda
  translúcida), logo com wordmark em gradiente (`bg-clip-text`, no molde de
  `.arena-heading` já existente), item de navegação ativo como "pill"
  preenchido em vez do `bg-orange-50` atual.
- **Hero (Home)**: duas colunas assimétricas — texto + CTA à esquerda,
  composição de foto de pet + blob orgânico + card flutuante (ex.: "+120
  adoções este mês") à direita. Sem emoji gigante centralizado.
- **Cards** (`PetCard.jsx` e equivalente de clube): manter foto em proporção
  quadrada, raio maior, sombra colorida, hover-lift
  (`hover:-translate-y-1` + sombra crescendo). Badge de espécie vira um chip
  de vidro sobre a foto, não emoji solto no canto.
- **Formulários**: manter `react-hook-form` + `zod` (sem mudança de
  arquitetura); `Input`/`Select` ganham anel de foco na cor `--ring`
  (terracota).
- **Rodapé**: manter a estrutura simples de `Home.jsx`, só herdar a nova
  paleta/tipografia.

## 8. Movimento e efeitos de scroll

Nível escolhido: **sutil e elegante** (não imersivo/parallax) — prioriza
performance, acessibilidade e não competir com o conteúdo (pets, adoção).

- **Biblioteca**: `framer-motion` — leve, tree-shakeable, ótima DX para
  `whileInView` e `stagger`, padrão de mercado no ecossistema
  shadcn/Tailwind. Ainda não está instalada; entra na Fase 0 do roadmap.
- **Scroll-reveal**: fade + slide-up de 16px (~400ms, `easeOut`), disparado
  **uma única vez** (`viewport={{ once: true, margin: '-80px' }}`) — nunca
  repetir ao rolar para cima e para baixo.
- **Stagger**: atraso de ~60–80ms entre itens em grids (feed de pets,
  diretório de clubes), aplicado só aos primeiros 6–8 itens visíveis por
  performance.
- **Hover**: `scale(1.01–1.02)` + sombra crescendo. Nunca tilt 3D ou rotação
  exagerada.
- **Transição de página**: opcional, fade de ~150ms no `Layout` — não é
  prioridade.
- Sempre checar `prefers-reduced-motion` (a media query global já existe em
  `index.css`; componentes com `framer-motion` devem usar
  `useReducedMotion()` e desligar as variantes de entrada quando ativo).
- Onde aplicar primeiro (maior retorno visual): Home (hero + seções),
  `PetFeed` (grid), `ClubDetail` (cabeçalho do clube), `PetDetail` (galeria).

## 9. Arquivos-chave para a migração (não exaustivo)

| Área | Arquivo(s) | Situação hoje |
|---|---|---|
| Tokens de cor | `src/index.css` | Existe, paleta errada (verde/lima) |
| Config Tailwind | `tailwind.config.js` | Sem mudança estrutural — só herda os novos valores das variáveis |
| Shell/header | `src/components/Layout.jsx` | Zero uso do sistema de tokens |
| Home | `src/pages/Home.jsx` | Zero uso do sistema de tokens |
| Padrão de card | `src/modules/pets/components/PetCard.jsx` | Zero uso do sistema de tokens |
| Referência técnica (antes de remover) | `src/pages/Landing.jsx` | Usa o sistema, paleta errada, não roteado |
| Já usam o sistema (só repaletar) | `ClubsDirectory.jsx`, `ClubDetail.jsx` | Usa `arena-panel`/`arena-chip`, paleta errada |
| Demais ~28 páginas | `PetDetail`, `CreatePet`, `MyPets`, `RadarSettings`, `CreateClub`, `Profile`, `ChatPage`, onboarding, institucionais, `/admin/*` | Mistura de padrões — aplicar o mesmo receituário de tokens/cards/motion, sem novas decisões de design por página |

## 10. Limpeza de código órfão (depois de extrair a referência técnica)

Remover (produto anterior, não roteado em `App.jsx`):
- `src/pages/Landing.jsx`
- `src/modules/admin/pages/AdminTournaments.jsx`
- `src/modules/adopters/pages/AthleteProfile.jsx`
- `src/modules/adopters/pages/AthletesDirectory.jsx`
- Funções de torneio em `src/modules/admin/services/adminService.js`
  (`listAllTournaments`, `setTournamentArchived`, `deleteTournamentCascading`)

E, à parte do design, `docs/MODULES.md` e `docs/ARCHITECTURE.md` hoje ainda
descrevem o produto de torneios/atletas — precisam de uma atualização própria
(fora do escopo deste documento, listado no roadmap).

## 11. Dark mode

Fora do escopo desta fase (decisão explícita). Os tokens `.dark` continuam
definidos em `index.css` para o futuro, sem switch nem uso agora.

## 12. Acessibilidade e performance — guardrails

- Contraste mínimo AA (4.5:1 para texto normal) — validar terracota sobre
  creme e branco sobre terracota antes de aplicar.
- Motion sempre `once: true`, sempre checando `prefers-reduced-motion`.
- Imagens com `loading="lazy"` (já usado em `PetCard`) e proporção reservada
  (evitar layout shift).
- Bundle: `framer-motion` é tree-shakeable via `import { motion } from
  'framer-motion'` — monitorar o aviso de chunk >500kB que o build já
  emite hoje.
