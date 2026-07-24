# 04-PAGES-ROUTES.md — Rotas e Páginas

> **Atualizado em 2026-07-24** (79 rotas documentadas)

## §1. Sistema de Roteamento

- **Tipo**: Client-side (React Router v6)
- **Definição**: `src/App.jsx` (rotas), `src/pages/` (componentes)
- **Layout**: `withLayout(name, Component)` — aplica TopBar + BottomTabBar + Footer
- **V1/V3**: wrappers decidem qual renderizar via feature flag

## §2. Rotas Públicas (com `withLayout`)

| Path | Componente | Módulo | Description |
|------|-----------|--------|-------------|
| `/` | HomeV3 | onboarding | Landing |
| `/feed` | FeedV3 | pets | Feed público de pets |
| `/pet/:id` | PetDetailV3 | pets | Detalhe público do pet |
| `/quero-adotar/:petId` | AdoptionWizard | adoption | Wizard de adoção |
| `/quero-adotar/:petId/detalhes` | AdoptionWizard | adoption | Wizard - detalhes |
| `/quero-adotar/:petId/revisao` | AdoptionWizard | adoption | Wizard - revisão |
| `/comunidades` | CommunitiesDirectory | communities | Diretório de comunidades |
| `/comunidades/:id` | CommunityDetailV3 | communities | Detalhe da comunidade |
| `/comunidades/:id/forum/:topicId` | CommunityForumTopic | communities | Tópico do fórum |
| `/organizacoes` | ClubsDirectory | organizations | Diretório de ONGs |
| `/organizacoes/:id` | ClubDetailV3 | organizations | Detalhe da ONG |
| `/organizacoes/:slug/doacoes` | ClubDonationsPublic | organizations | Doações |
| `/organizacoes/:slug/eventos` | ClubEventsPublic | organizations | Eventos |
| `/organizacoes/:slug/mural` | PublicMuralFeedV3 | organizations | Mural público |
| `/organizacoes/:slug/forum` | ClubForumPublic | organizations | Fórum público |
| `/parceiros` | PartnersListPublic | partners | Lista de parceiros |
| `/parceiros/:slug` | PartnerDetailPublic | partners | Detalhe do parceiro |
| `/busca` | Search | (core) | Busca global |
| `/entrar` | Login | users | Login |
| `/entrar/cadastro` | Signup | users | Cadastro |
| `/entrar/recuperar` | ForgotPassword | users | Recuperar senha |
| `/termos` | Terms | contracts | Termos de uso |
| `/privacidade` | Privacy | contracts | Privacidade |
| `/conduta` | CodeOfConduct | contracts | Código de conduta |
| `/adote` | PublicAdopterOnboarding | adopter | Adote (entrada pública) |
| `/parceria` | PublicPartnerOnboarding | partners | Parceria (entrada pública) |
| `/voluntarios` | VolunteersPublic | shelter | Voluntários (entrada pública) |
| `/voluntarios/seja` | VolunteerSignup | shelter | Wizard de voluntário |
| `/voluntarios/obrigado` | VolunteerThanks | shelter | Agradecimento |
| `/denuncie` | PublicReportForm | reports | Denuncie (form público) |
| `/sobre` | About | (core) | Sobre o projeto |
| `/contato` | Contact | (core) | Contato |
| `/ajuda` | Help | (core) | Ajuda |
| `/404` | PageNotFound | (core) | 404 |

## §3. Rotas Autenticadas (com `withLayout` + `ProtectedRoute`)

