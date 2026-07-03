import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  usePet, useCreateInterest, useHasInterest, useCompleteAdoption, useDeletePet,
  useMyRatingForPet, useCreateRating,
} from '../hooks/usePets';
import { getOrCreateDirectConversation } from '@/modules/chat/services/chatService';
import InterestPanel from '../components/InterestPanel';
import RatingForm from '../components/RatingForm';
import PetShareCard from '../components/PetShareCard';
import { usePetShareImage } from '../hooks/usePetShareImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, MapPin, Trash2, Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

function useOwnerProfile(ownerId) {
  return useQuery({
    queryKey: ['users', ownerId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'users', ownerId));
      return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
    },
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 5,
  });
}

function ownerInitials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };
const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };

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
  const [openingChat, setOpeningChat] = useState(false);
  const { data: owner } = useOwnerProfile(pet?.owner_id);

  const isOwner = user?.uid === pet?.owner_id;
  const isAdopter = user?.uid === pet?.adopted_by;
  const ratedUid = isAdopter ? pet?.owner_id : pet?.adopted_by;
  const canRate = pet?.status === 'adopted' && (isOwner || isAdopter) && Boolean(ratedUid);
  const { data: myRating } = useMyRatingForPet(canRate ? petId : null, user?.uid);
  const createRating = useCreateRating();
  const shareCardRef = useRef(null);
  const { shareFromNode, generating: sharing } = usePetShareImage();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!pet) return <div className="text-center py-16 text-muted-foreground">Pet não encontrado.</div>;

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

  async function handleOpenChat() {
    if (!user) { navigate('/login'); return; }
    if (!pet?.owner_id || pet.owner_id === user.uid) return;
    setOpeningChat(true);
    try {
      const other = { uid: pet.owner_id, name: owner?.platform_name || owner?.name || 'Responsável', photo_url: owner?.photo_url || '' };
      const conversationId = await getOrCreateDirectConversation(user, userProfile, other, {
        pet_id: petId,
        pet_title: pet.title || pet.name,
      });
      navigate(`/chat/${conversationId}`);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível abrir a conversa.');
    } finally {
      setOpeningChat(false);
    }
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}/pets/${petId}`;
    await shareFromNode(shareCardRef.current, {
      fileName: `${(pet.name || pet.title || 'pet').toLowerCase().replace(/\s+/g, '-')}.png`,
      title: pet.title || pet.name,
      text: `Conheça ${pet.name || pet.title} no Viralata! ${shareUrl}`,
    });
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;
    try {
      await deletePet.mutateAsync(petId);
      toast.success('Pet removido.');
      navigate('/meus-pets');
    } catch (e) {
      toast.error('Erro ao remover pet.');
    }
  }

  return (
    <div className="arena-page max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Galeria de fotos */}
        <div className="space-y-3">
          <div className="arena-panel aspect-square rounded-[1.25rem] overflow-hidden">
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
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === currentPhoto ? 'border-primary' : 'border-transparent'}`}
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
              <h1 className="text-2xl font-bold text-foreground">{pet.title || pet.name}</h1>
              {pet.status === 'adopted' && (
                <Badge variant="success">Adotado ✓</Badge>
              )}
              {pet.status === 'in_process' && (
                <Badge className="bg-highlight text-highlight-foreground">Em processo</Badge>
              )}
            </div>
            {pet.name && pet.title && <p className="text-muted-foreground text-sm">Nome: {pet.name}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {pet.species && <Badge variant="secondary">{SPECIES_LABEL[pet.species]}</Badge>}
            {pet.size && <Badge variant="secondary">{SIZE_LABEL[pet.size]}</Badge>}
            {pet.age_group && <Badge variant="secondary">{AGE_LABEL[pet.age_group]}</Badge>}
            {pet.gender && <Badge variant="secondary">{pet.gender === 'male' ? 'Macho' : 'Fêmea'}</Badge>}
            {pet.neutered && <Badge variant="success">Castrado</Badge>}
            {pet.vaccinated === 'yes' && <Badge variant="outline">Vacinado</Badge>}
            {pet.dewormed && <Badge variant="outline">Vermifugado</Badge>}
          </div>

          {(pet.city || pet.state) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {[pet.city, pet.state].filter(Boolean).join(', ')}
            </div>
          )}

          {pet.health_notes && (
            <div className="bg-highlight/15 border border-highlight/40 rounded-xl p-3 text-sm text-[hsl(30,55%,26%)]">
              <strong>Observações de saúde:</strong> {pet.health_notes}
            </div>
          )}

          {pet.adoption_requirements && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-sm text-[hsl(84,35%,22%)]">
              <strong>Requisitos para adoção:</strong> {pet.adoption_requirements}
            </div>
          )}

          {!canManage && pet.owner_id && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] font-['Sora'] text-[13px] font-bold text-white">
                {ownerInitials(owner?.platform_name || owner?.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-foreground">{owner?.platform_name || owner?.name || 'Responsável'}</div>
                <div className="text-[11.5px] text-muted-foreground">Responsável pelo pet</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenChat} disabled={openingChat} className="shrink-0 gap-1.5">
                <MessageCircle className="h-4 w-4" /> Conversar
              </Button>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-2">
            {!canManage && pet.status === 'available' && (
              <Button
                onClick={handleInterest}
                disabled={alreadyInterested || createInterest.isPending}
                className="w-full"
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
            <Button variant="outline" onClick={handleShare} disabled={sharing || !pet.photos?.[0]} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              {sharing ? 'Gerando imagem...' : 'Compartilhar'}
            </Button>
          </div>
        </div>
      </motion.div>

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
            <div className="prose prose-sm max-w-none text-muted-foreground mt-4">
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

      {/* Nó oculto usado apenas para gerar a imagem de compartilhamento */}
      <div style={{ position: 'fixed', top: 0, left: '-99999px', pointerEvents: 'none' }} aria-hidden="true">
        <PetShareCard ref={shareCardRef} pet={pet} shareUrl={`${window.location.origin}/pets/${petId}`} />
      </div>
    </div>
  );
}
