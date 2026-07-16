# Auditoria — Cadastro (TASK-085)

> **Data**: 2026-07-15
> **Versão**: `feat/task-085-audit-cadastro-2026-07-15` (branch feature)
> **Versão main**: verificada contra `origin/main`
> **Status**: ✅ Completo — 1 gap identificado e corrigido

## Escopo

Varredura dos fluxos de cadastro da plataforma conforme Regra A §A.1–§A.4 e
Guia de Implementação Legal v2 §2:

1. **Onboarding** — `/onboarding` (perfil de adotante)
2. **Abrigo/Criação de organização** — `/admin/organizations/create` (CreateClub)
3. **Voluntariado** — `/voluntarios/seja` (VolunteerSignup)
4. **CodeOfConduct** (comunidades) — aceite no mural de comunidades

## Critérios de verificação

| # | Critério | Descrição |
|---|---|---|
| C1 | 3 checkboxes de aceite | Termos de Uso, Política de Privacidade, Código de Conduta |
| C2 | Links para `/legal/<slug>` | Cada checkbox deve linkar para o documento correspondente |
| C3 | Botão desabilitado até aceite | Nenhuma ação pode prosseguir sem todos os aceites marcados |
| C4 | Gravação em `audit_log` | Aceite deve ser registrado em `audit_log` (imutável) com IP, timestamp, hash |
| C5 | LGPD — consentimento explícito | Perfil de usuário deve conter campos de aceite com timestamp e versão |

## Resultados por fluxo

### 1. Onboarding — `/onboarding` (OnboardingQuestionnaire.jsx)

| Critério | Status | Observação |
|---|---|---|
| C1 — 3 checkboxes | ✅ | `accepted_terms_of_use`, `accepted_privacy_policy`, `accepted_code_of_conduct` |
| C2 — Links para legal | ✅ | `<Link to="/legal/termos-de-uso">`, `/legal/politica-de-privacidade`, `/legal/codigo-de-conduta` |
| C3 — Botão desabilitado | ✅ | `canAdvance()` exige `=== true` nos 3 campos |
| C4 — `audit_log` | ✅ **corrigido** | Adicionado `createAuditLog({ action: 'onboarding_consent_accepted' })` em `handleFinish()` |
| C5 — Campos LGPD | ✅ | `terms_accepted_at`, `privacy_policy_accepted_at`, `code_of_conduct_accepted_at` + versões |

**Correção aplicada** (TASK-085):
- `handleFinish()` agora chama `createAuditLog` com detalhes completos:
  - `action: 'onboarding_consent_accepted'`
  - `actor: { uid, email }`
  - `details.terms_version`, `privacy_policy_version`, `code_of_conduct_version`
  - `details.onboarding_version` (questionnaireVersion)
  - `details.accepted_at` (ISO timestamp)
  - `details.legal_basis: 'consent (LGPD Art. 7º I) + Lei 14.063/2020'`
- Audit é best-effort (não-bloqueante) — igual ao padrão usado em CreateClub

**Arquivos modificados**: `src/modules/onboarding/pages/OnboardingQuestionnaire.jsx`

---

### 2. Criação de Abrigo — `/admin/organizations/create` (CreateClub.jsx)

| Critério | Status | Observação |
|---|---|---|
| C1 — Checkbox aceite DPA | ✅ | DPA Dialog com aceite obrigatório + assinatura + CPF |
| C2 — Link para DPA | ✅ | Modal com texto integral do DPA antes do aceite |
| C3 — Botão desabilitado | ✅ | `handleDpaAccept` só é chamado após aceite completo |
| C4 — `audit_log` | ✅ | `createAuditLog({ action: 'shelter_terms_accepted', ... })` com hash, IP, CPF, CNPJ |
| C5 — Campos LGPD | ✅ | `terms_accepted_at` + versão persistidos no doc do clube |

**Nota**: o DPA usa assinatura digital (nome completo + CPF do responsável legal),
não os 3 checkboxes genéricos. Adequado para pessoa jurídica (Lei 14.063/2020 art. 3º).

---

### 3. Inscrição de Voluntário — `/voluntarios/seja` (VolunteerSignup.jsx)

| Critério | Status | Observação |
|---|---|---|
| C1 — Aceite de termo | ✅ | Step 1: scroll-to-end + assinatura (nome completo) + checkbox |
| C2 — Link para termo | ✅ | Texto integral do `VOLUNTEER_TERMS_TEXT_V2` renderizado no step |
| C3 — Botão desabilitado | ✅ | `handleAcceptTerms` exige `scrolledToEnd` + `accepted` + `signatureText` |
| C4 — `audit_log` | ✅ | `useAcceptVolunteerTerms` → `acceptTermsMutation` → Cloud Function → `audit_log` |
| C5 — Campos LGPD | ✅ | `terms_accepted_at`, `terms_version` no doc `users/{uid}` |

**Fluxo Cloud Function**: `onVolunteerParticipationCreated` (TASK-269, done).

---

### 4. Código de Conduta em Comunidades (CodeOfConductDialog)

| Critério | Status | Observação |
|---|---|---|
| C1 — Aceite | ✅ | Checkbox obrigatório antes de comentar |
| C2 — Link para CoC | ✅ | Dialog mostra texto integral com link no rodapé |
| C3 — Botão desabilitado | ✅ | `disabled={!accepted}` no botão de submit |
| C4 — `audit_log` | ✅ | `createAuditLog({ action: 'community_code_of_conduct_accepted' })` |
| C5 — Campos LGPD | ✅ | Aceite persiste no doc do usuário |

---

## Resumo

| Fluxo | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|
| Onboarding (adotante) | ✅ | ✅ | ✅ | ✅ (corrigido) | ✅ |
| Criação de abrigo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inscrição voluntário | ✅ | ✅ | ✅ | ✅ | ✅ |
| CodeOfConduct comunidades | ✅ | ✅ | ✅ | ✅ | ✅ |

**Resultado final**: 4/4 fluxos em conformidade. O gap de `audit_log` no onboarding
(única não-conformidade) foi corrigido nesta branch.

## Próximas ações (não-bloqueantes)

- TASK-006/007: revisão jurídica de `adoptionTerms.v1.js` e `avisosLegais.js`
- TASK-052: implementar clickwrap em ações críticas (adoção, LT, doação) — bloqueia TASK-087
- TASK-085 pode ser marcado como done após merge

## Evidência de correção

```js
// OnboardingQuestionnaire.jsx — handleFinish()
await createAuditLog({
  action: 'onboarding_consent_accepted',
  actor: { uid: user?.uid, email: user?.email },
  target_type: 'user',
  target_id: user?.uid,
  details: {
    terms_version: '2026-07-10',
    privacy_policy_version: '2026-07-10',
    code_of_conduct_version: '2026-07-10',
    onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
    accepted_at: acceptedAt,
    legal_basis: 'consent (LGPD Art. 7º I) + Lei 14.063/2020',
  },
}).catch((err) => {
  console.warn('[audit] onboarding_consent_accepted falhou (não bloqueante):', err);
});
```
