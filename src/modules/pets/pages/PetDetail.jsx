import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  usePet, useCreateInterest, useHasInterest, useCompleteAdoption, useDeletePet,
  useMyRatingForPet, useCreateRating,
} from '../hooks/usePets';
import InterestPanel from '../components/InterestPanel';
import RatingForm from '../components/RatingForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, MapPin, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };
const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', other: 'Outro' };

export default function PetDetail() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isPlatformAdmin } = useAuth();
  const { data: pet, isLoading } = usePet(petId);
  const { data: alreadyInterested } = useHasInterest(petId, user?.uid);
  const createInterest = useCreateInterest();
  const completeAdoption = useCompleteAdoption();
  const deletePet = useDeletePet();
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const isOwner = user?.uid === pet?.owner_id;
  const isAdopter = user?.uid === pet?.adopted_by;
  const ratedUid = isAdopter ? pet?.owner_id : pet?.adopted_by;
  const canRate = pet?.status === 'adopted' && (isOwner || isAdopter) && Boolean(ratedUid);
  const { data: myRating } = useMyRatingForPet(canRate ? petId : null, user?.uid);
  const createRating = useCreateRating();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;
  if (!pet) return <div className="text-center py-16 text-gray-500">Pet não encontrado.</div>;

  const canManage = isOwner || isPlatformAdmin;

  async function handleRate({ ratedUid: target, stars, comment }) {
    try {
      await createRating.mutateAsync({ petId, ratedUid: target, stars, comment });
      toast.success('Avaliação enviada. Obrigado!');
    } catch (e) {
      toast.error(e?.message || 'Erro ao enviar avaliação.');
    }
  }

  async function handleInterest() {
    if (!user) { navigate('/login'); return; }
    try {
      await createInterest.mutateAsync(petId);
      toast.success('Interesse registrado! O responsável será notificado.');
    } catch (e) {
      toast.error('Erro ao registrar interesse. Tente novamente.');
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;
    try {
      await deletePet.mutateAsync(petId);
      toast.success('Pet removido.');
      navigate('/pets');
    } catch (e) {
      toast.error('Erro ao remover pet.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Galeria de fotos */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
            <img
              src={pet.photos?.[currentPhoto] || '/placeholder-pet.svg'}
              alt={pet.title}
              className="w-full h-full object-cover"
            />
          </div>
          {pet.photos?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pet.photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhoto(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === currentPhoto ? 'border-orange-500' : 'border-transparent'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{pet.title || pet.name}</h1>
              {pet.status === 'adopted' && (
                <Badge className="bg-green-500 text-white">Adotado ✓</Badge>
              )}
              {pet.status === 'in_process' && (
                <Badge className="bg-yellow-500 text-white">Em processo</Badge>
              )}
            </div>
            {pet.name && pet.title && <p className="text-gray-500 text-sm">Nome: {pet.name}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {pet.species && <Badge variant="secondary">{SPECIES_LABEL[pet.species]}</Badge>}
            {pet.size && <Badge variant="secondary">{SIZE_LABEL[pet.size]}</Badge>}
            {pet.age_group && <Badge variant="secondary">{AGE_LABEL[pet.age_group]}</Badge>}
            {pet.gender && <Badge variant="secondary">{pet.gender === 'male' ? 'Macho' : 'Fêmea'}</Badge>}
            {pet.neutered && <Badge className="bg-green-100 text-green-800">Castrado</Badge>}
            {pet.vaccinated === 'yes' && <Badge className="bg-blue-100 text-blue-800">Vacinado</Badge>}
            {pet.dewormed && <Badge className="bg-purple-100 text-purple-800">Vermifugado</Badge>}
          </div>

          {(pet.city || pet.state) && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              {[pet.city, pet.state].filter(Boolean).join(', ')}
            </div>
          )}

          {pet.health_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Observações de saúde:</strong> {pet.health_notes}
            </div>
          )}

          {pet.adoption_requirements && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Requisitos para adoção:</strong> {pet.adoption_requirements}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-2">
            {!canManage && pet.status === 'available' && (
              <Button
                onClick={handleInterest}
                disabled={alreadyInterested || createInterest.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
              >
                <Heart className="w-4 h-4 mr-2" />
                {alreadyInterested ? 'Interesse já registrado' : 'Tenho Interesse em Adotar'}
              </Button>
            )}
            {canManage && (
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/pets/${petId}/edit`}>Editar</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={deletePet.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Painel de interessados (apenas para donos) */}
      {canManage && (
        <Tabs defaultValue="interests" className="mt-6">
          <TabsList>
            <TabsTrigger value="interests">Interessados</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>
          <TabsContent value="interests">
            <InterestPanel petId={petId} pet={pet} />
          </TabsContent>
          <TabsContent value="info">
            <div className="prose prose-sm max-w-none text-gray-600 mt-4">
              {pet.breed && <p><strong>Raça:</strong> {pet.breed}</p>}
              {pet.age_months && <p><strong>Idade:</strong> {pet.age_months} meses</p>}
              {pet.gov_registration && <p><strong>Registro/Chip:</strong> {pet.gov_registration}</p>}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Avaliação pós-adoção */}
      {canRate && !myRating && (
        <RatingForm
          ratedUid={ratedUid}
          ratedLabel={isAdopter ? 'o responsável pelo pet' : 'o adotante'}
          onSubmit={handleRate}
          submitting={createRating.isPending}
        />
      )}
    </div>
  );
}
