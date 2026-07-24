# Module 13 — Contracts (Termos, LGPD)

> Sistema de termos e contratos. Aceites canônicos (LGPD Art. 7º I).

## §1. Visão Geral

**Path**: `src/modules/contracts/`
**Linhas**: ~1500
**Tests**: ~15

## §2. Funcionalidades

### §2.1. Páginas legais

- `/termos` — Termos de uso
- `/privacidade` — Política de privacidade
- `/conduta` — Código de conduta
- `LegalPageViewer` — viewer genérico

### §2.2. Wizard de aceite

- Modal/página de aceite
- `useScrollEnd` para forçar scroll
- Signature text
- Liveness check (opcional)

### §2.3. Storage de aceite

- `termsAcceptances/{acceptanceId}` (imutável)
- Document hash (SHA-256)
- IP, UA
- Legal basis

### §2.4. Admin (`/admin/contratos`)

- Versões de termos
- Aceites
- Auditoria

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `Terms.jsx` | Termos |
| `Privacy.jsx` | Privacidade |
| `CodeOfConduct.jsx` | Conduta |
| `LegalPageViewer.jsx` | Viewer genérico |
| `TermsAcceptanceModal.jsx` | Modal de aceite |
| `AdminContracts.jsx` | Admin |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `termsService.js` | Aceites |
| `legalDocumentService.js` | Documentos legais |
| `hashService.js` | SHA-256 |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useTermsAcceptance` | Query de aceite |
| `useAcceptTerms` | Mutation |
| `useScrollEnd` | Detecta scroll até o fim |

## §6. Schema

Ver `02-DATA-MODEL.md` §6.1.

## §7. LGPD

- Lei 14.063/2020
- Document hash para detectar adulteração
- Liveness verified (opcional)
- Direito ao esquecimento: delete por platform_admin apenas

---

**Próximo módulo**: `modules/14-INTERVIEW.md`
