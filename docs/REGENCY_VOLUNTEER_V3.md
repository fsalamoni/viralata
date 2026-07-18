# Documento de Regência — VOLUNTEER V3

> **Status**: 🟡 EM CONSTRUÇÃO (TASK-TASK-V3-VOLUNTEER)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Modelo**: `docs/REGENCY_FEED_V3.md` (25.7KB) + `REGENCY_PET_DETAIL_V3.md` (22KB) + `REGENCY_LEGAL_V3.md` (17.6KB)
> **Atualizado em**: 2026-07-18T05:42:44.515Z

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | VOLUNTEER |
| Rota | / |
| Componente V3 | `src/<componente>.v3.jsx` |
| Wrapper | `src/<componente>.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/<componente>.v1.jsx` (mantido) |
| Flag V3 | `V3_PAGE_VOLUNTEER` (default OFF) |
| Auth | _a definir_ |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_VOLUNTEER) === true → <PageV3 /> (lazy)
2. Senão                       → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Estrutura visual (mobile-first, 1 col → 2 col md+)

_a preencher no step-3 — descrever a estrutura visual_

---

## 2. Funcionalidades (exaustivo)

### 2.1. Mantidas do V1 (com melhorias)

_a preencher_

### 2.2. NOVAS no V3

_a preencher_

---

## 3. Componentes utilizados

### 3.1. V3 (novos)

_a preencher — listar sub-componentes criados_

### 3.2. Reutilizados (DS_V2 + V1)

_a preencher_

### 3.3. Hooks e services

_a preencher_

---

## 4. Camadas de dados

_a preencher_

---

## 5. UX/UI (decisões)

_a preencher — D1-D12_

---

## 6. Estados (loading / empty / error / not-found)

_a preencher_

---

## 7. Acessibilidade (WCAG 2.1 AA)

_a preencher_

---

## 8. Performance

_a preencher_

---

## 9. Padrões de design aplicados

_a preencher_

---

## 10. Risks & Mitigations

_a preencher_

---

## 11. Métricas de sucesso

_a preencher_

---

## 12. Próximas evoluções (pós-V3)

_a preencher_

---

## 13. Referências

- Análise inicial: `docs/V3_VOLUNTEER_QUESTIONS.md`
- D-DOC-REGENCY-01: `docs/PAGE_REGENCY_TEMPLATE.md`
- D-VITE-LAZY-01: Vite constant folding + React.lazy
- Regências anteriores: `docs/REGENCY_FEED_V3.md`, `REGENCY_PET_DETAIL_V3.md`, `REGENCY_LEGAL_V3.md`

---

**Status**: 🟡 EM CONSTRUÇÃO. Step-4 (deploy) só avança quando este doc estiver completo.