| Path | Componente | Módulo | Description |
|------|-----------|--------|-------------|
| `/onboarding` | OnboardingQuestionnaire | onboarding | Onboarding novo user |
| `/perfil` | Profile | users | Perfil do user |
| `/perfil/editar` | ProfileEdit | users | Editar perfil |
| `/preferencias` | Preferences | users | Preferências |
| `/meus-pets` | MyPets | pets | Lista de pets do user |
| `/meus-pets/criar` | CreatePet | pets | Criar pet |
| `/meus-pets/:id/editar` | EditPet | pets | Editar pet |
| `/pets/:id` | PetDetailV3 | pets | Detalhe admin do pet |
| `/meus-interesses` | MyInterests | pets | Meus interesses de adoção |
| `/meus-interesses/:id` | InterestDetail | pets | Detalhe do interesse |
| `/minhas-adoções` | MyAdoptions | adoption | Adoções ativas |
| `/minhas-adoções/:id` | AdoptionDetail | adoption | Detalhe da adoção |
| `/meus-contratos` | MyContracts | contracts | Contratos do user |
| `/minhas-notificacoes` | NotificationsPage | notifications | Notificações |
| `/chat` | ChatPageV3 | chat | Lista de chats |
| `/chat/:threadId` | ChatPageV3 | chat | Thread |
| `/radar` | RadarSettings | pets | Configurar radar |
| `/denuncias` | MyReports | reports | Minhas denúncias |
| `/comunidades/minhas` | MyCommunities | communities | Minhas comunidades |
| `/comunidades/:id/mural/criar` | MuralCreate | communities | Criar post |
| `/comunidades/:id/forum/criar` | ForumCreate | communities | Criar tópico |

## §4. Rotas Admin de ONG (`withLayout` + `OrgAdminRoute`)

| Path | Componente | Módulo | Description |
|------|-----------|--------|-------------|
| `/organizacoes/:id/admin` | OrganizationAdminPanelV3 | organizations | Painel admin ONG |
| `/organizacoes/:id/admin/operacional` | OrgOpsTab | organizations | Aba Operacional (pets) |
| `/organizacoes/:id/admin/membros` | OrgMembersTab | organizations | Membros |
| `/organizacoes/:id/admin/financeiro` | OrgFinanceTab | organizations | Financeiro |
| `/organizacoes/:id/admin/equipe` | OrgTeamTab | organizations | Equipe |
| `/organizacoes/:id/admin/mural` | OrgMuralTab | organizations | Mural |
| `/organizacoes/:id/admin/forum` | OrgForumTab | organizations | Fórum |
| `/organizacoes/:id/admin/doacoes` | OrgDonationsTab | organizations | Doações |
| `/organizacoes/:id/admin/eventos` | OrgEventsTab | organizations | Eventos |
| `/organizacoes/:id/admin/voluntarios` | OrgVolunteersTab | shelter | Voluntários |
| `/organizacoes/:id/admin/voluntarios/perfil` | ShelterVolunteerProfile | shelter | Perfil voluntário |

## §5. Rotas de Plataforma (`PlatformAdminRoute`)

| Path | Componente | Módulo | Description |
|------|-----------|--------|-------------|
| `/admin` | AdminDashboardV3 | admin | Dashboard |
| `/admin/usuarios` | AdminUsers | admin | Usuários |
| `/admin/organizacoes` | AdminOrgs | admin | Organizações |
| `/admin/pets` | AdminPets | admin | Pets |
| `/admin/contratos` | AdminContracts | admin | Contratos |
| `/admin/auditoria` | AdminAudits | admin | Auditoria |
| `/admin/alertas` | AdminAlerts | admin | Alertas |
| `/admin/metricas` | AdminMetrics | admin | Métricas |
| `/admin/flags` | AdminFlags | admin | Feature flags |
| `/admin/parceiros` | AdminPartners | partners | Parceiros |
| `/admin/denuncias` | AdminReports | reports | Denúncias |
| `/admin/parcerias` | AdminPartnerships | partners | Parcerias |
| `/admin/permissoes` | AdminPermissions | admin | Permissões |
| `/admin/notificacoes` | AdminBroadcasts | notifications | Broadcasts |
| `/admin/whitelist` | AdminWhitelist | admin | Whitelist |
| `/admin/usuarios-plataforma` | AdminPlatformUsers | admin | Users plataforma |
| `/admin/seguranca` | AdminSecurity | admin | Segurança |

