import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/core/lib/FirebaseAuthContext';
import { FeatureFlagsProvider } from '@/core/lib/FeatureFlagsContext';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import Layout from '@/components/Layout';
import { CookieBanner } from '@/components/CookieBanner';
import CommandPalette from '@/components/CommandPalette';
import { Toaster } from '@/components/ui/sonner';
import { recordPageView } from '@/core/services/observabilityService';

// ─── Páginas Públicas ─────────────────────────────────────────────────────────
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Terms = lazy(() => import('@/pages/Terms'));
const Legislation = lazy(() => import('@/pages/Legislation'));

// TASK-235: páginas públicas do programa de voluntariado
// (/voluntarios, /voluntarios/seja, /voluntarios/termo).
const VolunteerProgram = lazy(() => import('@/pages/VolunteerProgram'));
const VolunteerSignup = lazy(() => import('@/pages/VolunteerSignup'));
const VolunteerTermPreview = lazy(() => import('@/pages/VolunteerTermPreview'));
// Fase 19 (Legal Terms v1): visualizador único para todas as
// 6 páginas legais integrais (rota /legal/:slug*).
const LegalPageViewer = lazy(() => import('@/pages/legal/LegalPageViewer'));
// TASK-082 (Fase 18): página pública /busca (flag shelter_smart_search).
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const PublicExhibitions = lazy(() => import('@/pages/PublicExhibitions'));
const EventsUnified = lazy(() => import('@/pages/EventsUnified'));
const FosterDashboard = lazy(() => import('@/pages/FosterDashboard'));
const ShelterAdminDashboard = lazy(() => import('@/modules/shelter/components/ShelterAdminDashboard'));
const PublicExhibitionDetail = lazy(() => import('@/pages/PublicExhibitionDetail'));
const PublicFosterPrograms = lazy(() => import('@/pages/PublicFosterPrograms'));
const PublicFosterHistory = lazy(() => import('@/pages/PublicFosterHistory'));
const PublicMuralFeed = lazy(() => import('@/pages/PublicMuralFeed'));
const PageNotFound = lazy(() => import('@/pages/PageNotFound'));
const ShelterPublic = lazy(() => import('@/pages/ShelterPublic'));
const BannedNotice = lazy(() => import('@/pages/BannedNotice'));
const AdminDebugPage = lazy(() => import('@/pages/AdminDebugPage'));
const PublicDebugPage = lazy(() => import('@/pages/PublicDebugPage'));

// ─── Onboarding ───────────────────────────────────────────────────────────────
const ShelterContractsList = lazy(() => import('@/modules/contracts/pages/ShelterContractsList'));
const MyContracts = lazy(() => import('@/modules/contracts/pages/MyContracts'));
const PostAdoptionDashboard = lazy(() => import('@/modules/shelter/components/PostAdoptionDashboard'));
const ShelterOnboardingWizard = lazy(() => import('@/modules/shelter/pages/ShelterOnboardingWizard'));
const ShelterInterviewsList = lazy(() => import('@/modules/interview/pages/ShelterInterviewsList'));
const OnboardingQuestionnaire = lazy(() => import('@/modules/onboarding/pages/OnboardingQuestionnaire'));
const LegalGate = lazy(() => import('@/components/legal/LegalGate'));

// ─── Pets ─────────────────────────────────────────────────────────────────────
const PetFeed = lazy(() => import('@/modules/pets/pages/PetFeed'));
const PetDetail = lazy(() => import('@/modules/pets/pages/PetDetail'));
const PublicPet = lazy(() => import('@/modules/pets/pages/PublicPet'));
const CreatePet = lazy(() => import('@/modules/pets/pages/CreatePet'));
const MyPets = lazy(() => import('@/modules/pets/pages/MyPets'));
const MyInterests = lazy(() => import('@/modules/pets/pages/MyInterests'));
const RadarSettings = lazy(() => import('@/modules/pets/pages/RadarSettings'));

// ─── Organizações ─────────────────────────────────────────────────────────────
// `/organizacoes` = diretório de ONGs e hub de gestão.
const OrganizationsDirectory = lazy(() => import('@/modules/organizations/pages/ClubsDirectory'));
const OrganizationsHub = lazy(() => import('@/modules/organizations/pages/OrganizationsHub'));
const CreateOrganization = lazy(() => import('@/modules/organizations/pages/CreateClub'));
const OrganizationDetail = lazy(() => import('@/modules/organizations/pages/ClubDetail'));
const OrganizationAdminPanel = lazy(() => import('@/modules/organizations/pages/OrganizationAdminPanel'));
const EventDetail = lazy(() => import('@/modules/organizations/pages/EventDetail'));

