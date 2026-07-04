import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/core/lib/FirebaseAuthContext';
import { FeatureFlagsProvider } from '@/core/lib/FeatureFlagsContext';
import Layout from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';
import { recordPageView } from '@/core/services/observabilityService';

// ─── Páginas Públicas ─────────────────────────────────────────────────────────
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Terms = lazy(() => import('@/pages/Terms'));
const Legislation = lazy(() => import('@/pages/Legislation'));
const PageNotFound = lazy(() => import('@/pages/PageNotFound'));
const BannedNotice = lazy(() => import('@/pages/BannedNotice'));

// ─── Onboarding ───────────────────────────────────────────────────────────────
const OnboardingQuestionnaire = lazy(() => import('@/modules/onboarding/pages/OnboardingQuestionnaire'));

// ─── Pets ─────────────────────────────────────────────────────────────────────
const PetFeed = lazy(() => import('@/modules/pets/pages/PetFeed'));
const PetDetail = lazy(() => import('@/modules/pets/pages/PetDetail'));
const CreatePet = lazy(() => import('@/modules/pets/pages/CreatePet'));
const MyPets = lazy(() => import('@/modules/pets/pages/MyPets'));
const RadarSettings = lazy(() => import('@/modules/pets/pages/RadarSettings'));

// ─── Organizações ─────────────────────────────────────────────────────────────
// `/comunidade` = diretório e perfil público das organizações (aberto a todos).
// `/organizacoes` = hub de gestão (só quem administra alguma organização).
const OrganizationsDirectory = lazy(() => import('@/modules/organizations/pages/ClubsDirectory'));
const OrganizationsHub = lazy(() => import('@/modules/organizations/pages/OrganizationsHub'));
const CreateOrganization = lazy(() => import('@/modules/organizations/pages/CreateClub'));
const OrganizationDetail = lazy(() => import('@/modules/organizations/pages/ClubDetail'));
const OrganizationAdminPanel = lazy(() => import('@/modules/organizations/pages/OrganizationAdminPanel'));
const OrganizationEventDetail = lazy(() => import('@/modules/organizations/pages/EventDetail'));

// ─── Chat ─────────────────────────────────────────────────────────────────────
const ChatPage = lazy(() => import('@/modules/chat/pages/ChatPage'));

// ─── Denúncias ────────────────────────────────────────────────────────────────
const CreateReport = lazy(() => import('@/modules/reports/pages/CreateReport'));

// ─── Perfil ───────────────────────────────────────────────────────────────────
const Profile = lazy(() => import('@/pages/Profile'));

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('@/modules/admin/pages/AdminDashboard'));
const AdminPets = lazy(() => import('@/modules/admin/pages/AdminPets'));
const AdminReports = lazy(() => import('@/modules/admin/pages/AdminReports'));
const AdminUsers = lazy(() => import('@/modules/admin/pages/AdminUsers'));
const AdminOrganizations = lazy(() => import('@/modules/admin/pages/AdminOrganizations'));
const AdminMetrics = lazy(() => import('@/modules/admin/pages/AdminMetrics'));
const AdminAuditLog = lazy(() => import('@/modules/admin/pages/AdminAuditLog'));
const AdminNotifications = lazy(() => import('@/modules/admin/pages/AdminNotifications'));
const AdminPlatformSettings = lazy(() => import('@/modules/admin/pages/AdminPlatformSettings'));

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
  return children;
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

// ─── Redirects legados (Organizações) ────────────────────────────────────────
// `/organizacoes/:orgId` passou a ser o hub de gestão; o perfil público da
// organização (o antigo destino desta rota) agora vive em `/comunidade/:orgId`.
// Notificações antigas já gravadas no Firestore ainda apontam para o caminho
// anterior — estes redirects preservam esses links.
function LegacyOrgDetailRedirect() {
  const { orgId } = useParams();
  const location = useLocation();
  return <Navigate to={`/comunidade/${orgId}${location.search}`} replace />;
}

function LegacyOrgEventRedirect() {
  const { orgId, eventId } = useParams();
  return <Navigate to={`/comunidade/${orgId}/eventos/${eventId}`} replace />;
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
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <RouteTelemetry />
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
                  path="/radar"
                  element={<ProtectedRoute>{withLayout('RadarSettings', RadarSettings)}</ProtectedRoute>}
                />

                {/* ── Comunidade (diretório público de organizações) ────── */}
                <Route path="/comunidade" element={withLayout('OrganizationsDirectory', OrganizationsDirectory)} />
                <Route
                  path="/comunidade/:orgId/eventos/:eventId"
                  element={<ProtectedRoute>{withLayout('OrganizationEventDetail', OrganizationEventDetail)}</ProtectedRoute>}
                />
                <Route
                  path="/comunidade/:orgId"
                  element={<ProtectedRoute>{withLayout('OrganizationDetail', OrganizationDetail)}</ProtectedRoute>}
                />

                {/* ── Organizações (hub de gestão) ──────────────────────── */}
                <Route
                  path="/organizacoes"
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
                <Route path="/organizacoes/:orgId/eventos/:eventId" element={<LegacyOrgEventRedirect />} />
                <Route path="/organizacoes/:orgId" element={<LegacyOrgDetailRedirect />} />

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

                {/* ── Redirects legados ─────────────────────────────────── */}
                <Route path="/inicio" element={<Navigate to="/feed" replace />} />
                <Route path="/clubes" element={<Navigate to="/comunidade" replace />} />
                <Route path="/atletas" element={<Navigate to="/feed" replace />} />

                {/* ── 404 ───────────────────────────────────────────────── */}
                <Route path="*" element={<PageNotFound />} />
              </Routes>
              </OnboardingGate>
              </BannedGate>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </FeatureFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
