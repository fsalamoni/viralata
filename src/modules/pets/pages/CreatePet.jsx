import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCreatePet, useUpdatePet, usePet } from '../hooks/usePets';
import { useMyClubs } from '@/modules/organizations/hooks/useClubs';
import { uploadImage } from '@/core/services/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, ArrowLeft, PawPrint } from 'lucide-react';
import { cn } from '@/core/lib/utils';

const schema = z.object({
  title: z.string().min(5, 'Título muito curto').max(100),
  name: z.string().optional(),
  species: z.enum(['dog', 'cat', 'rabbit', 'bird', 'other']),
  size: z.enum(['mini', 'small', 'medium', 'large', 'giant']),
  age_group: z.enum(['puppy', 'adult', 'senior']),
  gender: z.enum(['male', 'female']),
  breed: z.string().optional(),
  vaccinated: z.enum(['yes', 'no', 'partial']),
  neutered: z.boolean().default(false),
  dewormed: z.boolean().default(false),
  needs_yard: z.boolean().default(false),
  needs_screened_apt: z.boolean().default(false),
  good_with_kids: z.boolean().default(true),
  good_with_dogs: z.boolean().default(true),
  good_with_cats: z.boolean().default(true),
  health_notes: z.string().optional(),
  adoption_requirements: z.string().optional(),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().min(2, 'Informe o estado'),
});

const STEPS = ['Fotos', 'Sobre', 'Saúde', 'Revisão'];
const STEP_FIELDS = [
  [],
  ['title', 'species', 'size', 'age_group', 'gender', 'city', 'state'],
  ['vaccinated'],
  [],
];

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Cachorro' }, { value: 'cat', label: 'Gato' }, { value: 'rabbit', label: 'Coelho' },
  { value: 'bird', label: 'Pássaro' }, { value: 'other', label: 'Outro' },
];
const SIZE_OPTIONS = [
  { value: 'mini', label: 'Mini' }, { value: 'small', label: 'Pequeno' }, { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' }, { value: 'giant', label: 'Gigante' },
];
const AGE_OPTIONS = [{ value: 'puppy', label: 'Filhote' }, { value: 'adult', label: 'Adulto' }, { value: 'senior', label: 'Idoso' }];
const GENDER_OPTIONS = [{ value: 'male', label: 'Macho' }, { value: 'female', label: 'Fêmea' }];
const VACCINATED_OPTIONS = [{ value: 'yes', label: 'Vacinado' }, { value: 'partial', label: 'Parcialmente' }, { value: 'no', label: 'Não vacinado' }];
const CHECKS = [
  { field: 'neutered', label: 'Castrado' }, { field: 'dewormed', label: 'Vermifugado' },
  { field: 'needs_yard', label: 'Precisa de pátio' }, { field: 'needs_screened_apt', label: 'Precisa de tela de proteção' },
  { field: 'good_with_kids', label: 'Bom com crianças' }, { field: 'good_with_dogs', label: 'Bom com cães' }, { field: 'good_with_cats', label: 'Bom com gatos' },
];

const SPECIES_LABEL = Object.fromEntries(SPECIES_OPTIONS.map((o) => [o.value, o.label]));
const SIZE_LABEL = Object.fromEntries(SIZE_OPTIONS.map((o) => [o.value, o.label]));
const AGE_LABEL = Object.fromEntries(AGE_OPTIONS.map((o) => [o.value, o.label]));
const GENDER_LABEL = Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, o.label]));
const VACCINATED_LABEL = Object.fromEntries(VACCINATED_OPTIONS.map((o) => [o.value, o.label]));

function OptionChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-[13px] font-bold transition-colors',
        active ? 'border-2 border-primary bg-primary/[0.08] text-[hsl(14,55%,26%)]' : 'border-2 border-border bg-card text-foreground/75 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}