// ─── Comunidades ──────────────────────────────────────────────────────────────
const CommunityForumPublic = lazy(() => import('@/pages/CommunityForumPublic'));
const CommunityPublic = lazy(() => import('@/pages/CommunityPublic'));
const CommunitiesDirectory = lazy(() => import('@/modules/communities/pages/CommunitiesDirectory'));
const CommunityDetail = lazy(() => import('@/modules/communities/pages/CommunityDetail'));
const CommunityAdminPanel = lazy(() => import('@/modules/communities/pages/CommunityAdminPanel'));
const CommunityEventDetail = lazy(() => import('@/modules/communities/pages/CommunityEventDetail'));

const CreateCommunity = lazy(() => import('@/modules/communities/pages/CreateCommunity'));

// ─── Chat ─────────────────────────────────────────────────────────────────────
const ChatPage = lazy(() => import('@/modules/chat/pages/ChatPage'));

// ─── Denúncias ────────────────────────────────────────────────────────────────
const CreateReport = lazy(() => import('@/modules/reports/pages/CreateReport'));

// ─── Perfil ───────────────────────────────────────────────────────────────────
const Profile = lazy(() => import('@/pages/Profile'));
// TASK-266: página dedicada /perfil/voluntario
const VolunteerProfile = lazy(() => import('@/pages/VolunteerProfile'));
// TASK-130: página individual do pedido de adoção (timeline).
const AdoptionDetail = lazy(() => import('@/pages/AdoptionDetail'));
// TASK-127: wizard "Quero adotar" (5 steps, pets de abrigo).
const AdoptionWizard = lazy(() => import('@/pages/AdoptionWizard'));

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('@/modules/admin/pages/AdminDashboard'));
const AdminPets = lazy(() => import('@/modules/admin/pages/AdminPets'));
const AdminReports = lazy(() => import('@/modules/admin/pages/AdminReports'));
const AdminUsers = lazy(() => import('@/modules/admin/pages/AdminUsers'));
const AdminOrganizations = lazy(() => import('@/modules/admin/pages/AdminOrganizations'));
const AdminCommunities = lazy(() => import('@/modules/admin/pages/AdminCommunities'));
const AdminMetrics = lazy(() => import('@/modules/admin/pages/AdminMetrics'));
const AdminAuditLog = lazy(() => import('@/modules/admin/pages/AdminAuditLog'));
const AdminNotifications = lazy(() => import('@/modules/admin/pages/AdminNotifications'));
const AdminPlatformSettings = lazy(() => import('@/modules/admin/pages/AdminPlatformSettings'));
const AdminFlags = lazy(() => import('@/modules/admin/pages/AdminFlags'));
// Fase 21: páginas de saúde, alertas de segurança, configuração de alertas e
// gerenciamento de platform_admins. Cada uma é linkada no AdminDashboard.
const PlatformHealth = lazy(() => import('@/modules/admin/pages/PlatformHealth'));
const SecurityAlerts = lazy(() => import('@/modules/admin/pages/SecurityAlerts'));
const AlertConfigs = lazy(() => import('@/modules/admin/pages/AlertConfigs'));
const AdminUserManagement = lazy(() => import('@/modules/admin/pages/AdminUserManagement'));
// Mock data — painel admin para carregar/limpar dados demo (TASK-400).
const AdminMockData = lazy(() => import('@/modules/admin/pages/AdminMockData'));

// ─── QueryClient ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const ONBOARDING_ALLOWED_PATHS = ['/onboarding', '/login', '/politica-privacidade', '/termos', '/legislacao'];

// ─── Guards ───────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <FullScreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function OnboardingGate({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, isProfileComplete } = useAuth();
  const isAllowedPath = ONBOARDING_ALLOWED_PATHS.some((path) => location.pathname.startsWith(path));
  if (isLoadingAuth) return isAllowedPath ? children : <FullScreenSpinner />;
  if (!isAuthenticated) return children;
  if (!isProfileComplete && !isAllowedPath) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }
  // Profile completo: envolve com LegalGate para checar aceites
  return <LegalGate>{children}</LegalGate>;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isLoadingAuth, isPlatformAdmin } = useAuth();
  if (isLoadingAuth) return <FullScreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isPlatformAdmin) return <Navigate to="/feed" replace />;
  return children;
}

function BannedGate({ children }) {
  const { isAuthenticated, isBanned } = useAuth();
  if (isAuthenticated && isBanned) return <BannedNotice />;
  return children;
}