## §6. Rotas de Abrigo (`ShelterAdminRoute`)

| Path | Componente | Módulo | Description |
|------|-----------|--------|-------------|
| `/abrigo` | ShelterAdminDashboardV3 | shelter | Dashboard |
| `/abrigo/kanban` | KanbanPage | shelter | Kanban de processos |
| `/abrigo/entrevistas` | ShelterInterviewsList | shelter | Entrevistas |
| `/abrigo/pos-adoacao` | PostAdoptionDashboardV3 | shelter | Pós-adoção |
| `/abrigo/ranking` | ShelterRanking | shelter | Ranking |
| `/abrigo/buscas` | ShelterSearches | shelter | Buscas |

## §7. Redirects Canônicos

| De | Para | Razão |
|----|------|-------|
| `/inicio` | `/feed` | "feed" mais claro |
| `/clubes` | `/organizacoes` | "organizações" é termo oficial |
| `/atletas` | `/feed` | legacy |
| `/feed/v2` | `/feed` | legacy |
| `/home` | `/` | legacy |

## §8. Categorização por Tamanho

| Tipo | Quantidade | Observação |
|------|-----------|-----------|
| Públicas (sem auth) | ~25 | Header + body + footer |
| Auth (com profile completo) | ~20 | Filtro de `ProtectedRoute` |
| Admin ONG | ~11 | Filtro de `OrgAdminRoute` |
| Admin Plataforma | ~17 | Filtro de `PlatformAdminRoute` |
| Admin Abrigo | ~6 | Filtro de `ShelterAdminRoute` |
| Redirects | 4 | `Navigate` |
| 404 | 1 | catch-all |
| **Total** | **79** | |

## §9. Componentes sem `withLayout` (intencional)

Apenas 3 rotas não usam `withLayout`:

- `/admin` (e suas filhas) — tem seu próprio `AdminLayout`
- `/abrigo` (e suas filhas) — tem seu próprio `ShelterLayout`
- `/scrum` (admin-only) — é uma página de admin

Todas têm `withLayout` em suas sub-rotas (`/admin/usuarios`, etc).

## §10. Padrão de Página (V3)

```jsx
// src/modules/<modulo>/pages/<Pagina>.v3.jsx
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getResource } from '../services/resourceService';
import { useAuth } from '@/core/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ErrorState';
import { Hero } from '@/components/Hero';

export default function MyPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => getResource(id),
    enabled: Boolean(id),
  });
  
  if (isLoading) return <Skeleton />;
  if (error || !data) return <ErrorState title="Erro" description="..." />;
  
  return (
    <div className="min-h-screen bg-background">
      <Hero title={data.name} subtitle={data.subtitle} />
      <main className="container py-8">
        {/* content */}
      </main>
    </div>
  );
}
```

## §11. Padrão de Wrapper V1/V3

```jsx
// src/pages/MyPage.jsx
import { useFeatureFlag } from '@/core/hooks/useFeatureFlag';
import MyPageV3 from '@/modules/mymodule/pages/MyPage.v3';
import MyPageV1 from '@/modules/mymodule/pages/MyPage.v1';

export default function MyPage() {
  const { enabled: useV3 } = useFeatureFlag('my-feature-v3');
  return useV3 ? <MyPageV3 /> : <MyPageV1 />;
}
```

## §12. Padrão de `withLayout`

```jsx
// src/lib/withLayout.jsx
import TopBar from '@/components/TopBar';
import BottomTabBar from '@/components/BottomTabBar';
import Footer from '@/components/Footer';

export function withLayout(name, Component) {
  return function Wrapped(props) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 pb-20 md:pb-0">
          <Component {...props} />
        </main>
        <Footer />
        <BottomTabBar />
      </div>
    );
  };
}
```

---

**Próxima leitura**: `05-DESIGN-SYSTEM.md` (design system, tokens).
