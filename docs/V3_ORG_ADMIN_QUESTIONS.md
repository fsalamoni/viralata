# V3 ORG_ADMIN — Análise e Q&A

> Gerado por `.harness/v3-redesign/step-1-analyze.cjs`
> Task: `TASK-V3-ORG_ADMIN` | Flag: `V3_PAGE_ORG_ADMIN`
> Página V1: `src/modules/organizations/pages/OrganizationAdminPanel.jsx` (736 linhas)

---

## 0. Identidade da Página

| Campo | Valor |
|---|---|
| KEY | ORG_ADMIN |
| Rota | / |
| Componente V1 | `src/modules/organizations/pages/OrganizationAdminPanel.jsx` |
| Linhas V1 | 736 |
| Bytes V1 | 34928 |
| Imports V1 | 46 (@/core/services/observabilityService, @/core/services/errorTracker, @/core/lib/concatSafe, react-router-dom, sonner...) |
| Hooks V1 | 13 (Effect, Memo, Navigate, Params, SearchParams, ArenaPageClasses, Auth, MyPets, Pets, Club, MyMembership, Clubs, FeatureFlag) |
| Componentes V1 | 38 (TabErrorBoundary, Skeleton, EmptyState, Button, Link...) |
| Flag V3 | `V3_PAGE_ORG_ADMIN` (default OFF) |

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
| F8 | SEO <head> | ❌ | - |
| F9 | Analytics / tracking | ❌ | - |
| F10 | i18n / múltiplos idiomas | ✅ | - |

---

## 2. Features Esperadas (do SHELTER_MGMT_ROADMAP.md)

- │  • renomeação Org → Abrigo                              │
- - Renomear **"Organizações" → "Abrigos"** e **"Organização/ONG" → "Abrigo"** em toda a UI (header, diretórios, CTAs, navegação, copy de marketing, breadcrumb, aba Equipe, aba Donations etc).
- - Form de edição respeita permissões granulares (owner + org com permissão `animals` + platform_admin).
-   organizer_shelter_id: 'shelter-abc',
-   co_organizers: ['shelter-xyz'],
- ### 11.5 Organização modular do abrigo (afeta Fase 0 e estrutura geral)
- - **CRMV registration da plataforma**: só se virarmos a mediar consultas. Hoje somos software inerte (operador), não organizamos agendas.

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

### Q1. Quem é o público-alvo principal da página ORG_ADMIN?

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

- D1: decisão #1 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D2: decisão #2 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D3: decisão #3 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D4: decisão #4 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D5: decisão #5 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D6: decisão #6 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D7: decisão #7 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D8: decisão #8 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D9: decisão #9 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D10: decisão #10 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D11: decisão #11 do redesign V3 de ORG_ADMIN (a definir no step-2)
- D12: decisão #12 do redesign V3 de ORG_ADMIN (a definir no step-2)

---

## 6. Próximo passo

Step 2 (implementação) vai:
1. Criar worktree `v3-redesign/ORG_ADMIN`
2. Implementar V3 do zero (NÃO aproveitar V1 JSX)
3. Para cada feature de F1-F10, criar sub-componente + teste
4. Gerar `docs/REGENCY_ORG_ADMIN_V3.md` (12+ seções)
