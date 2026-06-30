import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const STEPS = [
  {
    id: 'housing',
    title: 'Onde você mora?',
    description: 'Isso nos ajuda a encontrar pets compatíveis com seu espaço.',
    field: 'housing_type',
    type: 'radio',
    options: [
      { value: 'house_with_yard', label: '🏡 Casa com pátio' },
      { value: 'house_no_yard', label: '🏠 Casa sem pátio' },
      { value: 'apartment_screened', label: '🏢 Apartamento com tela de proteção' },
      { value: 'apartment_unscreened', label: '🏢 Apartamento sem tela' },
      { value: 'farm', label: '🌾 Sítio / Fazenda' },
    ],
  },
  {
    id: 'walks',
    title: 'Qual é sua rotina de passeios?',
    description: 'Pets energéticos precisam de exercício diário.',
    field: 'daily_walks',
    type: 'radio',
    options: [
      { value: 'none', label: '🛋️ Não costumo passear' },
      { value: 'short', label: '🚶 Passeios curtos (menos de 30 min)' },
      { value: 'long', label: '🏃 Passeios longos (mais de 30 min)' },
    ],
  },
  {
    id: 'family',
    title: 'Quem mora com você?',
    description: 'Alguns pets se adaptam melhor a diferentes composições familiares.',
    type: 'family',
  },
  {
    id: 'pets',
    title: 'Você já tem outros animais?',
    description: 'Vamos garantir que o novo pet conviva bem com os atuais.',
    type: 'other_pets',
  },
  {
    id: 'budget',
    title: 'Qual é seu orçamento para cuidados?',
    description: 'Inclui ração, veterinário e outros cuidados mensais.',
    field: 'budget_level',
    type: 'radio',
    options: [
      { value: 'basic', label: '💰 Básico — até R$200/mês' },
      { value: 'moderate', label: '💰💰 Moderado — R$200 a R$500/mês' },
      { value: 'high', label: '💰💰💰 Alto — acima de R$500/mês' },
    ],
  },
  {
    id: 'location',
    title: 'Qual é a sua cidade?',
    description: 'Para mostrar pets próximos a você.',
    type: 'location',
  },
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
  });
  const [saving, setSaving] = useState(false);
  const current = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

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
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await updateUserProfile({ ...answers, profile_completed: true });
      toast.success('Perfil concluído! Bem-vindo ao Viralata 🐾');
      navigate('/feed');
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🐾</div>
          <h1 className="text-2xl font-bold text-gray-900">Vamos montar seu perfil</h1>
          <p className="text-gray-500 text-sm">Passo {step + 1} de {STEPS.length}</p>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{current.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{current.description}</p>
          </div>

          {current.type === 'radio' && (
            <div className="space-y-2">
              {current.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField(current.field, opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
                    answers[current.field] === opt.value
                      ? 'border-orange-500 bg-orange-50 text-orange-900 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.type === 'family' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox id="has_children" checked={answers.has_children} onCheckedChange={(v) => setField('has_children', v)} />
                <Label htmlFor="has_children" className="cursor-pointer">👶 Tenho crianças em casa</Label>
              </div>
              {answers.has_children && (
                <Input placeholder="Idades das crianças (ex: 3, 7 anos)" value={answers.children_ages} onChange={(e) => setField('children_ages', e.target.value)} className="ml-6" />
              )}
              <div className="flex items-center gap-3">
                <Checkbox id="has_elderly" checked={answers.has_elderly} onCheckedChange={(v) => setField('has_elderly', v)} />
                <Label htmlFor="has_elderly" className="cursor-pointer">👴 Tenho idosos em casa</Label>
              </div>
            </div>
          )}

          {current.type === 'other_pets' && (
            <div className="space-y-2">
              {[
                { value: 'dog', label: '🐶 Cachorro' },
                { value: 'cat', label: '🐱 Gato' },
                { value: 'bird', label: '🐦 Pássaro' },
                { value: 'other', label: '🐾 Outro' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePet(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
                    answers.other_pets.includes(opt.value)
                      ? 'border-orange-500 bg-orange-50 text-orange-900 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, other_pets: [] }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
                  answers.other_pets.length === 0
                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                🚫 Não tenho outros animais
              </button>
            </div>
          )}

          {current.type === 'location' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={answers.city} onChange={(e) => setField('city', e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={answers.state} onChange={(e) => setField('state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
              </div>
            </div>
          )}
        </div>

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
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance() || saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? 'Salvando...' : 'Concluir e ver pets 🐾'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
