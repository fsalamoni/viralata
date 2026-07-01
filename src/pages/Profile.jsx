import React, { useState } from 'react';
import { toast } from 'sonner';
import { User, MapPin, Phone, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'non_binary', label: 'Não-binário' },
  { value: 'prefer_not_to_say', label: 'Prefiro não informar' },
];

// Mesmos valores usados em modules/onboarding/pages/OnboardingQuestionnaire.jsx
// e checados por modules/pets/domain/matching.js — não renomear sem atualizar os dois.
const HOUSING_OPTIONS = [
  { value: 'house_with_yard', label: '🏡 Casa com pátio' },
  { value: 'house_no_yard', label: '🏠 Casa sem pátio' },
  { value: 'apartment_screened', label: '🏢 Apartamento com tela de proteção' },
  { value: 'apartment_unscreened', label: '🏢 Apartamento sem tela' },
  { value: 'farm', label: '🌾 Sítio / Fazenda' },
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
  { value: 'dog', label: '🐶 Cachorro' },
  { value: 'cat', label: '🐱 Gato' },
  { value: 'bird', label: '🐦 Pássaro' },
  { value: 'other', label: '🐾 Outro' },
];

export default function Profile() {
  const { user, userProfile, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.full_name || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [stateUf, setStateUf] = useState(userProfile?.state || '');
  const [gender, setGender] = useState(userProfile?.gender || '');
  const [housing, setHousing] = useState(userProfile?.housing_type || '');
  const [dailyWalks, setDailyWalks] = useState(userProfile?.daily_walks || '');
  const [hasChildren, setHasChildren] = useState(userProfile?.has_children === true);
  const [childrenAges, setChildrenAges] = useState(userProfile?.children_ages || '');
  const [hasElderly, setHasElderly] = useState(userProfile?.has_elderly === true);
  const [otherPets, setOtherPets] = useState(Array.isArray(userProfile?.other_pets) ? userProfile.other_pets : []);
  const [budgetLevel, setBudgetLevel] = useState(userProfile?.budget_level || '');
  const [phonePublic, setPhonePublic] = useState(userProfile?.phone_public === true);
  const [photoUrl, setPhotoUrl] = useState(userProfile?.photo_url || user?.photoURL || '');
  const [busy, setBusy] = useState(false);

  function toggleOtherPet(pet) {
    setOtherPets((prev) => (prev.includes(pet) ? prev.filter((p) => p !== pet) : [...prev, pet]));
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
        profile_completed: Boolean(fullName.trim() && city.trim()),
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>

      {/* Dados pessoais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-orange-500" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <ImageUpload
                value={photoUrl}
                onChange={setPhotoUrl}
                storagePath={`users/${user?.uid}/avatar`}
                className="w-20 h-20 rounded-full"
              />
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700">{user?.email}</p>
                <p>Clique na foto para alterar</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">UF *</Label>
                <Input id="state" value={stateUf} onChange={(e) => setStateUf(e.target.value)} maxLength={2} placeholder="SP" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Gênero</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Prefiro não informar</option>
                {GENDER_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Privacidade */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Exibir telefone publicamente</p>
                <p className="text-xs text-gray-500">Visível para responsáveis de pets que você demonstrar interesse</p>
              </div>
              <Switch checked={phonePublic} onCheckedChange={setPhonePublic} />
            </div>

            <Button type="submit" disabled={busy} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {busy ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Perfil de adotante */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            🐾 Perfil de adotante
          </CardTitle>
          <CardDescription>
            Essas informações são usadas pelo algoritmo de matching para sugerir pets compatíveis com sua realidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="housing">Tipo de moradia</Label>
            <select
              id="housing"
              value={housing}
              onChange={(e) => setHousing(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              {HOUSING_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dailyWalks">Rotina de passeios</Label>
            <select
              id="dailyWalks"
              value={dailyWalks}
              onChange={(e) => setDailyWalks(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              {WALKS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget">Orçamento para cuidados do pet</Label>
            <select
              id="budget"
              value={budgetLevel}
              onChange={(e) => setBudgetLevel(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              {BUDGET_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm">Tem crianças em casa</p>
            <Switch checked={hasChildren} onCheckedChange={setHasChildren} />
          </div>
          {hasChildren && (
            <Input
              value={childrenAges}
              onChange={(e) => setChildrenAges(e.target.value)}
              placeholder="Idades das crianças (ex: 3, 7 anos)"
            />
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm">Tem idosos em casa</p>
            <Switch checked={hasElderly} onCheckedChange={setHasElderly} />
          </div>

          <div className="space-y-1.5">
            <Label>Já tem outros animais?</Label>
            <div className="grid grid-cols-2 gap-2">
              {OTHER_PET_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleOtherPet(value)}
                  className={`text-left px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                    otherPets.includes(value)
                      ? 'border-orange-500 bg-orange-50 text-orange-900 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={busy} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {busy ? 'Salvando...' : 'Salvar perfil de adotante'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