function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="text-3xl">🐾</div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    </div>
  );
}

function withLayout(pageName, Component) {
  return (
    <Layout currentPageName={pageName}>
      <Component />
    </Layout>
  );
}

function RouteTelemetry() {
  const location = useLocation();
  useEffect(() => {
    recordPageView(location.pathname);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);
  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagsProvider>
          <ConfirmProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <RouteTelemetry />
            {/* TASK-083: paleta global Cmd+K (flag shelter_smart_search) */}
            <CommandPalette />
            {/* Banner global de cookies — renderizado no nível mais
                externo possível para cobrir todas as rotas. Gated por
                feature flag dentro do componente. */}
            <CookieBanner />
            <Suspense fallback={<FullScreenSpinner />}>
              <BannedGate>
              <OnboardingGate>
              <Routes>
                {/* ── Públicas ─────────────────────────────────────────── */}
                <Route path="/" element={withLayout('Home', Home)} />
                <Route path="/login" element={withLayout('Login', Login)} />
                <Route path="/politica-privacidade" element={withLayout('PrivacyPolicy', PrivacyPolicy)} />
                <Route path="/termos" element={withLayout('Terms', Terms)} />
                <Route path="/legislacao" element={withLayout('Legislation', Legislation)} />

                {/* TASK-235: programa de voluntariado (público, com auth opcional).
                    /voluntarios        — landing institucional
                    /voluntarios/seja   — inscrição (4 passos; redireciona pra /login se anônimo)
                    /voluntarios/termo  — texto integral do termo v2 */}
                <Route path="/voluntarios" element={withLayout('VolunteerProgram', VolunteerProgram)} />
                <Route path="/voluntarios/seja" element={withLayout('VolunteerSignup', VolunteerSignup)} />
                <Route path="/voluntarios/termo" element={withLayout('VolunteerTermPreview', VolunteerTermPreview)} />

                {/* Debug page pública — sem auth. Use ?debug=1 para ativar */}
                <Route
                  path="/public-debug"
                  element={withLayout('PublicDebugPage', PublicDebugPage)}
                />
                {/* Debug page (admin only) */}
                <Route
                  path="/admin-debug"
                  element={<AdminRoute>{withLayout('AdminDebugPage', AdminDebugPage)}</AdminRoute>}
                />
                {/* Fase 19: páginas legais integrais sob /legal/*.
                    Flag-gated — se OFF, o viewer redireciona para a rota
                    legada correspondente. */}
                <Route path="/legal/:slug/*" element={withLayout('LegalPageViewer', LegalPageViewer)} />
                <Route path="/busca" element={withLayout('SearchPage', SearchPage)} />
                <Route path="/vitrines" element={withLayout('PublicExhibitions', PublicExhibitions)} />
                <Route path="/eventos" element={withLayout('EventsUnified', EventsUnified)} />
                <Route path="/lares-temporarios/dashboard" element={withLayout('FosterDashboard', FosterDashboard)} />
                <Route path="/abrigo/:clubId/onboarding" element={withLayout('ShelterOnboarding', ShelterOnboardingWizard)} />
                <Route path="/lares-temporarios/:uid/historico" element={withLayout('PublicFosterHistory', PublicFosterHistory)} />
                <Route path="/abrigos/:clubId/admin/dashboard" element={withLayout('ShelterAdminDashboard', ShelterAdminDashboard)} />
                <Route path="/vitrines/:id" element={withLayout('PublicExhibitionDetail', PublicExhibitionDetail)} />
                <Route path="/lares-temporarios" element={withLayout('PublicFosterPrograms', PublicFosterPrograms)} />
                <Route path="/mural" element={withLayout('PublicMuralFeed', PublicMuralFeed)} />

                {/* ── Onboarding (auth obrigatória, perfil ainda não completo) ── */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingQuestionnaire />
                    </ProtectedRoute>
                  }
                />

                {/* ── Feed público de pets (auth opcional) ─────────────── */}
                <Route path="/feed" element={withLayout('PetFeed', PetFeed)} />
                <Route path="/pet/:petId" element={<PublicPet />} />
                <Route path="/pets/:petId" element={withLayout('PetDetail', PetDetail)} />

                {/* ── Pets autenticados ─────────────────────────────────── */}
                <Route
                  path="/pets/new"
                  element={<ProtectedRoute>{withLayout('CreatePet', CreatePet)}</ProtectedRoute>}
                />
                <Route
                  path="/pets/:petId/edit"
                  element={<ProtectedRoute>{withLayout('CreatePet', CreatePet)}</ProtectedRoute>}
                />
                <Route
                  path="/meus-pets"
                  element={<ProtectedRoute>{withLayout('MyPets', MyPets)}</ProtectedRoute>}
                />
                <Route
                  path="/meus-interesses"
                  element={<ProtectedRoute>{withLayout('MyInterests', MyInterests)}</ProtectedRoute>}
                />
                <Route
                  path="/radar"
                  element={<ProtectedRoute>{withLayout('RadarSettings', RadarSettings)}</ProtectedRoute>}
                />

                {/* ── Comunidade (grupos de usuários, fóruns) ─────────────── */}
                <Route path="/comunidade" element={withLayout('CommunitiesDirectory', CommunitiesDirectory)} />
                <Route
                  path="/comunidade/criar"
                  element={<ProtectedRoute>{withLayout('CreateCommunity', CreateCommunity)}</ProtectedRoute>}
                />
                <Route
                  path="/comunidade/:communityId"
                  element={<ProtectedRoute>{withLayout('CommunityDetail', CommunityDetail)}</ProtectedRoute>}
                />
                {/* TASK-334: detalhe público de evento de comunidade com RSVP. */}
                <Route
                  path="/comunidade/:communityId/eventos/:eventId"
                  element={<ProtectedRoute>{withLayout('CommunityEventDetail', CommunityEventDetail)}</ProtectedRoute>}
                />
                <Route path="/comunidade/:communityId/admin" element={<ProtectedRoute>{withLayout('CommunityAdminPanel', CommunityAdminPanel)}</ProtectedRoute>} />
                {/* TASK-156: página pública de comunidade com mural read-only.
                    Sem auth — anon consegue ver o mural, mas não postar. */}
                <Route path="/comunidades/:slug" element={withLayout('CommunityPublic', CommunityPublic)} />
                {/* TASK-159: feed público do fórum da comunidade (read-only). */}
                <Route path="/comunidades/:slug/forum" element={withLayout('CommunityForumPublic', CommunityForumPublic)} />


                {/* ── Organizações (ONGs) ───────────────────────────────── */}
                <Route path="/organizacoes" element={withLayout('OrganizationsDirectory', OrganizationsDirectory)} />
                <Route
                  path="/organizacoes/hub"
                  element={<ProtectedRoute>{withLayout('OrganizationsHub', OrganizationsHub)}</ProtectedRoute>}
                />
                <Route
                  path="/organizacoes/criar"
                  element={<ProtectedRoute>{withLayout('CreateOrganization', CreateOrganization)}</ProtectedRoute>}
                />
                <Route
                  path="/organizacoes/:orgId/admin"
                  element={<ProtectedRoute>{withLayout('OrganizationAdminPanel', OrganizationAdminPanel)}</ProtectedRoute>}
                />
                <Route path="/organizacoes/:orgId" element={<ProtectedRoute>{withLayout('OrganizationDetail', OrganizationDetail)}</ProtectedRoute>} />
                <Route path="/abrigos/:shelterId" element={withLayout('ShelterPublic', ShelterPublic)} />
                {/* TASK-288: contratos do abrigo (Lei 14.063/2020) — visível para
                    admins do abrigo (gate via contractsService). */}
                <Route
                  path="/abrigos/:shelterId/contracts"
                  element={<ProtectedRoute>{withLayout('ShelterContracts', ShelterContractsList)}</ProtectedRoute>}
                />
                {/* TASK-290: entrevistas do abrigo — visível para admins do
                    abrigo (gate via interviewService). */}
                <Route
                  path="/abrigos/:shelterId/interviews"
                  element={<ProtectedRoute>{withLayout('ShelterInterviews', ShelterInterviewsList)}</ProtectedRoute>}
                />
                <Route
                  path="/organizacoes/:orgId/eventos/:eventId"
                  element={<ProtectedRoute>{withLayout('EventDetail', EventDetail)}</ProtectedRoute>}
                />

                {/* ── Chat ─────────────────────────────────────────────── */}
                <Route
                  path="/chat"
                  element={<ProtectedRoute>{withLayout('Chat', ChatPage)}</ProtectedRoute>}
                />
                <Route
                  path="/chat/:conversationId"
                  element={<ProtectedRoute>{withLayout('Chat', ChatPage)}</ProtectedRoute>}
                />

                {/* ── Denúncias ─────────────────────────────────────────── */}
                <Route
                  path="/denuncias/nova"
                  element={<ProtectedRoute>{withLayout('CreateReport', CreateReport)}</ProtectedRoute>}
                />

                {/* ── Perfil ────────────────────────────────────────────── */}
                <Route
                  path="/perfil"
                  element={<ProtectedRoute>{withLayout('Profile', Profile)}</ProtectedRoute>}
                />
                <Route
                  path="/perfil/voluntario"
                  element={<ProtectedRoute>{withLayout('VolunteerProfile', VolunteerProfile)}</ProtectedRoute>}
                />
                {/* TASK-288: contratos do adotante — apenas os próprios */}
                <Route
                  path="/perfil/contratos"
                  element={<ProtectedRoute>{withLayout('MyContracts', MyContracts)}</ProtectedRoute>}
                />
                <Route
                  path="/adocoes/:clubId/:applicationId"
                  element={<ProtectedRoute>{withLayout('AdoptionDetail', AdoptionDetail)}</ProtectedRoute>}
                />
                <Route
                  path="/quero-adotar/:petId"
                  element={<ProtectedRoute>{withLayout('AdoptionWizard', AdoptionWizard)}</ProtectedRoute>}
                />
                {/* TASK-289: dashboard pessoal do adotante pós-adoção */}
                <Route
                  path="/adoptions"
                  element={<ProtectedRoute>{withLayout('PostAdoptionDashboard', PostAdoptionDashboard)}</ProtectedRoute>}
                />

                {/* ── Admin ─────────────────────────────────────────────── */}
                <Route
                  path="/admin"
                  element={<AdminRoute>{withLayout('AdminDashboard', AdminDashboard)}</AdminRoute>}
                />
                <Route
                  path="/admin/pets"
                  element={<AdminRoute>{withLayout('AdminPets', AdminPets)}</AdminRoute>}
                />
                <Route
                  path="/admin/denuncias"
                  element={<AdminRoute>{withLayout('AdminReports', AdminReports)}</AdminRoute>}
                />
                <Route
                  path="/admin/usuarios"
                  element={<AdminRoute>{withLayout('AdminUsers', AdminUsers)}</AdminRoute>}
                />
                <Route
                  path="/admin/organizacoes"
                  element={<AdminRoute>{withLayout('AdminOrganizations', AdminOrganizations)}</AdminRoute>}
                />
                <Route
                  path="/admin/comunidades"
                  element={<AdminRoute>{withLayout('AdminCommunities', AdminCommunities)}</AdminRoute>}
                />
                <Route
                  path="/admin/metricas"
                  element={<AdminRoute>{withLayout('AdminMetrics', AdminMetrics)}</AdminRoute>}
                />
                <Route
                  path="/admin/auditoria"
                  element={<AdminRoute>{withLayout('AdminAuditLog', AdminAuditLog)}</AdminRoute>}
                />
                <Route
                  path="/admin/notificacoes"
                  element={<AdminRoute>{withLayout('AdminNotifications', AdminNotifications)}</AdminRoute>}
                />
                <Route
                  path="/admin/configuracoes"
                  element={<AdminRoute>{withLayout('AdminPlatformSettings', AdminPlatformSettings)}</AdminRoute>}
                />
                <Route
                  path="/admin/flags"
                  element={<AdminRoute>{withLayout('AdminFlags', AdminFlags)}</AdminRoute>}
                />
                <Route
                  path="/admin/saude"
                  element={<AdminRoute>{withLayout('PlatformHealth', PlatformHealth)}</AdminRoute>}
                />
                <Route
                  path="/admin/security-alerts"
                  element={<AdminRoute>{withLayout('SecurityAlerts', SecurityAlerts)}</AdminRoute>}
                />
                <Route
                  path="/admin/alertas"
                  element={<AdminRoute>{withLayout('AlertConfigs', AlertConfigs)}</AdminRoute>}
                />
                <Route
                  path="/admin/admins"
                  element={<AdminRoute>{withLayout('AdminUserManagement', AdminUserManagement)}</AdminRoute>}
                />
                <Route
                  path="/admin/mock-data"
                  element={<AdminRoute>{withLayout('AdminMockData', AdminMockData)}</AdminRoute>}
                />

                {/* ── Redirects legados ─────────────────────────────────── */}
                <Route path="/inicio" element={<Navigate to="/feed" replace />} />
                <Route path="/clubes" element={<Navigate to="/comunidade" replace />} />
                <Route path="/atletas" element={<Navigate to="/feed" replace />} />
                {/* ── 404 ──────────────────────────────────────────────── */}
                <Route path="*" element={<PageNotFound />} />
              </Routes>
              </OnboardingGate>
              </BannedGate>
            </Suspense>
          </BrowserRouter>
          </ConfirmProvider>
          <Toaster />
        </FeatureFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
