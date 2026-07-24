# Module 05 — Admin (Plataforma)

> Painel de administração da plataforma. Métricas, auditoria, flags, alertas.

## §1. Visão Geral

**Path**: `src/modules/admin/`
**Linhas**: ~4000
**Tests**: 57
**Acesso**: `PlatformAdminRoute` (user.is_platform_admin=true)

## §2. Funcionalidades

### §2.1. Dashboard (`/admin`)

- Métricas globais
- Alertas críticos
- Status da plataforma

### §2.2. Usuários (`/admin/usuarios`)

- Lista de users
- Ban, deletar
- Promover a platform_admin

### §2.3. Organizações (`/admin/organizacoes`)

- Aprovação de ONGs
- Verificação
- Ban

### §2.4. Pets (`/admin/pets`)

- Todos os pets
- Ban, deletar

### §2.5. Contratos (`/admin/contratos`)

- Versões de termos
- Aceites
- Auditoria

### §2.6. Auditoria (`/admin/auditoria`)

- Log de ações admin
- Filtros por actor, action, data

### §2.7. Alertas (`/admin/alertas`)

- Alertas críticos (security, abuse, system)
- Investigar, resolver

### §2.8. Métricas (`/admin/metricas`)

- Dashboard analytics
- Gráficos (Chart.js ou similar)

### §2.9. Feature Flags (`/admin/flags`)

- Ativar/desativar features
- Versão de migração
- Override por user

### §2.10. Parceiros (`/admin/parceiros`)

- CRUD de parceiros
- Banners
- Métricas (impressions, clicks)

### §2.11. Denúncias (`/admin/denuncias`)

- Lista de reports
- Investigar
- Resolver

### §2.12. Notificações (`/admin/notificacoes`)

- Broadcasts
- Templates

### §2.13. Whitelist (`/admin/whitelist`)

- Emails whitelist para early access
- Platform admins

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `AdminDashboard.v3.jsx` | Dashboard principal |
| `AdminUsers.jsx` | Usuários |
| `AdminOrgs.jsx` | Organizações |
| `AdminPets.jsx` | Pets |
| `AdminContracts.jsx` | Contratos |
| `AdminAudits.jsx` | Auditoria |
| `AdminAlerts.jsx` | Alertas |
| `AdminMetrics.jsx` | Métricas |
| `AdminFlags.jsx` | Feature flags |
| `AdminReports.jsx` | Denúncias |
| `AdminBroadcasts.jsx` | Notificações |
| `AdminWhitelist.jsx` | Whitelist |
| `AdminPlatformUsers.jsx` | Platform admins |
| `AdminSecurity.jsx` | Segurança |
| `AdminPermissions.jsx` | Permissões |
| `AdminPartnerships.jsx` | Parcerias |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `adminService.js` | Operações admin (canManage) |
| `metricsService.js` | Métricas (read) |
| `alertService.js` | Alertas |
| `featureFlagService.js` | Feature flags |
| `whitelistService.js` | Whitelist |
| `broadcastService.js` | Broadcasts |
| `adminPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useAdminMetrics` | Métricas globais |
| `useAdminAlerts` | Alertas |
| `useAdminAudits` | Auditoria |
| `useFeatureFlags` | Feature flags |
| `useWhitelist` | Whitelist |
| `useBroadcast` | Broadcasts |

## §6. Schema

Ver `02-DATA-MODEL.md` §8 (admin).

## §7. Tests

- `adminService.test.js`
- `featureFlagService.test.js`
- `whitelistService.test.js`
- `AdminFlags.runtime.test.jsx`

---

**Próximo módulo**: `modules/06-PARTNERS.md`
