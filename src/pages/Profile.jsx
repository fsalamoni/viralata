import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  User, Download, ShieldAlert, PawPrint, Star, ArrowLeft, LogOut, Building2,
  Home as HomeIcon, Trees, Tractor, Bird, AlertTriangle, Shield, Key, Smartphone,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/core/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ImageUpload } from '@/components/ui/image-upload';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PasswordConfirmDialog } from '@/components/ui/password-confirm-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getRatingsForUser, summarizeRatings } from '@/modules/pets/services/ratingService';
import { QrCode } from '@/components/ui/qr-code';
import {
  getMfaStatus,
  startMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  regenerateRecoveryCodes,
} from '@/core/services/mfaService';
import { exportMyData, downloadDataExport } from '@/core/services/dataExportService';
import { deleteMyAccount } from '@/core/services/deleteAccountService';
import PageHero from '@/components/PageHero';
import MyAdoptionsSection from '@/modules/shelter/components/MyAdoptionsSection';
import MyTasksSection from '@/modules/shelter/components/MyTasksSection';
import UpcomingEventsSection from '@/modules/communities/components/UpcomingEventsSection';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { VolunteerSection } from '@/modules/shelter/components/VolunteerSection';
import { MyFostersSection } from '@/modules/shelter/components/MyFostersSection';
import { CrossRosterSection } from '@/modules/shelter/components/CrossRosterSection';
import { AppearanceSettings } from '@/components/AppearanceSettings';
import { VolunteerProfileForm } from '@/modules/shelter/components/VolunteerProfileForm';
import { VolunteerMetricsCard } from '@/modules/shelter/components/VolunteerMetricsCard';
import {
  useVolunteerProfile,
  useUserVolunteerRosters,
  useLeaveShelter,
  useWithdrawVolunteerConsent,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  VOLUNTEER_EXIT_REASONS,
  VOLUNTEER_EXIT_REASON_LABELS,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'non_binary', label: 'Não-binário' },
  { value: 'prefer_not_to_say', label: 'Prefiro não informar' },
];

// Mesmos valores usados em modules/onboarding/pages/OnboardingQuestionnaire.jsx
// e checados por modules/pets/domain/matching.js — não renomear sem atualizar os dois.
const HOUSING_OPTIONS = [
  { value: 'house_with_yard', label: 'Casa com pátio', icon: Trees },
  { value: 'house_no_yard', label: 'Casa sem pátio', icon: HomeIcon },
  { value: 'apartment_screened', label: 'Apartamento com tela de proteção', icon: Building2 },
  { value: 'apartment_unscreened', label: 'Apartamento sem tela', icon: Building2 },
  { value: 'farm', label: 'Sítio / Fazenda', icon: Tractor },
];

const WALKS_OPTIONS = [
  { value: 'none', label: 'Não costumo passear' },
  { value: 'short', label: 'Passeios curtos (menos de 30 min)' },
  { value: 'long', label: 'Passeios longos (mais de 30 min)' },
];

const BUDGET_OPTIONS = [
  { value: 'basic', label: 'Básico — até R$200/mês' },
  { value: 'moderate', label: 'Moderado — R$200 a R$500/mês' },
  { value: 'high', label: 'Alto — acima de R$500/mês' },
];

const OTHER_PET_OPTIONS = [
  { value: 'dog', label: 'Cachorro', icon: PawPrint },
  { value: 'cat', label: 'Gato', icon: PawPrint },
  { value: 'bird', label: 'Pássaro', icon: Bird },
  { value: 'other', label: 'Outro', icon: PawPrint },
];

