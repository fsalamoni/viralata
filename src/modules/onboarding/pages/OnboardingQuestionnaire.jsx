import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { createAuditLog } from '@/core/services/auditService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { createAuditLog } from '@/core/services/auditService';
import {
  Home as HomeIcon, Trees, Building2, Tractor, Sofa, Footprints, Wind,
  UsersRound, PawPrint, Bird, Rabbit, Ban, Wallet, MapPin, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { ONBOARDING_QUESTIONNAIRE_VERSION, getNewFieldsForUser } from '../domain/questionnaireVersion';

const STEPS = [
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
  },
  {
    id: 'pets',
    title: 'Você já tem outros animais?',
    description: 'Vamos garantir que o novo pet conviva bem com os atuais.',
    type: 'other_pets',
    icon: PawPrint,
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
  },
  {
    id: 'consent',
    title: 'Privacidade dos seus dados',
    description: 'Última etapa antes de ver os pets disponíveis.',
    type: 'consent',
    icon: Shield,
  },
];

const OTHER_PET_OPTIONS = [
  { value: 'dog', label: 'Cachorro', icon: PawPrint },
  { value: 'cat', label: 'Gato', icon: PawPrint },
  { value: 'bird', label: 'Pássaro', icon: Bird },
  { value: 'other', label: 'Outro animal', icon: Rabbit },
];

export default function OnboardingQuestionnaire() {
  const { user, updateUserProfile, userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    housing_type: '',
    daily_walks: '',
    has_children: false,
    children_ages: '',
    has_elderly: false,
    other_pets: [],
    budget_level: '',
    city: userProfile?.city || '',
    state: userProfile?.state || '',
    // 3 checkboxes de aceite legal (Guia de Implementação Legal v2, §2)
    // — todos obrigatórios, desmarcados por padrão. O botão "Concluir"
    // só habilita quando os 3 estão marcados.
    accepted_terms_of_use: false,
    accepted_privacy_policy: false,
    accepted_code_of_conduct: false,
    // Mantido por compatibilidade (campo legado no doc do perfil).
    lgpd_consent: false,
  });
  const [saving, setSaving] = useState(false);
  const current = STEPS[step];

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
    if (current.type === 'consent') {
      // Os 3 aceites do Guia Legal v2 §2 — todos obrigatórios.
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
      const actor = { uid: user?.uid, displayName: user?.displayName, email: user?.email };

      // Persistimos cada aceite no doc do perfil para servir de prova
      // de aceite (audit trail local). O audit_log canônico também
      // é gravado para atender Lei 14.063/2020 (TASK-085).
      await updateUserProfile({
        ...answers,
        // Mantido por compatibilidade (campo legado).
        lgpd_consent: true,
        lgpd_consent_at: acceptedAt,
        // Guias de Implementação Legal v2 — 3 aceites obrigatórios.
        terms_accepted_at: acceptedAt,
        terms_version: '2026-07-10',
        privacy_policy_accepted_at: acceptedAt,
        privacy_policy_version: '2026-07-10',
        code_of_conduct_accepted_at: acceptedAt,
        code_of_conduct_version: '2026-07-10',
        // Versionamento do questionário (TASK-401 parte 3)
        onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
        onboarding_completed_at: acceptedAt,
      });

      // TASK-194: disparar AUDIT_ACTION_LABELS para os 3 aceites do cadastro.
      // Best-effort: falhas no audit não bloqueiam o onboarding.
      const auditDetails = { terms_version: '2026-07-10', onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION };
      await createAuditLog({ action: 'terms_accepted', actor, details: auditDetails }).catch(() => {});
      await createAuditLog({ action: 'privacy_policy_accepted', actor, details: auditDetails }).catch(() => {});
      await createAuditLog({ action: 'code_of_conduct_accepted', actor, details: auditDetails }).catch(() => {});

      toast.success('Perfil concluído! Bem-vindo ao Viralata 🐾');
      navigate('/feed');
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const StepIcon = current.icon || PawPrint;

  return (
    <div className="arena-page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🐾</div>
          <h1 className="text-2xl font-bold text-foreground">Vamos montar seu perfil</h1>
          <p className="text-muted-foreground text-sm">Passo {step + 1} de {STEPS.length}</p>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="arena-panel rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
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
                      ? 'border-primary bg-primary/10 text-foreground font-medium'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
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
                      ? 'border-primary bg-primary/10 text-foreground font-medium'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
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
                    ? 'border-primary bg-primary/10 text-foreground font-medium'
                    : 'border-border hover:border-primary/40 text-muted-foreground'
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

          {current.type === 'consent' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Usamos os dados deste questionário para sugerir pets compatíveis com a sua
                realidade. Você pode revisar nossa{' '}
                <Link to="/politica-privacidade" target="_blank" className="text-primary underline">
                  Política de Privacidade
                </Link>{' '}
                e nossos{' '}
                <Link to="/termos" target="_blank" className="text-primary underline">
                  Termos de Uso
                </Link>. A qualquer momento você pode baixar ou excluir seus dados na página de
                perfil.
              </p>
              <div className="flex items-start gap-3 rounded-xl border-2 border-border p-4">
                <Checkbox
                  id="lgpd_consent"
                  checked={answers.lgpd_consent}
                  onCheckedChange={(v) => setField('lgpd_consent', v)}
                  className="mt-0.5"
                />
                <Label htmlFor="lgpd_consent" className="cursor-pointer text-sm font-normal">
                  Li e concordo com o uso dos meus dados conforme descrito acima, em conformidade
                  com a LGPD.
                </Label>
              </div>
            </div>
          )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
              Voltar
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex-1"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance() || saving}
              className="flex-1"
            >
              {saving ? 'Salvando...' : 'Concluir e ver pets 🐾'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
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
