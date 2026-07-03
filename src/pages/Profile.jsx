import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  User, Download, ShieldAlert, PawPrint, Star, ArrowLeft,
  Home as HomeIcon, Trees, Building2, Tractor, Sofa, Footprints, Wind, Wallet, Bird,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getRatingsForUser, summarizeRatings } from '@/modules/pets/services/ratingService';
import { exportMyData, downloadDataExport } from '@/core/services/dataExportService';
import { deleteMyAccount } from '@/core/services/deleteAccountService';

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

export default function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile, signOut } = useAuth();
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
        profile_completed: Boolean(fullName.trim() && city.trim()),
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
    <div className="arena-page mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6 pb-16">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/feed')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
      </div>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <ImageUpload
              value={photoUrl}
              onChange={(value) => updateField('photoUrl', value)}
              folder="avatar"
              shape="circle"
              className="h-16 w-16"
            />
            <div className="min-w-[180px] flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-100/70">Meu perfil</div>
              <div className="mt-1 font-['Sora'] text-2xl font-extrabold text-white">{fullName || user?.email}</div>
              <div className="mt-1 text-[13px] text-orange-50/80">{user?.email}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {ratingCount > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-[15px] w-[15px]"
                        style={{ color: i < Math.round(ratingAvg) ? 'hsl(40 88% 54%)' : 'rgba(255,255,255,0.35)' }}
                        fill={i < Math.round(ratingAvg) ? 'hsl(40 88% 54%)' : 'none'}
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-white">{ratingAvg.toFixed(1)}</span>
                  </div>
                )}
                {memberSinceYear && (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-orange-50/85">
                    Membro desde {memberSinceYear}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-sm text-sm leading-6 text-orange-50/82">
            Revise seus dados, mantenha o perfil de adotante atualizado e controle a privacidade das suas informações.
          </div>
        </div>
      </section>

      {/* Dados pessoais */}
      <Card className="rounded-[24px] p-6 lg:p-7">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <User className="w-[19px] h-[19px] text-primary" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSave} className="space-y-3.5">
            {/* Foto */}
            <div className="flex items-center gap-4">
              <ImageUpload
                value={photoUrl}
                onChange={(value) => updateField('photoUrl', value)}
                folder="avatar"
                className="w-20 h-20 rounded-full"
              />
              <div className="text-[12.5px] text-muted-foreground">
                <p className="font-medium text-foreground">{user?.email}</p>
                <p>Clique na foto para alterar</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" value={phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" value={city} onChange={(e) => updateField('city', e.target.value)} placeholder="Sua cidade" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">UF *</Label>
                <Input id="state" value={stateUf} onChange={(e) => updateField('stateUf', e.target.value)} maxLength={2} placeholder="SP" required />
              </div>
            </div>

            <div className="space-y-2">
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
        </CardContent>
      </Card>

      {/* Perfil de adotante */}
      <Card className="rounded-[24px] p-6 lg:p-7">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <PawPrint className="w-[19px] h-[19px] text-accent" /> Perfil de adotante
          </CardTitle>
          <CardDescription className="text-[12.5px]">
            Usado pelo algoritmo de match para sugerir pets compatíveis com sua realidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5 p-0 pt-4">
          <div className="space-y-2">
            <Label>Tipo de moradia</Label>
            <div className="flex flex-col gap-2">
              {HOUSING_OPTIONS.map(({ value, label, icon }) => (
                <ChoiceRow key={value} active={housing === value} icon={icon} onClick={() => updateField('housing', value)}>{label}</ChoiceRow>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rotina de passeios</Label>
            <div className="flex flex-wrap gap-2">
              {WALKS_OPTIONS.map(({ value, label }) => (
                <ChoiceChip key={value} active={dailyWalks === value} onClick={() => updateField('dailyWalks', value)}>{label}</ChoiceChip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label>Já tem outros animais?</Label>
            <div className="grid grid-cols-2 gap-2">
              {OTHER_PET_OPTIONS.map(({ value, label, icon }) => (
                <ChoiceRow key={value} active={otherPets.includes(value)} icon={icon} onClick={() => toggleOtherPet(value)}>{label}</ChoiceRow>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={busy} className="w-full">
            {busy ? 'Salvando...' : 'Salvar perfil de adotante'}
          </Button>
        </CardContent>
      </Card>

      {/* Privacidade e dados (LGPD) */}
      <Card className="rounded-[24px] p-6">
        <CardHeader className="p-0 pb-1">
          <CardTitle className="text-base font-bold">Privacidade e dados</CardTitle>
          <CardDescription className="text-[12.5px] leading-[1.6]">
            Em conformidade com a LGPD, baixe uma cópia dos seus dados ou exclua sua conta quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 p-0 pt-4">
          <Button variant="outline" onClick={handleExportData} disabled={exporting} className="h-[46px] w-full gap-2 text-[13.5px] font-bold">
            <Download className="w-[18px] h-[18px]" />
            {exporting ? 'Preparando arquivo...' : 'Baixar meus dados'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="h-[46px] w-full gap-2 border-destructive/30 bg-destructive/[0.06] text-[13.5px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <ShieldAlert className="w-[18px] h-[18px]" />
            Excluir minha conta
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir sua conta"
        description="Seu perfil será anonimizado e sua conta de acesso removida. Pets, posts e mensagens já publicados permanecem para não quebrar o histórico de outros usuários. Esta ação não pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
