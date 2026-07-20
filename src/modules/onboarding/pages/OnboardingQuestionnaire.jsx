/**
 * @fileoverview OnboardingQuestionnaire — Questionário Comportamental
 * (TASK-401 + parte 3 "1ª vez + diff de versão").
 *
 * **Comportamento esperado (2026-07-20 — pedido explícito do user)**:
 *  - **1ª vez do user** (sem `profile_completed`): questionário COMPLETO
 *    (todos os 7 steps: moradia/passeios/família/outros pets/orçamento/
 *    cidade/aceites legais).
 *  - **Próximas vezes** (user já respondeu): só os steps NOVOS
 *    (caso o schema tenha ganhado campos). Pré-preenche valores antigos.
 *  - **User já na versão atual**: NÃO cai aqui (é redirecionado).
 *
 * Os 3 aceites legais (Termos/Privacidade/Código de Conduta) são
 * SEMPRE exigidos — quando o user é novo. Em upgrades, o aceite
 * é feito no fluxo que originou o upgrade (ex: adoção pede aceite
 * da nova versão de termos).
 *
 * @see src/modules/onboarding/domain/questionnaireVersion.js
 * @see src/modules/onboarding/domain/profileCompletion.js
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Home as HomeIcon, Trees, Building2, Tractor, Sofa, Footprints, Wind,
  UsersRound, PawPrint, Bird, Rabbit, Ban, Wallet, MapPin, Shield,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ONBOARDING_QUESTIONNAIRE_VERSION,
  QUESTIONNAIRE_FIELDS,
  getNewFieldsForUser,
  getOnboardingState,
} from '../domain/questionnaireVersion';
import { isAdopterProfileComplete } from '../domain/profileCompletion';

// ============================================================================
// STEPS — todos os steps possíveis. Em runtime filtramos pelos novos.
// ============================================================================

const STEPS = [
  {
    id: 'name',
    title: 'Como podemos te chamar?',
    description: 'Esse é o nome que aparecerá para os abrigos e outros usuários.',
    type: 'name',
    icon: PawPrint,
    field: 'full_name',
  },
  {
    id: 'housing',
    title: 'Onde você mora?',
    description: 'Isso nos ajuda a encontrar pets compatíveis com seu espaço.',
    field: 'housing_type',
    type: 'radio',
    icon: HomeIcon,
    options: [
      { value: 'house_with_yard', label: 'Casa com pátio', icon: Trees },
      { value: 'house_no_yard', label: 'Casa sem pátio', icon: HomeIcon },
      { value: 'apartment_screened', label: 'Apartamento com tela de proteção', icon: Building2 },
      { value: 'apartment_unscreened', label: 'Apartamento sem tela', icon: Building2 },
      { value: 'farm', label: 'Sítio / Fazenda', icon: Tractor },
    ],
  },
  {
    id: 'walks',
    title: 'Qual é sua rotina de passeios?',
    description: 'Pets energéticos precisam de exercício diário.',
    field: 'daily_walks',
    type: 'radio',
    icon: Footprints,
    options: [
      { value: 'none', label: 'Não costumo passear', icon: Sofa },
      { value: 'short', label: 'Passeios curtos (menos de 30 min)', icon: Footprints },
      { value: 'long', label: 'Passeios longos (mais de 30 min)', icon: Wind },
    ],
  },
  {
    id: 'family',
    title: 'Quem mora com você?',
    description: 'Alguns pets se adaptam melhor a diferentes composições familiares.',
    type: 'family',
    icon: UsersRound,
    fields: ['has_children', 'children_ages', 'has_elderly'],
  },
  {
    id: 'pets',
    title: 'Você já tem outros animais?',
    description: 'Vamos garantir que o novo pet conviva bem com os atuais.',
    type: 'other_pets',
    icon: PawPrint,
    field: 'other_pets',
  },
  {
    id: 'budget',
    title: 'Qual é seu orçamento para cuidados?',
    description: 'Inclui ração, veterinário e outros cuidados mensais.',
    field: 'budget_level',
    type: 'radio',
    icon: Wallet,
    options: [
      { value: 'basic', label: 'Básico — até R$200/mês', icon: Wallet },
      { value: 'moderate', label: 'Moderado — R$200 a R$500/mês', icon: Wallet },
      { value: 'high', label: 'Alto — acima de R$500/mês', icon: Wallet },
    ],
  },
  {
    id: 'location',
    title: 'Qual é a sua cidade?',
    description: 'Para mostrar pets próximos a você.',
    type: 'location',
    icon: MapPin,
    fields: ['city', 'state'],
  },
  {
    id: 'consent',
    title: 'Privacidade dos seus dados',
    description: 'Última etapa antes de ver os pets disponíveis.',
    type: 'consent',
    icon: Shield,
    // Step de aceite SEMPRE presente (LGPD Art. 8) — exceto quando
    // o user JÁ aceitou termos na versão atual (cache local).
    requiresFullConsent: true,
  },
];

const OTHER_PET_OPTIONS = [
  { value: 'dog', label: 'Cachorro', icon: PawPrint },
  { value: 'cat', label: 'Gato', icon: PawPrint },
  { value: 'bird', label: 'Pássaro', icon: Bird },
  { value: 'other', label: 'Outro animal', icon: Rabbit },
];

/**
 * Helper: dado o userProfile e o estado do onboarding, retorna
 * a lista de steps a serem mostrados.
 *
 * - User novo: TODOS os steps
 * - User com upgrade: só steps com fields novos + consent
 * - User na versão atual: [] (vai redirecionar)
 */
