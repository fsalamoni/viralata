# Module 11 — Adopter (Público Adotante)

> Experiência pública para adotantes. Entry point de adoção.

## §1. Visão Geral

**Path**: `src/modules/adopter/`
**Linhas**: ~800
**Tests**: 2 (GAP)

## §2. Funcionalidades

### §2.1. Landing (`/adote`)

- Hero "Adote um amigo"
- Cards: "Quero adotar", "Como funciona", "Dicas"
- CTA para `/feed`

### §2.2. Onboarding público

- Questionário de compatibilidade
- Salva em `users/{uid}.compatibility`

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `PublicAdopterOnboarding.jsx` | Landing |
| `CompatibilityQuiz.jsx` | Questionário |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `adopterService.js` | Operações de adotante |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useAdopterProfile` | Perfil de adotante |
| `useSaveCompatibility` | Mutation |

## §6. GAP

**Recomendação**: Adicionar tests para `adopterService.js` (target: 60%).

---

**Próximo módulo**: `modules/12-ADOPTION.md`