function ChoiceChip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
        active ? 'border-2 border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)]' : 'border-2 border-border bg-card text-foreground/75 hover:border-primary/40'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ChoiceRow({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition-colors ${
        active ? 'border-primary bg-primary/[0.08] font-bold text-[hsl(14,55%,26%)]' : 'border-border bg-card font-semibold text-foreground/80 hover:border-primary/40'
      }`}
    >
      {Icon && <Icon className="h-[19px] w-[19px] shrink-0" />}
      {children}
    </button>
  );
}

function buildProfileForm(userProfile, user) {
  return {
    fullName: userProfile?.full_name || user?.displayName || '',
    phone: userProfile?.phone || '',
    city: userProfile?.city || '',
    stateUf: userProfile?.state || '',
    gender: userProfile?.gender || '',
    housing: userProfile?.housing_type || '',
    dailyWalks: userProfile?.daily_walks || '',
    hasChildren: userProfile?.has_children === true,
    childrenAges: userProfile?.children_ages || '',
    hasElderly: userProfile?.has_elderly === true,
    otherPets: Array.isArray(userProfile?.other_pets) ? userProfile.other_pets : [],
    budgetLevel: userProfile?.budget_level || '',
    phonePublic: userProfile?.phone_public === true,
    photoUrl: userProfile?.photo_url || user?.photoURL || '',
  };
}

/**
 * Hook: busca o nome público de um clube (abrigo) a partir do id.
 * Pequeno cache in-memory por sessão para evitar refetch repetido.
 */
const _clubNameCache = new Map();
function useClubName(clubId) {
  return useQuery({
    queryKey: ['club-name', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      if (_clubNameCache.has(clubId)) return _clubNameCache.get(clubId);
      const snap = await getDoc(doc(db, 'clubs', clubId));
      if (!snap.exists()) {
        _clubNameCache.set(clubId, null);
        return null;
      }
      const data = snap.data();
      const name = data.name || data.title || data.display_name || null;
      _clubNameCache.set(clubId, name);
      return name;
    },
    enabled: Boolean(clubId),
    staleTime: 1000 * 60 * 5,
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile, signOut } = useAuth();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6 pb-16');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: ratings = [] } = useQuery({
    queryKey: ['adoption_ratings', 'user', user?.uid],
    queryFn: () => getRatingsForUser(user.uid),
    enabled: Boolean(user?.uid),
    staleTime: 1000 * 60 * 5,
  });
  const { avg: ratingAvg, count: ratingCount } = summarizeRatings(ratings);
  const memberSinceYear = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).getFullYear()
    : null;

  // TASK-236: gate + dados do perfil de voluntário.
  // `useVolunteerProfile(uid)` aceita `null`/`undefined` quando o gate está OFF,
  // evitando refetch. Quando o gate é ON, o hook busca o profile global do user.
  const volunteerProfileV1 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const { data: volunteerProfile, isLoading: isVPLoading } = useVolunteerProfile(
    volunteerProfileV1 && user?.uid ? user.uid : null,
  );

  // TASK-242: lista de rostagens do voluntário + offboarding.
  // (LGPD Art. 18 IX — revogação de consentimento)
  const { data: myRosters = [], isLoading: isRostersLoading } = useUserVolunteerRosters(
    volunteerProfileV1 && user?.uid ? user.uid : null,
  );

  // TASK-150: dashboard pessoal de cards Kanban (cross-shelter).
  const shelterKanban = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_KANBAN);
  const withdrawConsent = useWithdrawVolunteerConsent(user?.uid);
  const [exitState, setExitState] = useState({
    roster: null,           // { shelterClubId, volunteerName }
    reason: 'time',
    note: '',
    allShelters: false,     // "Sair de todos os abrigos"
    allVolunteering: false, // "Encerrar voluntariado completamente"
    typeConfirm: '',
  });
  const openLeaveOne = useCallback((roster) => {
    setExitState({
      roster: {
        shelterClubId: roster.shelter_club_id,
        volunteerName: roster.volunteer_name || 'este abrigo',
      },
      reason: 'time',
      note: '',
      allShelters: false,
      allVolunteering: false,
      typeConfirm: '',
    });
  }, []);
  const closeLeaveDialog = useCallback(() => {
    setExitState((prev) => ({ ...prev, roster: null, typeConfirm: '' }));
  }, []);

  const [form, setForm] = useState(() => buildProfileForm(userProfile, user));
  const [busy, setBusy] = useState(false);
  const dirtyFieldsRef = useRef(new Set());
  const lastUserIdRef = useRef(user?.uid || null);

  const updateField = useCallback((field, valueOrUpdater) => {
    dirtyFieldsRef.current.add(field);
    setForm((prev) => ({
      ...prev,
      [field]: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev[field]) : valueOrUpdater,
    }));
  }, []);

  useEffect(() => {
    const nextForm = buildProfileForm(userProfile, user);
    const currentUserId = user?.uid || null;
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      dirtyFieldsRef.current.clear();
      setForm(nextForm);
      return;
    }
    setForm((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const [field, value] of Object.entries(nextForm)) {
        if (!dirtyFieldsRef.current.has(field) && merged[field] !== value) {
          merged[field] = value;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [user?.uid, user?.displayName, user?.photoURL, userProfile]);

  const {
    fullName,
    phone,
    city,
    stateUf,
    gender,
    housing,
    dailyWalks,
    hasChildren,
    childrenAges,
    hasElderly,
    otherPets,
    budgetLevel,
    phonePublic,
    photoUrl,
  } = form;

  function toggleOtherPet(pet) {
    updateField('otherPets', (prev) => (prev.includes(pet) ? prev.filter((p) => p !== pet) : [...prev, pet]));
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state: stateUf.trim().toUpperCase(),
        gender,
        housing_type: housing,
        daily_walks: dailyWalks,
        has_children: hasChildren,
        children_ages: hasChildren ? childrenAges.trim() : '',
        has_elderly: hasElderly,
        other_pets: otherPets,
        budget_level: budgetLevel,
        phone_public: phonePublic,
        photo_url: photoUrl,
      });
      dirtyFieldsRef.current.clear();
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    try {
      const data = await exportMyData(user.uid);
      downloadDataExport(data, user.uid);
      toast.success('Seus dados foram baixados.');
    } catch (err) {
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount(user);
      toast.success('Sua conta foi excluída.');
      await signOut();
      navigate('/');
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, saia e entre novamente antes de excluir sua conta.');
      } else {
        toast.error('Erro ao excluir conta. Tente novamente.');
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="arena-page max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
        <RatingBadge uid={user?.uid} />
      </div>

      {/* Dados pessoais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-primary" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <ImageUpload
                value={photoUrl}
                onChange={(value) => updateField('photoUrl', value)}
                folder="avatar"
                shape="circle"
              />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{user?.email}</p>
                <p>Clique na foto para alterar</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="gap-y-section-xs">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="gap-y-section-xs">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" value={phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 gap-y-section-xs">
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" value={city} onChange={(e) => updateField('city', e.target.value)} placeholder="Sua cidade" required />
              </div>
              <div className="gap-y-section-xs">
                <Label htmlFor="state">UF *</Label>
                <Input id="state" value={stateUf} onChange={(e) => updateField('stateUf', e.target.value)} maxLength={2} placeholder="SP" required />
              </div>
            </div>

            <div className="gap-y-section-sm">
              <Label>Gênero</Label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map(({ value, label }) => (
                  <ChoiceChip key={value} active={gender === value} onClick={() => updateField('gender', value)}>{label}</ChoiceChip>
                ))}
              </div>
            </div>

            {/* Privacidade */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Exibir telefone publicamente</p>
                <p className="text-xs text-muted-foreground">Visível para responsáveis de pets que você demonstrar interesse</p>
              </div>
              <Switch checked={phonePublic} onCheckedChange={(value) => updateField('phonePublic', value === true)} />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </form>
        </div>
      </section>

      {/* Perfil de adotante */}
      <section id="perfil-adotante" className="arena-section-card rounded-[24px] p-6 lg:p-7">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
            <PawPrint className="w-[19px] h-[19px] text-accent" /> Perfil de adotante
          </h3>
          <p className="arena-section-card-description">
            Usado pelo algoritmo de match para sugerir pets compatíveis com sua realidade.
          </p>
        </div>
        <div className="arena-section-card-body gap-y-section-md p-0 pt-4">
          <div className="gap-y-section-sm">
            <Label>Tipo de moradia</Label>
            <div className="flex flex-col gap-2">
              {HOUSING_OPTIONS.map(({ value, label, icon }) => (
                <ChoiceRow key={value} active={housing === value} icon={icon} onClick={() => updateField('housing', value)}>{label}</ChoiceRow>
              ))}
            </div>
          </div>

          <div className="gap-y-section-sm">
            <Label>Rotina de passeios</Label>
            <div className="flex flex-wrap gap-2">
              {WALKS_OPTIONS.map(({ value, label }) => (
                <ChoiceChip key={value} active={dailyWalks === value} onClick={() => updateField('dailyWalks', value)}>{label}</ChoiceChip>
              ))}
            </div>
          </div>

          <div className="gap-y-section-sm">
            <Label>Orçamento para cuidados do pet</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(({ value, label }) => (
                <ChoiceChip key={value} active={budgetLevel === value} onClick={() => updateField('budgetLevel', value)}>{label}</ChoiceChip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5">
            <p className="text-[13px] font-bold text-foreground">Tenho crianças em casa</p>
            <Switch checked={hasChildren} onCheckedChange={(value) => updateField('hasChildren', value === true)} />
          </div>
          {hasChildren && (
            <Input
              value={childrenAges}
              onChange={(e) => updateField('childrenAges', e.target.value)}
              placeholder="Idades das crianças (ex: 3, 7 anos)"
            />
          )}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5">
            <p className="text-[13px] font-bold text-foreground">Tenho idosos em casa</p>
            <Switch checked={hasElderly} onCheckedChange={(value) => updateField('hasElderly', value === true)} />
          </div>

          <div className="gap-y-section-sm">
            <Label>Já tem outros animais?</Label>
            <div className="grid grid-cols-2 gap-2">
              {OTHER_PET_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleOtherPet(value)}
                  className={`text-left px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                    otherPets.includes(value)
                      ? 'border-primary bg-primary/10 text-foreground font-medium'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={busy} className="w-full">
            {busy ? 'Salvando...' : 'Salvar perfil de adotante'}
          </Button>
        </div>
      </section>

      {/* TASK-401: Preferências visuais */}
      {user?.uid && <div id="visual"><AppearanceSettings /></div>}

      {/* TASK-265: Seção consolidada "Voluntário" com métricas, habilidades,
          abrigos, escalas abertas, auditoria e form de edição. Substitui
          os 3 cards dispersos. */}
      {volunteerProfileV1 && user?.uid && (
        <section id="voluntario"><VolunteerSection /></section>
      )}

      {/* TASK-247: Multi-roster agregado (Voluntário + LT) */}
      {user?.uid && (
        <section id="voluntario">
          <CrossRosterSection
          volunteerData={volunteerProfileV1 ? { shelterId: user?.uid } : null}
          fosterData={{ activeFosters: [] }}
          shelterOptions={[]}
          onJoinVolunteer={() => window.location.assign('/voluntarios')}
          />
        </section>
      )}

      {/* TASK-133: Meus Lares Temporários */}
      <section id="lares-temporarios"><MyFostersSection userUid={user?.uid} /></section>

      {/* TASK-236: Perfil de voluntário (Fase 13).
          Renderiza apenas se a feature flag `shelter_volunteer_profile_v1`
          estiver ON. Quando o user já tem profile, mostra o form em modo
          edit; quando não tem, mostra empty state com CTA para /voluntarios. */}
      {volunteerProfileV1 && (
        <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
          <div className="arena-section-card-header">
            <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
              <Heart className="w-[19px] h-[19px] text-primary" /> Voluntariado
            </h3>
            <p className="arena-section-card-description">
              Cadastre suas habilidades, disponibilidade e logística para participar de ações nos abrigos.
            </p>
          </div>
          <div className="arena-section-card-body p-0">
            {isVPLoading ? (
              <div className="gap-y-section-md">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : volunteerProfile ? (
              <VolunteerProfileForm
                uid={user?.uid}
                actor={{ uid: user?.uid, email: user?.email }}
                existing={volunteerProfile}
                readOnly={false}
              />
            ) : (
              <EmptyState
                icon={Heart}
                title="Você ainda não é voluntário"
                description="Veja como participar do programa de voluntariado da sua cidade."
                action={
                  <Button asChild>
                    <Link to="/voluntarios">Conhecer o programa</Link>
                  </Button>
                }
              />
            )}
          </div>
        </section>
      )}

      {/* TASK-129: Minhas adoções — histórico cross-abrigo de applications */}
      {/* TASK-164: Próximos eventos do usuário (cross-comunidade) */}
      <section id="adocoes">
        <UpcomingEventsSection userUid={user?.uid} />
        <div className="mt-4"><MyAdoptionsSection userUid={user?.uid} /></div>
      </section>

      {/* TASK-150: Minhas tarefas — cards Kanban onde o user é assignee,
          cross-shelter (todos os abrigos onde ele participa). Gated pela
          flag `shelter_kanban`. Click abre o detalhe do card. */}
      {shelterKanban && <MyTasksSection userUid={user?.uid} />}

      {/* TASK-242: Minhas voluntariadas (offboarding · LGPD Art. 18 IX).
          Renderiza apenas se a flag `shelter_volunteer_profile_v1` estiver ON.
          Lista todas as rostagens (per-shelter) do voluntário, com botão
          "Sair deste abrigo" + ações globais de revogação de consentimento. */}
      {volunteerProfileV1 && (
        <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
          <div className="arena-section-card-header">
            <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
              <Building2 className="w-[19px] h-[19px] text-primary" /> Minhas voluntariadas
            </h3>
            <p className="arena-section-card-description">
              Abrigos onde você é voluntário. Conforme a LGPD (Art. 18, IX), você pode revogar seu consentimento a qualquer momento.
            </p>
          </div>
          <div className="arena-section-card-body gap-y-section-lg p-0">
            {isRostersLoading ? (
              <div className="gap-y-section-sm">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : myRosters.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Você ainda não está na rostagem de nenhum abrigo"
                description="Conheça o programa de voluntariado e candidate-se a um abrigo."
                action={(
                  <Button asChild variant="outline">
                    <Link to="/voluntarios">Conhecer o programa</Link>
                  </Button>
                )}
              />
            ) : (
              <ul className="gap-y-section-sm.5">
                {myRosters.map((r) => (
                  <VolunteerRosterRow
                    key={`${r.shelter_club_id}::${r.id}`}
                    roster={r}
                    onLeave={openLeaveOne}
                  />
                ))}
              </ul>
            )}

            {myRosters.length > 0 && (
              <div className="mt-4 gap-y-section-sm.5 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-3.5">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-destructive/80">
                  <AlertTriangle className="h-3.5 w-3.5" /> Ações irreversíveis
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExitState((prev) => ({ ...prev, allShelters: true, typeConfirm: '' }))}
                  className="h-[44px] w-full gap-2 border-destructive/30 bg-card text-[13px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={withdrawConsent.isPending}
                >
                  <LogOut className="w-[17px] h-[17px]" />
                  Sair de todos os abrigos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExitState((prev) => ({ ...prev, allVolunteering: true, typeConfirm: '' }))}
                  className="h-[44px] w-full gap-2 border-destructive/30 bg-card text-[13px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={withdrawConsent.isPending}
                >
                  <ShieldAlert className="w-[17px] h-[17px]" />
                  Encerrar voluntariado completamente
                </Button>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  &ldquo;Sair de todos&rdquo; remove você das rostagens mas mantém seu perfil global. &ldquo;Encerrar voluntariado&rdquo; revoga também o consentimento do termo (LGPD Art. 18, IX). Para reativar, será necessário aceitar o termo novamente.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TASK-242: Diálogo de saída por abrigo (com feedback opcional). */}
      <LeaveOneShelterDialog
        state={exitState}
        setState={setExitState}
        onClose={closeLeaveDialog}
      />

      {/* TASK-242: Diálogos de revogação em massa (Lei 14.063/2020 — 2-step
          via type-confirm). Usa Dialog plain para permitir campo de input. */}
      <Dialog
        open={exitState.allShelters}
        onOpenChange={(open) => !open && setExitState((prev) => ({ ...prev, allShelters: false, typeConfirm: '' }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Sair de todos os abrigos
            </DialogTitle>
            <DialogDescription asChild>
              <div className="gap-y-section-sm text-[13px]">
                <p>Você deixará de fazer parte de <strong>todas as rostagens</strong> onde é voluntário.</p>
                <p>Seu perfil global e o histórico de participações serão preservados. Para voltar, peça para um abrigo te convidar novamente.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="gap-y-section-xs">
            <Label htmlFor="confirm-sair" className="text-[12px]">Por segurança, digite <span className="font-bold text-destructive">SAIR</span> abaixo</Label>
            <Input
              id="confirm-sair"
              value={exitState.typeConfirm}
              onChange={(e) => setExitState((prev) => ({ ...prev, typeConfirm: e.target.value }))}
              placeholder="SAIR"
              autoComplete="off"
              disabled={withdrawConsent.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitState((prev) => ({ ...prev, allShelters: false, typeConfirm: '' }))} disabled={withdrawConsent.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={withdrawConsent.isPending || exitState.typeConfirm.trim().toUpperCase() !== 'SAIR'}
              onClick={async () => {
                try {
                  const res = await withdrawConsent.mutateAsync({
                    input: { scope: 'roster' },
                    actor: { uid: user.uid, email: user.email, displayName: user.displayName },
                  });
                  toast.success(`Você saiu de ${res.rostersUpdated} abrigo(s).`);
                  setExitState((prev) => ({ ...prev, allShelters: false, typeConfirm: '' }));
                } catch (err) {
                  toast.error('Não foi possível sair de todos os abrigos. Tente novamente.');
                }
              }}
            >
              {withdrawConsent.isPending ? 'Aguarde…' : 'Confirmar saída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={exitState.allVolunteering}
        onOpenChange={(open) => !open && setExitState((prev) => ({ ...prev, allVolunteering: false, typeConfirm: '' }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Encerrar voluntariado completamente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="gap-y-section-sm text-[13px]">
                <p>Esta ação <strong>revoga seu consentimento</strong> de voluntariado (LGPD Art. 18, IX) e remove você de todas as rostagens.</p>
                <p>O registro do aceite do termo permanece como prova legal (Lei 14.063/2020) por prazo indeterminado. Seu perfil global será marcado como inativo.</p>
                <p>Para voltar a ser voluntário, será necessário aceitar o termo novamente do zero.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="gap-y-section-xs">
            <Label htmlFor="confirm-encerrar" className="text-[12px]">Por segurança, digite <span className="font-bold text-destructive">ENCERRAR</span> abaixo</Label>
            <Input
              id="confirm-encerrar"
              value={exitState.typeConfirm}
              onChange={(e) => setExitState((prev) => ({ ...prev, typeConfirm: e.target.value }))}
              placeholder="ENCERRAR"
              autoComplete="off"
              disabled={withdrawConsent.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitState((prev) => ({ ...prev, allVolunteering: false, typeConfirm: '' }))} disabled={withdrawConsent.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={withdrawConsent.isPending || exitState.typeConfirm.trim().toUpperCase() !== 'ENCERRAR'}
              onClick={async () => {
                try {
                  await withdrawConsent.mutateAsync({
                    input: { scope: 'all' },
                    actor: { uid: user.uid, email: user.email, displayName: user.displayName },
                  });
                  toast.success('Voluntariado encerrado. Sentiremos sua falta!');
                  setExitState((prev) => ({ ...prev, allVolunteering: false, typeConfirm: '' }));
                } catch (err) {
                  toast.error('Não foi possível encerrar o voluntariado. Tente novamente.');
                }
              }}
            >
              {withdrawConsent.isPending ? 'Aguarde…' : 'Encerrar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TASK-189: MFA (TOTP) para admins — UI em /perfil */}
      <MfaSection />

      {/* Privacidade e dados (LGPD) */}
      <section id="privacidade" className="arena-section-card rounded-[24px] p-6">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Privacidade e dados</h3>
          <p className="arena-section-card-description">
            Em conformidade com a LGPD, baixe uma cópia dos seus dados ou exclua sua conta quando quiser.
          </p>
        </div>
        <div className="arena-section-card-body flex flex-col gap-2.5 p-0 pt-4">
          <Button variant="outline" onClick={handleExportData} disabled={exporting} className="h-[46px] w-full gap-2 text-[13.5px] font-bold">
            <Download className="w-[18px] h-[18px]" />
            {exporting ? 'Preparando arquivo...' : 'Baixar meus dados'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <ShieldAlert className="w-[18px] h-[18px]" />
            Excluir minha conta
          </Button>
        </div>
      </section>

      {/* TASK-295: confirmação dupla (email + senha) via reauth.
          O PasswordConfirmDialog recebe a senha e chama reauthenticateWithCredential
          antes de deleteMyAccount. Garante que o user realmente é o dono. */}
      <PasswordConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir sua conta"
        description="Por segurança, confirme sua senha. Seu perfil será anonimizado e sua conta de acesso removida. Pets, posts e mensagens já publicados permanecem para não quebrar o histórico de outros usuários. Esta ação não pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
        email={user?.email}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASK-189 — MFA (TOTP) Section
// ═══════════════════════════════════════════════════════════════════════

const MFA_STEPS = {
  IDLE: 'idle',       // nenhuma ação pendente
  ENROLLING: 'enrolling', // tem secret+recovery mas MFA.enabled=false
  CONFIRMING: 'confirming', // quer confirmar (mesmo estado, UX diferencia)
  DISABLING: 'disabling',   // quer desativar
  REGEN_STEP: 'regen_step', // quer regenerar — precisa TOTP primeiro
  REGEN_DONE: 'regen_done', // acabou de regenerar — mostra novos códigos
};

/**
 * Seção de MFA (autenticação em dois fatores) em /perfil.
 *
 * Fluxos:
 *  ativar → [startMfaEnrollment] → mostra QR + recovery → confirma com TOTP → [confirmMfaEnrollment]
 *  desativar → [disableMfa] (TOTP ou recovery)
 *  regenerar códigos → verifica TOTP → [regenerateRecoveryCodes] → mostra novos
 */
function MfaSection() {
  const { user } = useAuth();
  const [step, setStep] = useState(MFA_STEPS.IDLE);
  const [enrollmentData, setEnrollmentData] = useState(null); // { secret, otpauth_uri, recoveryCodes }
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [newRecoveryCodes, setNewRecoveryCodes] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: mfaStatus, refetch } = useQuery({
    queryKey: ['mfa-status', user?.uid],
    queryFn: () => getMfaStatus(user.uid),
    enabled: Boolean(user?.uid),
    staleTime: 1000 * 30,
  });

  const isEnabled = mfaStatus?.enabled;
  const isEnrolled = mfaStatus?.enrolled;

  // Reset dialog state on close
  const closeDialog = useCallback(() => {
    setStep(MFA_STEPS.IDLE);
    setEnrollmentData(null);
    setConfirmCode('');
    setDisableCode('');
    setRegenCode('');
    setNewRecoveryCodes(null);
  }, []);

  // ── Ativar MFA ──────────────────────────────────────────────────────────────
  async function handleStartEnrollment() {
    setLoading(true);
    try {
      const data = await startMfaEnrollment(user.uid, user.email || user.uid, {
        uid: user.uid,
        email: user.email,
      });
      setEnrollmentData(data);
      setStep(MFA_STEPS.ENROLLING);
    } catch (err) {
      toast.error('Erro ao iniciar MFA: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmEnrollment() {
    if (!confirmCode.trim() || !/^\d{6}$/.test(confirmCode.trim())) {
      toast.error('Digite um código de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const ok = await confirmMfaEnrollment(user.uid, confirmCode.trim(), {
        uid: user.uid,
        email: user.email,
      });
      if (ok) {
        toast.success('Autenticação em dois fatores ativada!');
        await refetch();
        closeDialog();
      } else {
        toast.error('Código inválido. Verifique o código do seu app autenticador.');
      }
    } catch (err) {
      toast.error('Erro ao confirmar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Desativar MFA ─────────────────────────────────────────────────────────
  async function handleDisableMfa() {
    if (!disableCode.trim()) {
      toast.error('Digite um código TOTP ou de recuperação.');
      return;
    }
    setLoading(true);
    try {
      const ok = await disableMfa(user.uid, disableCode.trim(), {
        uid: user.uid,
        email: user.email,
      });
      if (ok) {
        toast.success('MFA desativado.');
        await refetch();
        closeDialog();
      } else {
        toast.error('Código inválido. Tente novamente.');
      }
    } catch (err) {
      toast.error('Erro ao desativar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Regenerar códigos ─────────────────────────────────────────────────────
  async function handleRegenerateStep() {
    if (!regenCode.trim() || !/^\d{6}$/.test(regenCode.trim())) {
      toast.error('Digite um código TOTP de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const codes = await regenerateRecoveryCodes(user.uid, regenCode.trim(), {
        uid: user.uid,
        email: user.email,
      });
      setNewRecoveryCodes(codes);
      setStep(MFA_STEPS.REGEN_DONE);
      toast.success('Novos códigos gerados!');
    } catch (err) {
      toast.error('Código inválido: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const dialogOpen = step !== MFA_STEPS.IDLE;

  return (
    <>
      <Card className="rounded-[24px] p-6">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Shield className="w-[19px] h-[19px] text-primary" /> Segurança — Autenticação em dois fatores
          </CardTitle>
          <CardDescription className="text-[12.5px] leading-[1.6]">
            Proteja sua conta com autenticação em dois fatores (TOTP via app como Google Authenticator ou Authy).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isEnabled ? 'bg-emerald-100' : 'bg-muted'}`}>
                {isEnabled
                  ? <Key className="h-4 w-4 text-emerald-600" />
                  : <Smartphone className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-foreground">TOTP (App autenticador)</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {isEnabled
                    ? `Ativado${mfaStatus?.recoveryCodesRemaining != null ? ` · ${mfaStatus.recoveryCodesRemaining} códigos restantes` : ''}`
                    : isEnrolled
                    ? 'Em setup — confirme o código para ativar'
                    : 'Não configurado'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isEnabled ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Ativo
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Inativo
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2.5">
            {!isEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleStartEnrollment}
                disabled={loading}
                className="h-[44px] flex-1 gap-2 text-[13.5px] font-bold"
              >
                <Shield className="w-[17px] h-[17px]" />
                {loading ? 'Aguarde…' : isEnrolled ? 'Concluir ativação' : 'Ativar MFA'}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(MFA_STEPS.DISABLING); setDisableCode(''); }}
                  className="h-[44px] flex-1 gap-2 border-destructive/30 text-[13.5px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Desativar MFA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(MFA_STEPS.REGEN_STEP); setRegenCode(''); }}
                  className="h-[44px] flex-1 gap-2 text-[13.5px] font-bold"
                >
                  <RefreshCw className="w-[17px] h-[17px]" />
                  Regenerar códigos
                </Button>
              </>
            )}
          </div>

          {!isEnabled && (
            <p className="text-[11.5px] text-muted-foreground">
              A ativação é opcional mas recomendada para administradores.
              Você receberá 8 códigos de recuperação — guarde-os em local seguro.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog principal de MFA */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === MFA_STEPS.ENROLLING && <><Shield className="w-5 h-5 text-primary" /> Configurar autenticação em dois fatores</>}
              {step === MFA_STEPS.DISABLING && <><ShieldAlert className="w-5 h-5 text-destructive" /> Desativar MFA</>}
              {step === MFA_STEPS.REGEN_STEP && <><RefreshCw className="w-5 h-5 text-primary" /> Regenerar códigos de recuperação</>}
              {step === MFA_STEPS.REGEN_DONE && <><Key className="w-5 h-5 text-emerald-600" /> Novos códigos de recuperação</>}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-[12.5px] leading-[1.6]">
                {step === MFA_STEPS.ENROLLING && (
                  <>
                    <p>Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, 1Password…).</p>
                    <p className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-700 font-medium">
                      ⚠️ Anote ou copie os códigos de recuperação abaixo antes de confirmar.
                      Eles não aparecem novamente.
                    </p>
                  </>
                )}
                {step === MFA_STEPS.DISABLING && (
                  <p>Digite um código do seu app autenticador ou um código de recuperação para confirmar a desativação.</p>
                )}
                {step === MFA_STEPS.REGEN_STEP && (
                  <p>Digite um código do seu app autenticador para gerar novos códigos de recuperação. Os anteriores serão invalidados.</p>
                )}
                {step === MFA_STEPS.REGEN_DONE && (
                  <p className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-emerald-700 font-medium">
                    Novos códigos gerados! Guarde-os em local seguro. Os anteriores foram invalidados.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Enrollment: QR code + recovery codes + code input */}
          {(step === MFA_STEPS.ENROLLING || step === MFA_STEPS.CONFIRMING) && enrollmentData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <QrCode value={enrollmentData.otpauth_uri} size={180} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Escaneie com Google Authenticator ou Authy</p>
                <p className="text-[10.5px] font-mono break-all rounded bg-muted px-2 py-1 text-muted-foreground">
                  {enrollmentData.secret}
                </p>
              </div>

              {/* Recovery codes */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-amber-700">Códigos de recuperação (guarde agora!)</Label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  {enrollmentData.recoveryCodes.map((code, i) => (
                    <span key={i} className="font-mono text-[12px] font-bold text-amber-800">
                      {code}
                    </span>
                  ))}
                </div>
                <p className="text-[10.5px] text-muted-foreground">Use um código de recuperação se perder o celular.</p>
              </div>

              {/* Code input */}
              <div className="space-y-1.5">
                <Label htmlFor="mfa-enroll-code" className="text-[12px]">
                  Código do app (6 dígitos)
                </Label>
                <Input
                  id="mfa-enroll-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="text-center text-xl tracking-[0.3em] font-mono h-12"
                  disabled={loading}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={loading}>Cancelar</Button>
                <Button onClick={handleConfirmEnrollment} disabled={loading || confirmCode.length !== 6}>
                  {loading ? 'Verificando…' : 'Confirmar e ativar'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Disable MFA */}
          {step === MFA_STEPS.DISABLING && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mfa-disable-code" className="text-[12px]">
                  Código TOTP ou de recuperação
                </Label>
                <Input
                  id="mfa-disable-code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.trim())}
                  placeholder="Código de 6 dígitos ou xxxx-xxxx"
                  autoComplete="off"
                  className="h-12 font-mono"
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={loading}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDisableMfa} disabled={loading || !disableCode}>
                  {loading ? 'Desativando…' : 'Desativar MFA'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Regenerate: step 1 — verify TOTP */}
          {step === MFA_STEPS.REGEN_STEP && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mfa-regen-code" className="text-[12px]">Código do app (6 dígitos)</Label>
                <Input
                  id="mfa-regen-code"
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="text-center text-xl tracking-[0.3em] font-mono h-12"
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={loading}>Cancelar</Button>
                <Button onClick={handleRegenerateStep} disabled={loading || regenCode.length !== 6}>
                  {loading ? 'Gerando…' : 'Gerar novos códigos'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Regenerate: step 2 — show new codes */}
          {step === MFA_STEPS.REGEN_DONE && newRecoveryCodes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                {newRecoveryCodes.map((code, i) => (
                  <span key={i} className="font-mono text-[12px] font-bold text-emerald-800">
                    {code}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Guarde estes códigos em local seguro. Os anteriores foram invalidados.
              </p>
              <DialogFooter>
                <Button onClick={closeDialog} className="w-full">Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASK-242 — Offboarding UI (LGPD Art. 18 IX)
// ═══════════════════════════════════════════════════════════════════════

const STATUS_LABEL = {
  active: 'Ativo',
  paused: 'Pausado',
  blocked: 'Bloqueado',
  left: 'Saiu',
};

const STATUS_BADGE_CLASS = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  paused: 'border-amber-200 bg-amber-50 text-amber-700',
  blocked: 'border-rose-200 bg-rose-50 text-rose-700',
  left: 'border-slate-200 bg-slate-50 text-slate-600',
};

/**
 * Linha de uma rostagem (per-shelter) na seção "Minhas voluntariadas".
 * Mostra o nome do abrigo (resolvido lazy), o status e um botão
 * "Sair deste abrigo" que abre o diálogo de feedback.
 */
function VolunteerRosterRow({ roster, onLeave }) {
  const { data: clubName } = useClubName(roster.shelter_club_id);
  const status = roster.status || 'active';
  const isLeft = status === 'left';
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-bold text-foreground">
            {clubName || 'Abrigo'}
          </p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.active}`}>
            {STATUS_LABEL[status] || status}
          </span>
        </div>
        {roster.volunteer_name && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            Você entrou como {roster.volunteer_name}
            {roster.joined_at ? ` em ${new Date(roster.joined_at).toLocaleDateString('pt-BR')}` : ''}
          </p>
        )}
        {isLeft && roster.exit_reason && (
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Motivo registrado: {VOLUNTEER_EXIT_REASON_LABELS[roster.exit_reason] || roster.exit_reason}
          </p>
        )}
      </div>
      {!isLeft && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onLeave(roster)}
          className="h-9 gap-1.5 border-destructive/30 bg-destructive/[0.04] text-[12.5px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair deste abrigo
        </Button>
      )}
    </li>
  );
}

/**
 * Diálogo de saída de UM abrigo específico, com feedback opcional
 * (motivo canônico + nota livre). Persiste via `useLeaveShelter`.
 */
function LeaveOneShelterDialog({ state, setState, onClose }) {
  const { user } = useAuth();
  const open = Boolean(state.roster);
  const leave = useLeaveShelter(state.roster?.shelterClubId);

  const reason = state.reason || 'time';
  const note = state.note || '';

  const submit = useCallback(async () => {
    if (!state.roster || !user?.uid) return;
    try {
      await leave.mutateAsync({
        volunteerUid: user.uid,
        actor: { uid: user.uid, email: user.email, displayName: user.displayName },
        exit_reason: reason,
        exit_note: note.trim() || undefined,
      });
      toast.success(`Você saiu do abrigo ${state.roster.volunteerName}.`);
      onClose();
    } catch (err) {
      toast.error('Não foi possível sair do abrigo. Tente novamente.');
    }
  }, [state.roster, user, leave, reason, note, onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-destructive" /> Sair deste abrigo
          </DialogTitle>
          <DialogDescription asChild>
            <div className="gap-y-section-sm text-[13px]">
              <p>Você deixará a rostagem de <strong>{state.roster?.volunteerName || 'este abrigo'}</strong>.</p>
              <p>Seu perfil global de voluntário será mantido e o histórico de participações preservado. Para voltar, peça para o abrigo te convidar novamente.</p>
              <p className="text-[11.5px] text-muted-foreground">O motivo é opcional e nos ajuda a melhorar o programa (LGPD Art. 18, IX).</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="gap-y-section-md">
          <div className="gap-y-section-xs">
            <Label className="text-[12px]">Motivo</Label>
            <div className="grid gap-1.5">
              {VOLUNTEER_EXIT_REASONS.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-[13px] transition-colors ${
                    reason === value
                      ? 'border-primary bg-primary/[0.08] font-bold text-foreground'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="volunteer-exit-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setState((prev) => ({ ...prev, reason: value }))}
                    className="h-3.5 w-3.5 accent-[hsl(14,55%,26%)]"
                  />
                  {VOLUNTEER_EXIT_REASON_LABELS[value]}
                </label>
              ))}
            </div>
          </div>
          <div className="gap-y-section-xs">
            <Label htmlFor="exit-note" className="text-[12px]">Observação (opcional, até 500 caracteres)</Label>
            <Textarea
              id="exit-note"
              value={note}
              onChange={(e) => setState((prev) => ({ ...prev, note: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="Compartilhe algo que possa ajudar (opcional)..."
            />
            <p className="text-right text-[10.5px] text-muted-foreground">{note.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={leave.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={leave.isPending}>
            {leave.isPending ? 'Aguarde…' : 'Sair do abrigo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
