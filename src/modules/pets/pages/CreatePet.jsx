import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCreatePet } from '../hooks/usePets';
import { uploadImage } from '@/core/services/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, ArrowLeft } from 'lucide-react';

const schema = z.object({
  title: z.string().min(5, 'Título muito curto').max(100),
  name: z.string().optional(),
  species: z.enum(['dog', 'cat', 'other']),
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

export default function CreatePet() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const createPet = useCreatePet();
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      neutered: false, dewormed: false, needs_yard: false,
      needs_screened_apt: false, good_with_kids: true,
      good_with_dogs: true, good_with_cats: true,
      city: userProfile?.city || '', state: userProfile?.state || '',
    },
  });

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

  async function onSubmit(data) {
    if (photos.length === 0) { toast.error('Adicione pelo menos uma foto.'); return; }
    try {
      const petId = await createPet.mutateAsync({
        ...data,
        photos,
        owner_id: user.uid,
        owner_type: 'user',
      });
      toast.success('Pet cadastrado com sucesso!');
      navigate(`/pets/${petId}`);
    } catch {
      toast.error('Erro ao cadastrar pet. Tente novamente.');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Cadastrar Pet para Adoção</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Fotos */}
        <div className="space-y-2">
          <Label>Fotos <span className="text-red-500">*</span></Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">×</button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Foto</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
          {uploading && <p className="text-sm text-gray-400">Enviando fotos...</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="title">Título do anúncio <span className="text-red-500">*</span></Label>
            <Input id="title" {...register('title')} placeholder="Ex: Labrador dócil para adoção" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Nome do animal</Label>
            <Input id="name" {...register('name')} placeholder="Opcional" />
          </div>
          <div className="space-y-1">
            <Label>Espécie <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('species', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Cachorro</SelectItem>
                <SelectItem value="cat">Gato</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.species && <p className="text-xs text-red-500">{errors.species.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Porte <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('size', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mini">Mini</SelectItem>
                <SelectItem value="small">Pequeno</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
                <SelectItem value="giant">Gigante</SelectItem>
              </SelectContent>
            </Select>
            {errors.size && <p className="text-xs text-red-500">{errors.size.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Faixa etária <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('age_group', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="puppy">Filhote</SelectItem>
                <SelectItem value="adult">Adulto</SelectItem>
                <SelectItem value="senior">Idoso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Sexo <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Macho</SelectItem>
                <SelectItem value="female">Fêmea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Vacinação <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('vaccinated', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Vacinado</SelectItem>
                <SelectItem value="partial">Parcialmente</SelectItem>
                <SelectItem value="no">Não vacinado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">Cidade <span className="text-red-500">*</span></Label>
            <Input id="city" {...register('city')} />
            {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="state">Estado <span className="text-red-500">*</span></Label>
            <Input id="state" {...register('state')} maxLength={2} placeholder="SP" />
            {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { id: 'neutered', label: 'Castrado' },
            { id: 'dewormed', label: 'Vermifugado' },
            { id: 'needs_yard', label: 'Precisa de pátio' },
            { id: 'needs_screened_apt', label: 'Precisa de tela' },
            { id: 'good_with_kids', label: 'Bom com crianças' },
            { id: 'good_with_dogs', label: 'Bom com cães' },
            { id: 'good_with_cats', label: 'Bom com gatos' },
          ].map(({ id, label }) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox id={id} checked={watch(id)} onCheckedChange={(v) => setValue(id, v)} />
              <Label htmlFor={id} className="text-sm cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="health_notes">Observações de saúde</Label>
          <Textarea id="health_notes" {...register('health_notes')} placeholder="Condições especiais, medicamentos, histórico..." rows={3} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adoption_requirements">Requisitos para adoção</Label>
          <Textarea id="adoption_requirements" {...register('adoption_requirements')} placeholder="O que você espera do adotante..." rows={3} />
        </div>

        <Button type="submit" disabled={createPet.isPending || uploading} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
          {createPet.isPending ? 'Cadastrando...' : 'Cadastrar Pet'}
        </Button>
      </form>
    </div>
  );
}
