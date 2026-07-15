/**
 * @fileoverview VolunteerSignup — página pública /voluntarios/seja
 * (TASK-235 / Regra A §A.3).
 *
 * Fluxo de inscrição de voluntários em 4 passos:
 *   1. Ler e aceitar o termo (clickwrap)
 *   2. Preencher perfil de voluntário (habilidades, disponibilidade…)
 *   3. Escolher um abrigo
 *   4. Confirmar + submit (com captcha) → useJoinShelterAsVolunteer
 *
 * Auth obrigatória (anônimo é redirecionado para /login com `from`).
 * Gateada pela flag `shelter_volunteer_profile_v1` (default OFF) —
 * quando OFF, mostra "Feature em breve" e nenhum documento é criado.
 *
 * Sucesso → redireciona para /perfil#voluntariadas.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HeartHandshake, ScrollText, ClipboardList, Building2, CheckCircle2,
  ChevronRight, ChevronLeft, ShieldCheck, AlertCircle, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  VOLUNTEER_TERMS_VERSION,
} from '@/modules/shelter/domain/legal/volunteerTerms';
import { VOLUNTEER_TERMS_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/volunteerTerms.v2';
import { useClubs } from '@/modules/organizations/hooks/useClubs';
import {
  useVolunteerProfile,
  useAcceptVolunteerTerms,
  useJoinShelterAsVolunteer,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { VolunteerProfileForm } from '@/modules/shelter/components/VolunteerProfileForm';
import VolunteerSignupCaptcha from '@/modules/shelter/components/VolunteerSignupCaptcha';
import { useFCMRequest } from '@/modules/notifications/hooks/useFCMRequest';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { cn } from '@/core/lib/utils';

const STEPS = [
  { id: 'terms', label: 'Termo', icon: ScrollText },
  { id: 'profile', label: 'Perfil', icon: ClipboardList },
  { id: 'shelter', label: 'Abrigo', icon: Building2 },
  { id: 'confirm', label: 'Confirmar', icon: CheckCircle2 },
];

function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol
      aria-label="Progresso da inscrição"
      className="flex flex-wrap items-center gap-2 text-xs sm:text-sm"
    >
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < idx;
        const active = i === idx;
        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
              active && 'border-primary bg-primary/10 text-primary',
              done && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              !active && !done && 'border-border bg-muted/40 text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SoonMessage() {
  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          Inscrição de voluntários em breve
        </CardTitle>
        <CardDescription className="text-amber-800">
          A plataforma de inscrição pública de voluntários está em rollout gradual. Se você
          faz parte de um abrigo parceiro, peça ao seu administrador que habilite a
          feature flag <code>shelter_volunteer_profile_v1</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/voluntarios">Voltar ao programa</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/voluntarios/termo">Ler o termo</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function NotAuthed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Você precisa estar logado(a)
        </CardTitle>
        <CardDescription>
          Para se inscrever como voluntário, entre com sua conta Google. Leva menos de 1 minuto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/login" state={{ from: { pathname: '/voluntarios/seja' } }}>
            Entrar para continuar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ShelterPicker({ clubs, isLoading, value, onChange }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) => String(c.name || '').toLowerCase().includes(q));
  }, [clubs, query]);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum abrigo parceiro disponível no momento. Tente novamente em alguns dias.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="shelter-search" className="text-sm">Buscar abrigo</Label>
        <Input
          id="shelter-search"
          type="search"
          placeholder="Nome do abrigo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul role="radiogroup" aria-label="Abrigos disponíveis" className="space-y-2">
        {filtered.map((club) => {
          const checked = value === club.id;
          return (
            <li key={club.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40',
                  checked ? 'border-primary bg-primary/5' : 'border-border bg-white/65',
                )}
              >
                <input
                  type="radio"
                  name="shelter"
                  value={club.id}
                  checked={checked}
                  onChange={() => onChange(club.id)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {club.name || 'Abrigo sem nome'}
                  </p>
                  {club.city || club.state ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {[club.city, club.state].filter(Boolean).join(' / ')}
                    </p>
                  ) : null}
                </div>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhum abrigo encontrado para “{query}”.
          </li>
        )}
      </ul>
    </div>
  );
}

export default function VolunteerSignup() {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated, isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-3xl px-5 py-6 pb-12 space-y-6');

  const flagEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);

  const [step, setStep] = useState('terms');
  const [signatureText, setSignatureText] = useState('');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // TASK-205: ?abrigo=<clubId> pré-seleciona o abrigo (CTA vindo da
  // página pública do abrigo). Validado contra a lista de clubs abaixo.
  const [searchParams] = useSearchParams();
  const preselectedShelter = searchParams.get('abrigo');
  const [selectedShelter, setSelectedShelter] = useState(preselectedShelter || null);
  const [captchaToken, setCaptchaToken] = useState(null);

  const { data: profile, isLoading: isProfileLoading } = useVolunteerProfile(
    flagEnabled && user?.uid ? user.uid : null,
  );
  const { data: clubs = [], isLoading: isClubsLoading } = useClubs();

  const acceptTermsMutation = useAcceptVolunteerTerms(user?.uid);
  const joinMutation = useJoinShelterAsVolunteer();

  // TASK-292: FCM push — solicita permissão após ação relevante (signup voluntário)
  const { requestPushIfAppropriate } = useFCMRequest();

  const hasAcceptedTerms = Boolean(profile?.terms_accepted_at)
    && profile?.terms_version === VOLUNTEER_TERMS_VERSION;
  const hasProfile = Boolean(profile?.skills || profile?.availability);

  // Pré-avança o stepper se o estado do servidor já cobre um passo.
  useEffect(() => {
    if (!flagEnabled || isProfileLoading) return;
    if (step === 'terms' && hasAcceptedTerms) setStep('profile');
    if (step === 'profile' && hasProfile) setStep('shelter');
  }, [flagEnabled, isProfileLoading, hasAcceptedTerms, hasProfile, step]);

  if (!flagEnabled) {
    return (
      <div className={wrapperClass}>
        <SoonMessage />
      </div>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className={wrapperClass}>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={wrapperClass}>
        <NotAuthed />
      </div>
    );
  }

  const goTo = (next) => setStep(next);

  const handleAcceptTerms = async () => {
    if (!signatureText || signatureText.trim().length < 2) {
      toast({ title: 'Digite seu nome completo para assinar.', variant: 'destructive' });
      return;
    }
    if (!scrolledToEnd) {
      toast({
        title: 'Role até o fim do termo antes de aceitar.',
        description: 'Conforme a Lei 14.063/2020, a leitura integral é obrigatória.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await acceptTermsMutation.mutateAsync({
        acceptance: {
          terms_version: VOLUNTEER_TERMS_VERSION,
          signature_text: signatureText.trim(),
        },
        actor: { uid: user.uid, email: user.email },
      });
      toast({ title: '✓ Termo aceito.' });
      setStep('profile');
    } catch (err) {
      toast({ title: 'Erro ao aceitar termo', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleProfileSaved = () => {
    toast({ title: '✓ Perfil salvo.' });
    setStep('shelter');
  };

  const handleSubmitJoin = async () => {
    if (!selectedShelter) {
      toast({ title: 'Selecione um abrigo.', variant: 'destructive' });
      return;
    }
    if (!captchaToken && import.meta.env.VITE_HCAPTCHA_SITE_KEY) {
      toast({ title: 'Conclua a verificação de segurança.', variant: 'destructive' });
      return;
    }
    const club = clubs.find((c) => c.id === selectedShelter);
    try {
      await joinMutation.mutateAsync({
        input: {
          shelter_club_id: selectedShelter,
          volunteer_uid: user.uid,
          volunteer_name: (userProfile?.full_name || user.displayName || user.email || '').trim(),
          volunteer_email: user.email || undefined,
          volunteer_phone: userProfile?.phone || undefined,
          volunteer_photo_url: userProfile?.photo_url || user.photoURL || undefined,
          terms_version: VOLUNTEER_TERMS_VERSION,
          signature_text: signatureText.trim(),
        },
        actor: { uid: user.uid, email: user.email },
      });
      // TASK-292: após ação relevante (signup voluntário), solicita push permission
      // se ainda não foi pedido nesta sessão.
      requestPushIfAppropriate(user.uid);
      toast({ title: '✓ Inscrição confirmada!', description: `Você agora faz parte do ${club?.name || 'abrigo'}.` });
      navigate('/perfil#voluntariadas', { replace: true });
    } catch (err) {
      toast({ title: 'Erro na inscrição', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className={wrapperClass}>
      <header className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Inscrição de voluntário
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground sm:text-3xl">
          <HeartHandshake className="h-6 w-6 text-primary" aria-hidden="true" />
          Vamos lá
        </h1>
        <p className="text-sm text-muted-foreground">
          Em quatro passos você sai do termo aceito para a rostagem do abrigo.
        </p>
      </header>

      <Stepper current={step} />

      {/* ── Step 1: Termo ── */}
      {step === 'terms' && (
        <Card>
          <CardHeader>
            <CardTitle>1. Leia e aceite o termo de voluntariado</CardTitle>
            <CardDescription>
              Versão {VOLUNTEER_TERMS_VERSION}. Rolagem até o fim é obrigatória.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              tabIndex={0}
              role="document"
              aria-label="Texto integral do termo de voluntariado"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
                  setScrolledToEnd(true);
                }
              }}
              className="max-h-[50vh] overflow-y-auto rounded-md border border-primary/10 bg-white/65 p-3 text-xs leading-6 text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <pre className="whitespace-pre-wrap font-mono">{VOLUNTEER_TERMS_TEXT_V2}</pre>
            </div>
            {!scrolledToEnd && (
              <p className="text-xs text-amber-700">
                Role até o fim do termo para habilitar o aceite.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="signup-signature">Assinatura (digite seu nome completo)</Label>
              <Input
                id="signup-signature"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Maria Silva"
                maxLength={120}
                autoComplete="name"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground/80">
              <Checkbox
                checked={accepted}
                onCheckedChange={setAccepted}
                disabled={!scrolledToEnd}
                aria-describedby="accept-hint"
              />
              <span id="accept-hint">
                Li integralmente o termo de voluntariado e declaro que concordo com todas as suas cláusulas,
                em especial com o tratamento dos meus Dados Pessoais (LGPD).
              </span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/voluntarios">
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Voltar
                </Link>
              </Button>
              <Button
                onClick={handleAcceptTerms}
                disabled={!accepted || !signatureText || acceptTermsMutation.isPending}
              >
                {acceptTermsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    Aceitando…
                  </>
                ) : (
                  <>
                    Aceitar e continuar <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Perfil ── */}
      {step === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>2. Seu perfil de voluntário</CardTitle>
            <CardDescription>
              Habilidades, disponibilidade, raio de atuação e logística. O abrigo usa isso para
              convocá-lo(a) nas atividades certas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VolunteerProfileForm
              uid={user.uid}
              actor={{ uid: user.uid, email: user.email }}
              existing={profile || null}
              onSaved={handleProfileSaved}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('terms')}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Voltar
              </Button>
              <Button size="sm" onClick={() => setStep('shelter')}>
                Continuar para abrigo <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Salve o perfil acima antes de avançar. Use o botão “Continuar” se já estiver
              tudo preenchido.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Abrigo ── */}
      {step === 'shelter' && (
        <Card>
          <CardHeader>
            <CardTitle>3. Escolha um abrigo parceiro</CardTitle>
            <CardDescription>
              Você vai entrar na rostagem deste abrigo. Pode mudar de ideia depois pelo seu perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShelterPicker
              clubs={clubs}
              isLoading={isClubsLoading}
              value={selectedShelter}
              onChange={setSelectedShelter}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('profile')}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => setStep('confirm')}
                disabled={!selectedShelter}
              >
                Continuar <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Confirmar ── */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>4. Confirme sua inscrição</CardTitle>
            <CardDescription>
              Revise os dados e conclua a inscrição na rostagem do abrigo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 gap-2 rounded-md border border-border bg-white/65 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Nome</dt>
                <dd className="text-sm">{userProfile?.full_name || user.displayName || user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">E-mail</dt>
                <dd className="text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Termo aceito</dt>
                <dd className="text-sm">v{VOLUNTEER_TERMS_VERSION}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Abrigo escolhido</dt>
                <dd className="text-sm">
                  {clubs.find((c) => c.id === selectedShelter)?.name || '—'}
                </dd>
              </div>
            </dl>
            <VolunteerSignupCaptcha
              onVerify={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('shelter')}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Voltar
              </Button>
              <Button
                onClick={handleSubmitJoin}
                disabled={
                  joinMutation.isPending
                  || (Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY) && !captchaToken)
                }
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    Confirmando…
                  </>
                ) : (
                  <>
                    Confirmar inscrição <CheckCircle2 className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao confirmar, criamos seu registro na rostagem do abrigo e disparamos um
              e-mail de boas-vindas (Lei 9.608/98 art. 2º-B).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
