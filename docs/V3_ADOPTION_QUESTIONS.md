# V3 ADOPTION — Análise e Q&A

> Gerado por `.harness/v3-redesign/step-1-analyze.cjs`
> Task: `TASK-V3-ADOPTION` | Flag: `V3_PAGE_ADOPTION`
> Página V1: `src/pages/AdoptionWizard.jsx` (403 linhas)

---

## 0. Identidade da Página

| Campo | Valor |
|---|---|
| KEY | ADOPTION |
| Rota | / |
| Componente V1 | `src/pages/AdoptionWizard.jsx` |
| Linhas V1 | 403 |
| Bytes V1 | 18913 |
| Imports V1 | 17 (react, react-router-dom, sonner, lucide-react, @/components/ui/button...) |
| Hooks V1 | 11 (Memo, Ref, State, Navigate, Params, ArenaPageClasses, Auth, Pet, Pets, SubmitApplication, AdoptionApplications) |
| Componentes V1 | 13 (Skeleton, EmptyState, Button, Link, Seo...) |
| Flag V3 | `V3_PAGE_ADOPTION` (default OFF) |

---

## 1. Features Identificadas no V1

| # | Feature | Existe no V1? | Notas |
|---|---|---|---|
| F1 | Render principal | ✅ | componente default export |
| F2 | Layout responsivo | ✅ | classes Tailwind detectadas |
| F3 | Loading state | ✅ | - |
| F4 | Error state | ❌ | - |
| F5 | Empty state | ✅ | - |
| F6 | Acessibilidade (a11y) | ✅ | - |
| F7 | Dark mode | ❌ | - |
| F8 | SEO <head> | ✅ | - |
| F9 | Analytics / tracking | ❌ | - |
| F10 | i18n / múltiplos idiomas | ✅ | - |

---

## 2. Features Esperadas (do SHELTER_MGMT_ROADMAP.md)

- 3. **Coleções novas convivem com antigas**: nada de mexer em `pets`, `adoption_interests` etc. até a fase correspondente. Cada feature nova tem sua própria coleção/subcollection.
- `rescue` | `intake` | `foster_start` | `foster_end` | `vaccine` | `spay_neuter` | `vet_visit` | `hospitalization` | `medication_start` | `medication_end` | `exhibition` | `adoption` | `return` | `post_adoption_follow_up` | `death` | `other`
-     adoption_id?: 'app-abc',
- - Quando `adoption_applications/{id}` → status `finalized` → grava evento `adoption` na timeline do pet.
- ### Fase 3 — Adoção completa (workflow) · flag `SHELTER_ADOPTION_WORKFLOW`
- **Nova coleção**: `adoption_applications/{applicationId}`
- - Substitui `adoption_interests` mas convive via alias.
-   days_in_shelter_at_adoption: number
- - Timeline do pet recebe evento `adoption` ao finalizar.
- - `previous_adoptions` (array de FK adoption_id)

---

## 3. Lacunas Identificadas (V1 vs spec)

Lacunas a corrigir no V3 (preencher após análise manual):

- L1: _a definir_
- L2: _a definir_
- L3: _a definir_
- L4: _a definir_
- L5: _a definir_

---

## 4. Q&A (15 perguntas)

### Q1. Quem é o público-alvo principal da página ADOPTION?

_R: a definir_

### Q2. Quais são as 3 ações mais importantes que o usuário deve conseguir fazer?

_R: a definir_

### Q3. A página atual é usada mais em mobile ou desktop? (verificar analytics)

_R: a definir_

### Q4. Quais métricas de sucesso devemos mirar (conversão, engajamento, tempo na página)?

_R: a definir_

### Q5. Há dark mode funcional com tokens? Se não, quais tokens faltam?

_R: a definir_

### Q6. Acessibilidade: o fluxo principal é navegável por teclado? Há aria-labels adequados?

_R: a definir_

### Q7. Loading state: o que o usuário vê durante o fetch? É otimista ou pessimista?

_R: a definir_

### Q8. Error state: como comunicamos erros de rede? Há retry?

_R: a definir_

### Q9. SEO: meta description, Open Graph, JSON-LD estão configurados?

_R: a definir_

### Q10. Performance: bundle da página é < 30KB? Há code splitting?

_R: a definir_

### Q11. A página tem empty state definido (zero pets, zero results, etc)?

_R: a definir_

### Q12. Os dados vêm de Firestore direto ou via hook? Há cache?

_R: a definir_

### Q13. Como o user role afeta o que aparece na página?

_R: a definir_

### Q14. A página tem CTAs claros com hierarquia visual?

_R: a definir_

### Q15. Mobile: gestos (swipe, pull-to-refresh) estão implementados?

_R: a definir_


---

## 5. Decisões de Design (D1-D12)

- D1: decisão #1 do redesign V3 de ADOPTION (a definir no step-2)
- D2: decisão #2 do redesign V3 de ADOPTION (a definir no step-2)
- D3: decisão #3 do redesign V3 de ADOPTION (a definir no step-2)
- D4: decisão #4 do redesign V3 de ADOPTION (a definir no step-2)
- D5: decisão #5 do redesign V3 de ADOPTION (a definir no step-2)
- D6: decisão #6 do redesign V3 de ADOPTION (a definir no step-2)
- D7: decisão #7 do redesign V3 de ADOPTION (a definir no step-2)
- D8: decisão #8 do redesign V3 de ADOPTION (a definir no step-2)
- D9: decisão #9 do redesign V3 de ADOPTION (a definir no step-2)
- D10: decisão #10 do redesign V3 de ADOPTION (a definir no step-2)
- D11: decisão #11 do redesign V3 de ADOPTION (a definir no step-2)
- D12: decisão #12 do redesign V3 de ADOPTION (a definir no step-2)

---

## 6. Próximo passo

Step 2 (implementação) vai:
1. Criar worktree `v3-redesign/ADOPTION`
2. Implementar V3 do zero (NÃO aproveitar V1 JSX)
3. Para cada feature de F1-F10, criar sub-componente + teste
4. Gerar `docs/REGENCY_ADOPTION_V3.md` (12+ seções)
