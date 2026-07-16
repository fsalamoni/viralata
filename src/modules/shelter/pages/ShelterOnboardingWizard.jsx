/**
 * @fileoverview ShelterOnboardingWizard — TASK-309.
 *
 * 5-step onboarding wizard shown to new shelter admins after they accept
 * the DPA in CreateClub.jsx. Saves progress to
 * `clubs/{clubId}/onboarding_progress`.
 *
 * Feature-gated by SHELTER_ONBOARDING_WIZARD.
 *
 * Steps:
 *   0 — Logo + Capa
 *   1 — Endereço
 *   2 — Equipe (convidar primeiro admin)
 *   3 — Termos DPA (single acceptance)
 *   4 — Primeiro Pet (quick create or skip)
 *
 * Route: /abrigo/:clubId/onboarding
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  MapPin,
  PawPrint,
  Shield,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { useOnboardingProgress, useSaveOnboardingProgress, useCompleteOnboarding } from '@/modules/shelter/hooks/useShelterOnboarding';
import { useUpdateClub } from '@/modules/organizations/hooks/useClubs';
import SingleAcceptanceDialog from '@/modules/shelter/components/legal/SingleAcceptanceDialog';
import {
  SHELTER_ONBOARDING_TERMS_TEXT,
  SHELTER_ONBOARDING_TERMS_VERSION,
  buildShelterOnboardingAcceptance,
} from '@/modules/shelter/domain/legal/shelterOnboardingTerms';
import Seo from '@/components/Seo';

const STEPS = [
  { label: 'Logo e capa', icon: ImagePlus },
  { label: 'Endereço', icon: MapPin },
  { label: 'Equipe', icon: UserPlus },
  { label: 'Termos', icon: Shield },
  { label: 'Primeiro pet', icon: PawPrint },
];

// ── Step 0: Logo + Capa ───────────────────────────────────────────────────
function StepLogoCapa({ form, setForm }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Logo da organização</Label>
        <ImageUpload
          value={form.logo_url}
          onChange={(url) => setForm((p) => ({ ...p, logo_url: url }))}
          folder="clubs"
          shape="square"
          label="Enviar logo"
          hint="Usado na vitrine pública e no painel do abrigo."
        />
      </div>
      <div className="space-y-2">
        <Label>Foto de capa</Label>
        <ImageUpload
          value={form.cover_url}
          onChange={(url) => setForm((p) => ({ ...p, cover_url: url }))}
          folder="clubs"
          shape="square"
          label="Enviar foto de capa"
          hint="Banner grande usado na página pública do abrigo."
        />
      </div>
    </div>
  );
}

// ── Step 1: Endereço ──────────────────────────────────────────────────────
function StepEndereco({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sow-city">Cidade</Label>
        <Input
          id="sow-city"
          value={form.city}
          onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          placeholder="São Paulo"
          maxLength={60}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sow-state">Estado (UF)</Label>
        <Input
          id="sow-state"
          value={form.state}
          onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
          placeholder="SP"
          maxLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sow-venue">Endereço / local principal</Label>
        <Textarea
          id="sow-venue"
          value={form.home_venue}
          onChange={(e) => setForm((p) => ({ ...p, home_venue: e.target.value }))}
          placeholder="Rua, número, bairro, ponto de referência…"
          rows={3}
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sow-instagram">Instagram</Label>
        <Input
          id="sow-instagram"
          value={form.instagram}
          onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
          placeholder="@suaorganizacao"
          maxLength={60}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sow-phone">Telefone</Label>
          <Input
            id="sow-phone"
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
            placeholder="(11) 99999-9999"
            maxLength={30}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sow-email">E-mail de contato</Label>
          <Input
            id="sow-email"
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
            placeholder="contato@abrigo.org"
            maxLength={120}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Equipe ────────────────────────────────────────────────────────
function StepEquipe({ form, setForm }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convide o primeiro membro da equipe do abrigo. Você pode adicionar mais
        depois no painel de membros.
      </p>
      <div className="space-y-2">
        <Label htmlFor="sow-invite">E-mail do membro</Label>
        <Input
          id="sow-invite"
          type="email"
          value={form.invite_email}
          onChange={(e) => setForm((p) => ({ ...p, invite_email: e.target.value }))}
          placeholder="coordenador@abrigo.org"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          O convite será enviado para este e-mail. Pode deixar em branco para pular.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sow-invite-name">Nome do membro</Label>
        <Input
          id="sow-invite-name"
          value={form.invite_name}
          onChange={(e) => setForm((p) => ({ ...p, invite_name: e.target.value }))}
          placeholder="Nome completo"
          maxLength={80}
        />
      </div>
      <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Dica:</strong> Após criar o abrigo, você
        também pode usar o botão &ldquo;Convidar membro&rdquo; no painel de membros
        para enviar convites a qualquer momento.
      </div>
    </div>
  );
}

// ── Step 4: Primeiro Pet ──────────────────────────────────────────────────
function StepPrimeiroPet({ form, setForm }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cadastre o primeiro pet do abrigo agora ou pule esta etapa para fazer
        isso depois no painel.
      </p>
      <div className="space-y-2">
        <Label htmlFor="sop-name">Nome do pet</Label>
        <Input
          id="sop-name"
          value={form.pet_name}
          onChange={(e) => setForm((p) => ({ ...p, pet_name: e.target.value }))}
          placeholder="Ex.: Pipoca, Thor, Mel"
          maxLength={60}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sop-species">Espécie</Label>
        <select
          id="sop-species"
          value={form.pet_species}
          onChange={(e) => setForm((p) => ({ ...p, pet_species: e.target.value }))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecione</option>
          <option value="dog">Cão</option>
          <option value="cat">Gato</option>
          <option value="other">Outro</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sop-photo">Foto do pet</Label>
        <ImageUpload
          value={form.pet_photo_url}
          onChange={(url) => setForm((p) => ({ ...p, pet_photo_url: url }))}
          folder="pets"
          shape="square"
          label="Enviar foto"
          hint="Uma boa foto aumenta as chances de adoção."
        />
      </div>
      <div className="flex items-start gap-2 rounded-md border border-highlight/40 bg-highlight/[0.14] p-3 text-xs text-[hsl(30,60%,24%)]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />
        <span>
          Pode pular — você cadastrará pets pelo painel a qualquer momento.
        </span>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────
export default function ShelterOnboardingWizard() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-4 py-6 sm:px-6');
  const { user, userProfile } = useAuth();

  const flagEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_ONBOARDING_WIZARD);
  const { data: progress } = useOnboardingProgress(clubId);
  const saveProgress = useSaveOnboardingProgress(clubId);
  const completeOnboarding = useCompleteOnboarding(clubId);
  const updateClub = useUpdateClub(clubId);

  const [step, setStep] = useState(0);
  const [dpaOpen, setDpaOpen] = useState(false);
  const [pendingDpaAccept, setPendingDpaAccept] = useState(null);

  const [form, setForm] = useState({
    logo_url: '',
    cover_url: '',
    city: '',
    state: '',
    home_venue: '',
    instagram: '',
    contact_phone: '',
    contact_email: '',
    pet_name: '',
    pet_species: '',
    pet_photo_url: '',
  });

  // Restore saved progress
  useEffect(() => {
    if (!progress?.data) return;
    setForm((prev) => ({ ...prev, ...progress.data }));
    if (typeof progress.currentStep === 'number') {
      setStep(progress.currentStep);
    }
  }, [progress]);

  // Redirect if feature flag is off
  useEffect(() => {
    if (flagEnabled === false) {
      navigate(`/organizacoes/${clubId}/admin`, { replace: true });
    }
  }, [flagEnabled]);

  const setField = useCallback((key) => (val) => {
    setForm((p) => ({ ...p, [key]: typeof val === 'string' ? val : val.target?.value ?? val }));
  }, []);

  const handleSaveStep = useCallback(async (nextStep) => {
    try {
      await saveProgress.mutateAsync({
        step: nextStep,
        completedSteps: Array.from(new Set([...(progress?.completedSteps ?? []), step])),
        data: form,
      });
      setStep(nextStep);
    } catch (err) {
      toast.error('Erro ao salvar progresso. Tente novamente.');
      console.error(err);
    }
  }, [saveProgress, step, form, progress]);

  // Step validation
  const stepValid = useMemo(() => {
    if (step === 0) return true; // uploads optional
    if (step === 1) return true; // address optional
    if (step === 2) return true; // invite optional
    if (step === 3) return false; // handled by dpa dialog
    if (step === 4) return true; // pet optional
    return false;
  }, [step]);

  const handleDpaAccept = async ({ signature, cpf, role, documentHash, documentVersion, acceptedAt }) => {
    const dpaAcceptance = buildShelterOnboardingAcceptance({
      legal_rep_name: signature,
      legal_rep_cpf: cpf,
      legal_rep_role: role,
    });
    setPendingDpaAccept({ signature, cpf, role, documentHash, documentVersion, acceptedAt, dpaAcceptance });
    setDpaOpen(false);
    await handleSaveStep(4);
  };

  const handleFinish = async () => {
    try {
      // Save progress
      await saveProgress.mutateAsync({
        step: 4,
        completedSteps: [0, 1, 2, 3, 4],
        data: form,
      });

      // Update club with visual fields + onboarding_completed
      const clubUpdates = {
        logo_url: form.logo_url,
        cover_url: form.cover_url,
        city: form.city,
        state: form.state,
        home_venue: form.home_venue,
        instagram: form.instagram,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        onboarding_completed: true,
      };
      await updateClub.mutateAsync(clubUpdates);

      // TODO: Create first pet if provided (step 4 — pet creation is non-blocking)

      toast.success('Onboarding concluído! Bem-vindo ao painel do abrigo.');
      navigate(`/organizacoes/${clubId}/admin`);
    } catch (err) {
      toast.error('Erro ao finalizar onboarding. Tente novamente.');
      console.error(err);
    }
  };

  const isSaving = saveProgress.isPending || updateClub.isPending;

  if (flagEnabled === undefined) return null; // still loading flag

  return (
    <div className={wrapperClass}>
      <Seo title="Configurar abrigo" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurar seu abrigo</h1>
        <p className="text-sm text-muted-foreground">
          Complete os 5 passos para deixar seu abrigo pronto.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < step;
          const isActive = i === step;
          return (
            <div key={s.label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    isDone
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mb-4 h-0.5 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <section className="arena-section-card mb-6 overflow-hidden">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">
            Passo {step + 1} — {STEPS[step].label}
          </h3>
          <p className="arena-section-card-description">
            {step === 0 && 'Adicione a identidade visual do seu abrigo.'}
            {step === 1 && 'Informe o endereço e canais de contato.'}
            {step === 2 && 'Convide um coordenador ou voluntário-chave.'}
            {step === 3 && 'Leia e assine o Termo de Adesão e DPA.'}
            {step === 4 && 'Cadastre o primeiro pet ou pule esta etapa.'}
          </p>
        </div>
        <div className="arena-section-card-body p-4 sm:p-5">
          {step === 0 && <StepLogoCapa form={form} setForm={setForm} />}
          {step === 1 && <StepEndereco form={form} setForm={setForm} />}
          {step === 2 && <StepEquipe form={form} setForm={setForm} />}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique abaixo para ler e assinar o Termo de Adesão e o Data
                Processing Agreement (DPA) da Viralata.
              </p>
              <Button type="button" onClick={() => setDpaOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Ler e assinar Termo de Adesão + DPA
              </Button>
            </div>
          )}
          {step === 4 && <StepPrimeiroPet form={form} setForm={setForm} />}
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (step === 0 ? navigate(`/organizacoes/${clubId}/admin`) : handleSaveStep(step - 1))}
          disabled={saveProgress.isPending}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {step === 0 ? 'Pular' : 'Anterior'}
        </Button>

        {step < 3 && (
          <Button
            type="button"
            disabled={!stepValid || isSaving}
            onClick={() => handleSaveStep(step + 1)}
          >
            {saveProgress.isPending ? 'Salvando…' : 'Próximo'}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {step === 3 && (
          <Button type="button" onClick={() => setDpaOpen(true)}>
            <Shield className="mr-1.5 h-4 w-4" />
            Assinar Termo
          </Button>
        )}

        {step === 4 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={handleFinish}
            >
              {isSaving ? 'Salvando…' : 'Pular pet e finalizar'}
            </Button>
            <Button
              type="button"
              disabled={isSaving || !form.pet_name.trim()}
              onClick={handleFinish}
            >
              {isSaving ? 'Salvando…' : 'Finalizar'}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* DPA Dialog */}
      <SingleAcceptanceDialog
        open={dpaOpen}
        onOpenChange={setDpaOpen}
        title="Termo de Adesão e Data Processing Agreement (DPA)"
        description="Leia e assine o Termo de Adesão e o DPA da Viralata para continuar a configuração do abrigo."
        documentText={SHELTER_ONBOARDING_TERMS_TEXT}
        documentVersion={SHELTER_ONBOARDING_TERMS_VERSION}
        prefillSignature={userProfile?.name || user?.displayName || ''}
        prefillCpf={userProfile?.cpf || ''}
        requireCpf
        requireRole
        prefillRole={userProfile?.role_in_org || 'Representante Legal'}
        roleLabel="Cargo / função do responsável legal:"
        acceptButtonLabel="Aceitar e continuar"
        onAccept={handleDpaAccept}
      />
    </div>
  );
}
