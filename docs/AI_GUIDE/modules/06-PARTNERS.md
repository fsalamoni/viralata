# Module 06 — Partners (Espaço Publicitário)

> Parceiros (ONGs, lojas, marcas) com espaço publicitário pago. Banners
> desktop e mobile, com tracking de impressions e clicks.

## §1. Visão Geral

**Path**: `src/modules/partners/`
**Linhas**: ~2500
**Tests**: 19
**Status**: Ativo (TASK-027)

## §2. Funcionalidades

### §2.1. Lista pública (`/parceiros`)

- Lista de parceiros ativos
- Cards com logo

### §2.2. Detalhe público (`/parceiros/:slug`)

- Logo, descrição, website
- Banners clicáveis

### §2.3. Admin (em `/admin/parceiros`)

- CRUD de parceiros
- Upload de banners
- Métricas (impressions, clicks)
- LGPD compliant (sem IP collection, UA truncado)

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `PartnersListPublic.jsx` | Lista pública |
| `PartnerDetailPublic.jsx` | Detalhe público |
| `AdminPartners.jsx` | Admin |
| `AdSlot.jsx` (em core) | Render de banner |
| `AdProvider.jsx` (em core) | Provider de ad |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `partnerService.js` | CRUD |
| `partnerMetricsService.js` | Impressions, clicks |
| `adsPolicy.js` (em core) | Políticas |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `usePartners` | Lista |
| `usePartner` | Query |
| `useTrackImpression` | Mutation de impression |
| `useTrackClick` | Mutation de click |

## §6. LGPD

- `collect_ip: false` (NUNCA coletar IP)
- `collect_ua: 'truncated'` (UA truncado)
- Apenas impressions/clicks (anônimos)

## §7. Schema

Ver `02-DATA-MODEL.md` §7.

---

**Próximo módulo**: `modules/07-USERS.md`
