import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Home as HomeIcon, Trees, Building2, Tractor, Sofa, Footprints, Wind,
  UsersRound, PawPrint, Bird, Rabbit, Ban, Wallet, MapPin, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

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
  const { updateUserProfile, userProfile } = useAuth();
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
    if (current.type === 'consent') return answers.lgpd_consent === true;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await updateUserProfile({
        ...answers,
        profile_completed: true,
        lgpd_consent_at: new Date().toISOString(),
      });
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
    <div className="arena-page arena-onboarding-glow flex min-h-screen items-center justify-center px-5 py-8">
      <div className="w-full max-w-[480px]">
        <div className="mb-[22px] text-center">
          <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_16px_28px_-14px_hsl(17_72%_30%/0.6)]">
            <StepIcon className="h-6 w-6" />
          </div>
          <h1 className="mt-3.5 mb-1 text-[22px] font-extrabold text-foreground">Vamos montar seu perfil</h1>
          <p className="text-[13px] text-muted-foreground">Passo {step + 1} de {STEPS.length}</p>
          <div className="mt-2.5 flex justify-center gap-[5px]">
            {STEPS.map((st, i) => (
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

          {current.type === 'consent' && (
            <div className="flex flex-col gap-3.5">
              <p className="text-[13px] leading-[1.6] text-muted-foreground">
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
              <div className="flex items-start gap-3 rounded-2xl border-2 border-border p-3.5">
                <Checkbox
                  id="lgpd_consent"
                  checked={answers.lgpd_consent}
                  onCheckedChange={(v) => setField('lgpd_consent', v)}
                  className="mt-0.5"
                />
                <Label htmlFor="lgpd_consent" className="cursor-pointer text-[13px] font-normal leading-[1.55]">
                  Li e concordo com o uso dos meus dados conforme descrito acima, em conformidade
                  com a LGPD.
                </Label>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2.5">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="h-[52px] flex-1 text-[14.5px]">
                Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
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
                {saving ? 'Salvando...' : 'Concluir e ver pets'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