function pickStepsToShow(userProfile) {
  const state = getOnboardingState(userProfile);
  if (!state.needsOnboarding) return { steps: [], isNew: false, state };
  if (state.isNew) {
    return { steps: STEPS, isNew: true, state };
  }
  // Upgrade: filtra steps por field novo
  const newFieldSet = new Set(state.newFields);
  const filtered = STEPS.filter((s) => {
    if (s.type === 'radio') return newFieldSet.has(s.field);
    if (s.type === 'family') return s.fields.some((f) => newFieldSet.has(f));
    if (s.type === 'other_pets') return newFieldSet.has(s.field);
    if (s.type === 'location') return s.fields.some((f) => newFieldSet.has(f));
    if (s.type === 'name') return newFieldSet.has('full_name');
    if (s.type === 'consent') return s.requiresFullConsent === true;
    return true;
  });
  return { steps: filtered, isNew: false, state };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function OnboardingQuestionnaire() {
  const { updateUserProfile, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Decide quais steps mostrar (1ª vez vs upgrade).
  const { steps: visibleSteps, isNew, state: onboardingState } = useMemo(
    () => pickStepsToShow(userProfile),
    [userProfile],
  );

  // Estado inicial das respostas — PRÉ-PREENCHIDO com dados existentes.
  // Assim, em upgrade, os campos mantidos aparecem já marcados.
  const [answers, setAnswers] = useState(() => ({
    housing_type: userProfile?.housing_type || '',
    daily_walks: userProfile?.daily_walks || '',
    has_children: Boolean(userProfile?.has_children),
    children_ages: userProfile?.children_ages || '',
    has_elderly: Boolean(userProfile?.has_elderly),
    other_pets: Array.isArray(userProfile?.other_pets) ? userProfile.other_pets : [],
    budget_level: userProfile?.budget_level || '',
    city: userProfile?.city || '',
    state: userProfile?.state || '',
    // BUG ALTO (2026-07-20): full_name agora editável no questionário
    // (Google displayName pode vir vazio, então user pode confirmar/corrigir).
    full_name: userProfile?.full_name || '',
    // 3 checkboxes de aceite legal — só marcados se JÁ aceitos antes.
    // User novo: começa desmarcado (obrigatório aceitar).
    accepted_terms_of_use: Boolean(userProfile?.terms_accepted_at),
    accepted_privacy_policy: Boolean(userProfile?.privacy_policy_accepted_at),
    accepted_code_of_conduct: Boolean(userProfile?.code_of_conduct_accepted_at),
    // Mantido por compatibilidade (campo legado).
    lgpd_consent: Boolean(userProfile?.lgpd_consent_at),
  }));

  // Se não tem nada para perguntar, redireciona para /feed.
  useEffect(() => {
    if (visibleSteps.length === 0) {
      // User JÁ está na versão atual — não precisa de questionário
      navigate('/feed', { replace: true });
    }
  }, [visibleSteps, navigate]);

  // Loading state — userProfile ainda carregando
  if (!userProfile) {
    return (
      <div className="arena-page arena-onboarding-glow flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-[480px] text-center">
          <p className="text-sm text-muted-foreground">Carregando seu perfil…</p>
        </div>
      </div>
    );
  }

  if (visibleSteps.length === 0) {
    // Redirect está em curso — mostra nada.
    return null;
  }

  const current = visibleSteps[step];

  function setField(field, value) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function togglePet(pet) {
    setAnswers((prev) => ({
      ...prev,
      other_pets: prev.other_pets.includes(pet)
        ? prev.other_pets.filter((p) => p !== pet)
        : [...prev.other_pets, pet],
    }));
  }

  function canAdvance() {
    if (current.type === 'radio') return Boolean(answers[current.field]);
    if (current.type === 'location') return answers.city.length >= 2 && answers.state.length === 2;
    if (current.type === 'name') return answers.full_name.trim().length >= 2;
    if (current.type === 'consent') {
      // Os 3 aceites — só exigidos se o step de consent está VISÍVEL.
      // Em upgrade, o consent só aparece se required.
      if (current.requiresFullConsent === false) return true;
      return (
        answers.accepted_terms_of_use === true
        && answers.accepted_privacy_policy === true
        && answers.accepted_code_of_conduct === true
      );
    }
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const acceptedAt = new Date().toISOString();
      // Em upgrade, só mandamos os campos NOVOS + LGPD/atualizações.
      // Em 1ª vez, mandamos tudo.
      // Em edit mode, mandamos tudo (user está editando).
      const payload = isEditMode
        ? buildEditPayload()
        : isNew
          ? {
              ...answers,
              // Mantido por compatibilidade (campo legado).
              lgpd_consent: true,
              lgpd_consent_at: acceptedAt,
              // Guias de Implementação Legal v2 — 3 aceites obrigatórios.
              terms_accepted_at: answers.accepted_terms_of_use ? acceptedAt : userProfile?.terms_accepted_at,
              terms_version: answers.accepted_terms_of_use ? '2026-07-10' : userProfile?.terms_version,
              privacy_policy_accepted_at: answers.accepted_privacy_policy ? acceptedAt : userProfile?.privacy_policy_accepted_at,
              privacy_policy_version: answers.accepted_privacy_policy ? '2026-07-10' : userProfile?.privacy_policy_version,
              code_of_conduct_accepted_at: answers.accepted_code_of_conduct ? acceptedAt : userProfile?.code_of_conduct_accepted_at,
              code_of_conduct_version: answers.accepted_code_of_conduct ? '2026-07-10' : userProfile?.code_of_conduct_version,
              // Versionamento do questionário (TASK-401 parte 3)
              onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
              onboarding_completed_at: acceptedAt,
            }
          : {
              // Upgrade: só os campos NOVOS + bump da versão
              ...buildUpgradePayload(current, answers, userProfile, acceptedAt),
            };

      await updateUserProfile(payload);
      toast.success(
        isNew
          ? 'Perfil concluído! Bem-vindo ao Viralata 🐾'
          : 'Atualização salva com sucesso!',
      );
      navigate(isEditMode ? '/perfil' : '/feed');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Onboarding save error', err);
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Em modo edit, mandamos TODOS os campos. updateUserProfile cuida
   * de validar e setar profile_completed se aplicável.
   */
  function buildEditPayload() {
    return {
      ...answers,
      onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
      onboarding_completed_at: new Date().toISOString(),
    };
  }

  const StepIcon = current.icon || PawPrint;
  const isLast = step === visibleSteps.length - 1;

  return (
    <div className="arena-page arena-onboarding-glow flex min-h-screen items-center justify-center px-5 py-8">
      <div className="w-full max-w-[480px]">
        <div className="mb-[22px] text-center">
          <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_16px_28px_-14px_hsl(17_72%_30%/0.6)]">
            <StepIcon className="h-6 w-6" />
          </div>
          <h1 className="mt-3.5 mb-1 text-[22px] font-extrabold text-foreground">
            {isNew ? 'Vamos montar seu perfil' : 'Atualize seu perfil'}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {isNew
              ? `Passo ${step + 1} de ${visibleSteps.length}`
              : `Só ${visibleSteps.length} ${visibleSteps.length === 1 ? 'pergunta' : 'perguntas'} nova${visibleSteps.length === 1 ? '' : 's'} para você`}
          </p>
          <div className="mt-2.5 flex justify-center gap-[5px]">
            {visibleSteps.map((st, i) => (
              <PawPrint
                key={st.id}
                className="h-[15px] w-[15px]"
                style={{ color: i <= step ? 'hsl(17 72% 45%)' : 'hsl(30 20% 85%)' }}
                fill={i <= step ? 'hsl(17 72% 45%)' : 'none'}
              />
            ))}
          </div>
        </div>

        <div className="arena-panel rounded-[24px] px-6 py-[26px]">
          <div className="mb-4.5">
            <h2 className="mb-1 text-[17px] font-bold text-foreground">{current.title}</h2>
            <p className="text-[13px] text-muted-foreground">{current.description}</p>
          </div>

          {current.type === 'radio' && (
            <div className="flex flex-col gap-[9px]">
              {current.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField(current.field, opt.value)}
                  className={`flex w-full items-center gap-3 text-left px-4 py-[14px] rounded-2xl border-2 transition-colors text-[14.5px] ${
                    answers[current.field] === opt.value
                      ? 'border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)] font-bold'
                      : 'border-border bg-card text-foreground/80 font-semibold hover:border-primary/40'
                  }`}
                >
                  <opt.icon className="h-[19px] w-[19px] shrink-0" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.type === 'family' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <Checkbox id="has_children" checked={answers.has_children} onCheckedChange={(v) => setField('has_children', v)} />
                <Label htmlFor="has_children" className="cursor-pointer text-[14.5px]">Tenho crianças em casa</Label>
              </div>
              {answers.has_children && (
                <Input placeholder="Idades das crianças (ex: 3, 7 anos)" value={answers.children_ages} onChange={(e) => setField('children_ages', e.target.value)} className="ml-6" />
              )}
              <div className="flex items-center gap-3">
                <Checkbox id="has_elderly" checked={answers.has_elderly} onCheckedChange={(v) => setField('has_elderly', v)} />
                <Label htmlFor="has_elderly" className="cursor-pointer text-[14.5px]">Tenho idosos em casa</Label>
              </div>
            </div>
          )}

          {current.type === 'other_pets' && (
            <div className="flex flex-col gap-[9px]">
              {OTHER_PET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePet(opt.value)}
                  className={`flex w-full items-center gap-3 text-left px-4 py-[14px] rounded-2xl border-2 transition-colors text-[14.5px] ${
                    answers.other_pets.includes(opt.value)
                      ? 'border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)] font-bold'
                      : 'border-border bg-card text-foreground/80 font-semibold hover:border-primary/40'
                  }`}
                >
                  <opt.icon className="h-[19px] w-[19px] shrink-0" />
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, other_pets: [] }))}
                className={`flex w-full items-center gap-3 text-left px-4 py-[14px] rounded-2xl border-2 transition-colors text-[14.5px] ${
                  answers.other_pets.length === 0
                    ? 'border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)] font-bold'
                    : 'border-border bg-card text-foreground/80 font-semibold hover:border-primary/40'
                }`}
              >
                <Ban className="h-[19px] w-[19px] shrink-0" />
                Não tenho outros animais
              </button>
            </div>
          )}

          {current.type === 'location' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-bold">Cidade</Label>
                <Input id="city" value={answers.city} onChange={(e) => setField('city', e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-bold">Estado</Label>
                <Input id="state" value={answers.state} onChange={(e) => setField('state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
              </div>
            </div>
          )}

          {current.type === 'name' && (
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-bold">Nome completo</Label>
              <Input
                id="full_name"
                value={answers.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="Ex: Maria Silva"
                autoComplete="name"
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">
                Pode ser seu nome real ou como prefere ser chamado(a).
              </p>
            </div>
          )}

          {current.type === 'consent' && (
            <div className="flex flex-col gap-3.5">
              <p className="text-[13px] leading-[1.6] text-muted-foreground">
                Para usar a Viralata, você precisa ler e aceitar os três documentos
                abaixo. Todos eles ficam acessíveis no rodapé da plataforma a qualquer
                momento, e você pode revogar ou exportar seus dados na página de perfil.
              </p>
              <LegalConsentRow
                id="accepted_terms_of_use"
                checked={answers.accepted_terms_of_use}
                onChange={(v) => setField('accepted_terms_of_use', v)}
                label={
                  <>
                    Li e aceito os{' '}
                    <Link to="/legal/termos-de-uso" target="_blank" className="text-primary underline">
                      Termos e Condições Gerais de Uso
                    </Link>{' '}
                    <span className="text-destructive">*</span>
                  </>
                }
              />
              <LegalConsentRow
                id="accepted_privacy_policy"
                checked={answers.accepted_privacy_policy}
                onChange={(v) => setField('accepted_privacy_policy', v)}
                label={
                  <>
                    Li e concordo com a{' '}
                    <Link to="/legal/politica-de-privacidade" target="_blank" className="text-primary underline">
                      Política de Privacidade e Proteção de Dados
                    </Link>{' '}
                    (LGPD) <span className="text-destructive">*</span>
                  </>
                }
              />
              <LegalConsentRow
                id="accepted_code_of_conduct"
                checked={answers.accepted_code_of_conduct}
                onChange={(v) => setField('accepted_code_of_conduct', v)}
                label={
                  <>
                    Li e aceito o{' '}
                    <Link to="/legal/codigo-de-conduta" target="_blank" className="text-primary underline">
                      Código de Conduta e Política de Tolerância Zero
                    </Link>{' '}
                    <span className="text-destructive">*</span>
                  </>
                }
              />
            </div>
          )}

          <div className="mt-6 flex gap-2.5">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="h-[52px] flex-1 text-[14.5px]">
                Voltar
              </Button>
            )}
            {!isLast ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="h-[52px] flex-1 text-[15px]"
              >
                Continuar
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canAdvance() || saving}
                className="h-[52px] flex-1 text-[15px]"
              >
                {saving ? 'Salvando...' : (isNew ? 'Concluir e ver pets' : 'Salvar atualização')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Constrói o payload para upgrade: só os fields NOVOS + bump da versão.
 * Preserva os campos antigos que o user NÃO está respondendo.
 */
function buildUpgradePayload(current, answers, userProfile, acceptedAt) {
  const updates = {
    onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
    onboarding_completed_at: acceptedAt,
  };

  if (current.type === 'radio') {
    updates[current.field] = answers[current.field];
  } else if (current.type === 'family') {
    if ('has_children' in answers) updates.has_children = answers.has_children;
    if ('children_ages' in answers) updates.children_ages = answers.children_ages;
    if ('has_elderly' in answers) updates.has_elderly = answers.has_elderly;
  } else if (current.type === 'other_pets') {
    updates.other_pets = answers.other_pets;
  } else if (current.type === 'location') {
    updates.city = answers.city;
    updates.state = answers.state;
  } else if (current.type === 'consent') {
    if (answers.accepted_terms_of_use) {
      updates.terms_accepted_at = acceptedAt;
      updates.terms_version = '2026-07-10';
    }
    if (answers.accepted_privacy_policy) {
      updates.privacy_policy_accepted_at = acceptedAt;
      updates.privacy_policy_version = '2026-07-10';
    }
    if (answers.accepted_code_of_conduct) {
      updates.code_of_conduct_accepted_at = acceptedAt;
      updates.code_of_conduct_version = '2026-07-10';
    }
  }
  return updates;
}

/**
 * Linha de aceite legal no onboarding — checkbox + label com
 * link para a página /legal/<slug> correspondente. Usada 3x:
 * Termos de Uso, Política de Privacidade, Código de Conduta.
 *
 * Mantida no mesmo arquivo do OnboardingQuestionnaire porque é
 * a única tela que renderiza os 3 aceites simultaneamente — não
 * precisa virar componente público.
 */
function LegalConsentRow({ id, checked, onChange, label }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-border p-3.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
        aria-required="true"
      />
      <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal leading-[1.55]">
        {label}
      </Label>
    </div>
  );
}
