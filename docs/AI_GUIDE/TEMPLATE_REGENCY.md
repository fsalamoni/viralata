# Template: REGENCY Spec para Feature V3

> **Use este template** ao criar uma nova especificação V3.
> Salve como `docs/REGENCY_<NAME>_V3.md`.

---

# REGENCY_<NAME>_V3

> **Status**: Draft | In Progress | Review | Done
> **PR**: #XXX
> **SW**: sw-vN
> **Data início**: YYYY-MM-DD
> **Data fim**: YYYY-MM-DD
> **Responsável**: Mavis | @username

## §1. Contexto

Por que estamos criando essa feature? Qual problema resolve?

## §2. Objetivos

Liste 3-5 objetivos mensuráveis:

- [ ] Objetivo 1
- [ ] Objetivo 2
- [ ] Objetivo 3

## §3. UX/UI

### §3.1. Wireframe (ASCII)

```
┌─────────────────────────────┐
│  Hero                       │
├─────────────────────────────┤
│  Conteúdo                   │
│                             │
└─────────────────────────────┘
```

### §3.2. Componentes principais

- `<Component1>`: descrição
- `<Component2>`: descrição

### §3.3. Estados

- Loading: Skeleton
- Empty: EmptyState
- Error: ErrorState
- Success: descrição

### §3.4. Responsividade

- Mobile: < 768px
- Tablet: 768-1024px
- Desktop: > 1024px

## §4. Dados

### §4.1. Schema Firestore

```typescript
collection/{docId} {
  field1: type,
  field2: type,
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §4.2. Regras de negócio

1. Regra 1
2. Regra 2

### §4.3. Índices necessários

- `(field1, field2)` em `collection`

## §5. Firestore Rules

```js
match /collection/{docId} {
  allow read: if ...;
  allow create: if ...;
  allow update: if ...;
  allow delete: if ...;
}
```

## §6. Implementação

### §6.1. Componentes a criar

- `src/modules/<name>/components/<Comp1>.jsx`
- `src/modules/<name>/components/<Comp2>.jsx`

### §6.2. Services a criar

- `src/modules/<name>/services/<name>Service.js`

### §6.3. Hooks a criar

- `src/modules/<name>/hooks/use<Name>.js`

### §6.4. Pages a criar/atualizar

- `src/modules/<name>/pages/<Page>.v3.jsx`

## §7. Testes

### §7.1. Testes unitários

- [ ] Service: `<name>Service.test.js`
- [ ] Hook: `use<Name>.test.js`
- [ ] Schema: `<name>.test.js`

### §7.2. Runtime tests

- [ ] Component: `<Comp1>.runtime.test.jsx`
- [ ] Page: `<Page>.runtime.test.jsx`

### §7.3. E2E (opcional)

- [ ] Flow: "User does X and gets Y"

## §8. Decisões

Liste decisões D-* criadas:

- **D-<NAME>-XXX**: descrição
- **D-<NAME>-YYY**: descrição

## §9. Critérios de Aceitação

- [ ] Feature funciona offline (PWA)
- [ ] Feature é acessível (WCAG 2.1 AA)
- [ ] Feature tem runtime tests
- [ ] Feature está atrás de feature flag
- [ ] Bundle não cresce > 50KB
- [ ] SW bumped (vN → vN+1)

## §10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Risco 1 | Mitigação 1 |
| Risco 2 | Mitigação 2 |

## §11. Plano de Deploy

1. PR para `feature/TASK-XXX`
2. Tests passam
3. Review
4. Merge (squash) para main
5. Auto-deploy via GitHub Actions
6. Validar em produção
7. SCRUM sync (`node .harness/sync.cjs --fix`)

## §12. Pós-Deploy

- [ ] Validar bundle deployed
- [ ] Validar SW deployed
- [ ] Smoke test em produção
- [ ] Ativar feature flag (se aplicável)
- [ ] Notificar usuários (se aplicável)

## §13. Lições Aprendidas

(preencher após deploy)

- Lição 1
- Lição 2

## §14. Referências

- `docs/AI_GUIDE/01-ARCHITECTURE.md`
- `docs/AI_GUIDE/02-DATA-MODEL.md`
- `docs/AI_GUIDE/modules/<NN>-<NAME>.md`
- Issues: #XXX, #YYY

---

**Template version**: 1.0
**Última atualização**: 2026-07-24