export default function CreatePet() {
  const navigate = useNavigate();
  const { petId } = useParams();
  const isEditing = Boolean(petId);
  const { user, userProfile } = useAuth();
  const { data: existingPet, isLoading: loadingPet } = usePet(petId);
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const { data: myClubs = [] } = useMyClubs();
  const adminClubs = myClubs.filter((c) => c.my_role === 'admin');
  const [ownerId, setOwnerId] = useState('me');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(0);

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      neutered: false, dewormed: false, needs_yard: false,
      needs_screened_apt: false, good_with_kids: true,
      good_with_dogs: true, good_with_cats: true,
      city: userProfile?.city || '', state: userProfile?.state || '',
    },
  });

  const form = watch();

  useEffect(() => {
    if (!existingPet) return;
    reset({
      title: existingPet.title || '',
      name: existingPet.name || '',
      species: existingPet.species,
      size: existingPet.size,
      age_group: existingPet.age_group,
      gender: existingPet.gender,
      breed: existingPet.breed || '',
      vaccinated: existingPet.vaccinated,
      neutered: Boolean(existingPet.neutered),
      dewormed: Boolean(existingPet.dewormed),
      needs_yard: Boolean(existingPet.needs_yard),
      needs_screened_apt: Boolean(existingPet.needs_screened_apt),
      good_with_kids: existingPet.good_with_kids !== false,
      good_with_dogs: existingPet.good_with_dogs !== false,
      good_with_cats: existingPet.good_with_cats !== false,
      health_notes: existingPet.health_notes || '',
      adoption_requirements: existingPet.adoption_requirements || '',
      city: existingPet.city || '',
      state: existingPet.state || '',
    });
    setPhotos(existingPet.photos || []);
    setOwnerId(existingPet.owner_type === 'organization' ? existingPet.owner_id : 'me');
  }, [existingPet, reset]);

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map((f) => uploadImage(f, { uid: user.uid, folder: 'pets' }))
      );
      setPhotos((prev) => [...prev, ...urls].slice(0, 6));
    } catch {
      toast.error('Erro ao fazer upload das fotos.');
    } finally {
      setUploading(false);
    }
  }

  async function goNext() {
    if (step === 0 && photos.length === 0) { toast.error('Adicione pelo menos uma foto.'); return; }
    const fields = STEP_FIELDS[step];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data) {
    if (photos.length === 0) { toast.error('Adicione pelo menos uma foto.'); return; }
    try {
      if (isEditing) {
        await updatePet.mutateAsync({ petId, updates: { ...data, photos } });
        toast.success('Pet atualizado com sucesso!');
        navigate(`/pets/${petId}`);
        return;
      }
      const isOrg = ownerId !== 'me';
      const newPetId = await createPet.mutateAsync({
        ...data,
        photos,
        owner_id: isOrg ? ownerId : user.uid,
        owner_type: isOrg ? 'organization' : 'user',
      });
      toast.success('Pet cadastrado com sucesso!');
      navigate(`/pets/${newPetId}`);
    } catch {
      toast.error(isEditing ? 'Erro ao atualizar pet. Tente novamente.' : 'Erro ao cadastrar pet. Tente novamente.');
    }
  }

  if (isEditing && loadingPet) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const isLastStep = step === STEPS.length - 1;
  const submitting = createPet.isPending || updatePet.isPending || uploading;
  const activeChecks = CHECKS.filter((c) => form[c.field]);

  return (
    <div className="arena-page mx-auto max-w-2xl px-5 pb-24 pt-6">
      <div className="mb-1.5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <h1 className="font-['Sora'] text-[22px] font-extrabold text-foreground">
        {isEditing ? 'Editar Pet' : 'Cadastrar Pet para Adoção'}
      </h1>
      <p className="mb-6.5 mt-1.5 text-[13px] text-muted-foreground">
        Leva menos de 2 minutos — capriche na descrição, ela ajuda a encontrar o lar certo.
      </p>

      {!isEditing && adminClubs.length > 0 && (
        <div className="mb-5 space-y-1">
          <Label>Cadastrar em nome de</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Eu mesmo</SelectItem>
              {adminClubs.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Barra de progresso segmentada */}
      <div className="mb-6.5 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-secondary')} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-[1.5rem] border border-white bg-card p-6 shadow-[0_24px_60px_-32px_hsl(20_40%_20%/0.4)]">

          {step === 0 && (
            <>
              <h2 className="mb-1 font-['Sora'] text-base font-bold text-foreground">Fotos do pet</h2>
              <p className="mb-4 text-xs text-muted-foreground">Adicione até 6 fotos. A primeira será a capa do anúncio.</p>
              <div className="flex flex-wrap gap-2.5">
                {photos.map((url, i) => (
                  <div key={i} className="relative h-[84px] w-[84px] overflow-hidden rounded-2xl border border-border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white">×</button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="flex h-[84px] w-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors hover:border-primary/60">
                    <Upload className="h-[22px] w-[22px]" />
                    <span className="text-[10.5px] font-semibold">Foto</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              {uploading && <p className="mt-2 text-sm text-muted-foreground">Enviando fotos...</p>}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mb-4 font-['Sora'] text-base font-bold text-foreground">Sobre o pet</h2>
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Título do anúncio</Label>
                  <Input id="title" {...register('title')} placeholder="Ex: Labrador dócil para adoção" />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome do animal (opcional)</Label>
                  <Input id="name" {...register('name')} placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Espécie</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIES_OPTIONS.map((o) => (
                      <OptionChip key={o.value} active={form.species === o.value} onClick={() => setValue('species', o.value, { shouldValidate: true })}>{o.label}</OptionChip>
                    ))}
                  </div>
                  {errors.species && <p className="text-xs text-destructive">Selecione a espécie</p>}
                </div>
                <div className="space-y-2">
                  <Label>Porte</Label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((o) => (
                      <OptionChip key={o.value} active={form.size === o.value} onClick={() => setValue('size', o.value, { shouldValidate: true })}>{o.label}</OptionChip>
                    ))}
                  </div>
                  {errors.size && <p className="text-xs text-destructive">Selecione o porte</p>}
                </div>
                <div className="space-y-2">
                  <Label>Faixa etária</Label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_OPTIONS.map((o) => (
                      <OptionChip key={o.value} active={form.age_group === o.value} onClick={() => setValue('age_group', o.value, { shouldValidate: true })}>{o.label}</OptionChip>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map((o) => (
                      <OptionChip key={o.value} active={form.gender === o.value} onClick={() => setValue('gender', o.value, { shouldValidate: true })}>{o.label}</OptionChip>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="breed">Raça (opcional)</Label>
                  <Input id="breed" {...register('breed')} placeholder="Ex: SRD, Labrador..." />
                </div>
                <div className="grid grid-cols-[2fr,1fr] gap-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register('city')} />
                    {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" {...register('state')} maxLength={2} placeholder="SP" />
                    {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-4 font-['Sora'] text-base font-bold text-foreground">Saúde e requisitos</h2>
              <div className="space-y-3.5">
                <div className="space-y-2">
                  <Label>Vacinação</Label>
                  <div className="flex flex-wrap gap-2">
                    {VACCINATED_OPTIONS.map((o) => (
                      <OptionChip key={o.value} active={form.vaccinated === o.value} onClick={() => setValue('vaccinated', o.value, { shouldValidate: true })}>{o.label}</OptionChip>
                    ))}
                  </div>
                  {errors.vaccinated && <p className="text-xs text-destructive">Selecione o status de vacinação</p>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CHECKS.map(({ field, label }) => (
                    <button
                      type="button"
                      key={field}
                      onClick={() => setValue(field, !form[field])}
                      className="flex items-center gap-2.5 rounded-2xl border-2 border-border bg-card px-3 py-2.5 text-left text-[12.5px] font-semibold text-foreground/85"
                    >
                      <Checkbox checked={Boolean(form[field])} className="pointer-events-none" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="health_notes">Observações de saúde</Label>
                  <Textarea id="health_notes" {...register('health_notes')} placeholder="Condições especiais, medicamentos, histórico..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adoption_requirements">Requisitos para adoção</Label>
                  <Textarea id="adoption_requirements" {...register('adoption_requirements')} placeholder="O que você espera do adotante..." rows={3} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-4 font-['Sora'] text-base font-bold text-foreground">Revisão</h2>
              <div className="mb-4 flex gap-3.5">
                <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)]">
                  {photos[0] ? <img src={photos[0]} alt="" className="h-full w-full object-cover" /> : <PawPrint className="h-6 w-6 text-white/50" />}
                </div>
                <div className="min-w-0">
                  <div className="font-['Sora'] text-[15px] font-bold text-foreground">{form.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">{form.city}, {form.state}</div>
                </div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[SPECIES_LABEL[form.species], SIZE_LABEL[form.size], AGE_LABEL[form.age_group], GENDER_LABEL[form.gender], VACCINATED_LABEL[form.vaccinated]]
                  .filter(Boolean).map((label) => (
                    <span key={label} className="rounded-full bg-secondary px-3 py-1 text-[11.5px] font-bold text-secondary-foreground">{label}</span>
                  ))}
              </div>
              {activeChecks.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {activeChecks.map((c) => (
                    <span key={c.field} className="rounded-full bg-accent/[0.12] px-3 py-1 text-[11.5px] font-bold text-accent">{c.label}</span>
                  ))}
                </div>
              )}
              {form.health_notes && (
                <div className="mb-2.5 rounded-2xl border border-highlight/35 bg-highlight/[0.12] p-3.5 text-[12.5px] leading-relaxed text-[hsl(30,60%,26%)]">
                  <strong>Saúde:</strong> {form.health_notes}
                </div>
              )}
              {form.adoption_requirements && (
                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-[12.5px] leading-relaxed text-[hsl(86,40%,20%)]">
                  <strong>Requisitos:</strong> {form.adoption_requirements}
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex gap-2.5">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goBack} className="flex-1">Voltar</Button>
            )}
            {isLastStep ? (
              <Button type="submit" disabled={submitting} className="flex-1">
                {isEditing
                  ? (updatePet.isPending ? 'Salvando...' : 'Salvar alterações')
                  : (createPet.isPending ? 'Cadastrando...' : 'Cadastrar Pet')}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} className="flex-1">Continuar</Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
