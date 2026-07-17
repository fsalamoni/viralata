import React, { useRef, useState } from 'react';
import Seo from '@/components/Seo';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  usePet, useCreateInterest, useHasInterest, useCompleteAdoption, useDeletePet,
  useMyRatingForPet, useCreateRating,
} from '../hooks/usePets';
import { usePetPermissions } from '../hooks/usePetPermissions';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { getOrCreateDirectConversation } from '@/modules/chat/services/chatService';
import InterestPanel from '../components/InterestPanel';
import RatingForm from '../components/RatingForm';
import PetShareCard from '../components/PetShareCard';
import AdoptionFormFill from '../components/AdoptionFormFill';
import PetDetailSkeleton from '../components/PetDetailSkeleton';
import PetNotFound from '../components/PetNotFound';
import { hasQuestions } from '../domain/adoptionForm';
import { usePetShareImage } from '../hooks/usePetShareImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, MapPin, Trash2, Share2, MessageCircle, FileText, Info, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-provider';

function useOwnerProfile(ownerId, enabled) {
  return useQuery({
    queryKey: ['users', ownerId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'users', ownerId));
      return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
    },
    // A leitura de `users/{uid}` exige autenticação (firestore.rules) — sem
    // isso, todo visitante não logado gerava uma tentativa (com retries) que
    // sempre falhava por permissão negada.
    enabled: Boolean(ownerId) && Boolean(enabled),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const { data: pet, isLoading } = usePet(petId);
  const { data: alreadyInterested } = useHasInterest(petId, user?.uid);
  const createInterest = useCreateInterest();
  const completeAdoption = useCompleteAdoption();
  const deletePet = useDeletePet();
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [openingChat, setOpeningChat] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { data: owner } = useOwnerProfile(pet?.owner_id, Boolean(user));

  const isOwner = user?.uid === pet?.owner_id;
  const isAdopter = user?.uid === pet?.adopted_by;
  const ratedUid = isAdopter ? pet?.owner_id : pet?.adopted_by;
  const canRate = pet?.status === 'adopted' && (isOwner || isAdopter) && Boolean(ratedUid);
  const { data: myRating } = useMyRatingForPet(canRate ? petId : null, user?.uid);
  const createRating = useCreateRating();
  const shareCardRef = useRef(null);
  const { shareFromNode, generating: sharing } = usePetShareImage();

  const petPermissions = usePetPermissions(pet);
  const showAdoptionGating = useFeatureFlag(FEATURE_FLAG.PET_ADOPTION_GATING);
  const wrapperClass = useArenaPageClasses('arena-page max-w-4xl mx-auto px-4 py-6 space-y-6');

  if (isLoading) return <PetDetailSkeleton />;
  if (!pet) return <PetNotFound petId={petId} />;

  // `canManage` segue indicando se o usuário pode editar/deletar — alimenta
  // as tabs e os botões de gestão. A flag PET_ADOPTION_GATING decide se
  // mostramos a explicação abaixo quando nem tudo está liberado.
  const canManage = petPermissions.canEdit;
  const managementTab = searchParams.get('tab') === 'info' ? 'info' : 'interests';

  // Motivos pelos quais o usuário não consegue adotar/abrir chat AGORA.
  // Cada motivo vira um bullet no card explicativo (atrás da flag).
  const blockedReasons = [];
  if (isOwner) {
    blockedReasons.push('Você é o responsável por este pet — adoção e conversa se aplicam a outros usuários.');
  }
  if (pet.status === 'adopted') {
    blockedReasons.push('Este pet já foi adotado. Continue procurando no feed!');
  } else if (pet.status === 'in_process') {
    blockedReasons.push('Este pet está em processo de adoção com outro interessado.');
  }
  if (!user) {
    blockedReasons.push('Você não está logado(a). Faça login para demonstrar interesse.');
  } else if (userProfile && userProfile.profile_completed === false) {
    blockedReasons.push(
      'Seu perfil de adotante ainda não está completo (residence, household, pets atuais). '
      + 'Conclua o onboarding para liberar adoções.',
    );
  }
  if (alreadyInterested) {
    blockedReasons.push('Você já demonstrou interesse neste pet.');
  }

  function setManagementTab(value) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  }

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
    // Se o pet tem formulário de adoção montado na plataforma, o adotante
    // precisa respondê-lo antes de registrar o interesse (item 5).
    if (hasQuestions(pet?.adoption_form)) {
      setFormOpen(true);
      return;
    }
    await submitInterest();
  }

  async function submitInterest(formAnswers = null) {
    try {
      await createInterest.mutateAsync({ petId, formAnswers });
      setFormOpen(false);
      toast.success('Interesse registrado! O responsável será notificado.');
    } catch (e) {
      toast.error('Erro ao registrar interesse. Tente novamente.');
    }
  }

  async function handleOpenChat() {
    if (!user) { navigate('/login'); return; }
    if (!pet?.owner_id || pet.owner_id === user.uid) {
      toast.error('Você é o responsável por este pet — não há conversa a iniciar.');
      return;
    }
    if (pet.status !== 'available') {
      toast.error(`Este pet está ${pet.status === 'adopted' ? 'já adotado' : 'em processo de adoção'} — sem nova conversa.`);
      return;
    }
    setOpeningChat(true);
    try {
      const other = { uid: pet.owner_id, name: owner?.platform_name || owner?.name || 'Responsável', photo_url: owner?.photo_url || '' };
      const conversationId = await getOrCreateDirectConversation(user, userProfile, other, {
        pet_id: petId,
        pet_title: pet.title || pet.name,
      });
      navigate(`/chat?c=${conversationId}`);
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
    if (!(await confirmDialog({ title: 'Tem certeza que deseja remover este pet?' }))) return;
    try {
      await deletePet.mutateAsync(petId);
      toast.success('Pet removido.');
      navigate('/meus-pets');
    } catch (e) {
      toast.error('Erro ao remover pet.');
    }
  }

  return (
    <div className={wrapperClass}>
      <Seo
        title={pet?.name ? `${pet.name} para adoção` : 'Pet para adoção'}
        description={pet?.description?.slice(0, 160) || 'Conheça este pet disponível para adoção responsável no Viralata.'}
        image={pet?.photos?.[0]}
      />
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
              alt={pet.title || 'Foto do pet'}
              className="w-full h-full object-cover"
              fetchPriority={currentPhoto === 0 ? 'high' : 'auto'}
            />
          </div>
          {pet.photos?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pet.photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhoto(i)}
                  aria-label={`Ver foto ${i + 1} de ${pet.photos.length}`}
                  aria-pressed={i === currentPhoto}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === currentPhoto ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-[25px] font-extrabold tracking-[-0.01em] text-foreground">{pet.title || pet.name}</h1>
              {pet.status === 'adopted' && (
                <Badge variant="success">Adotado ✓</Badge>
              )}
              {pet.status === 'in_process' && (
                <Badge className="bg-highlight text-highlight-foreground">Em processo</Badge>
              )}
            </div>
            {pet.name && pet.title && <p className="text-[13px] text-muted-foreground">Nome: {pet.name}</p>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {pet.species && <Badge variant="secondary" className="text-[11.5px]">{SPECIES_LABEL[pet.species]}</Badge>}
            {pet.size && <Badge variant="secondary" className="text-[11.5px]">{SIZE_LABEL[pet.size]}</Badge>}
            {pet.age_group && <Badge variant="secondary" className="text-[11.5px]">{AGE_LABEL[pet.age_group]}</Badge>}
            {pet.gender && <Badge variant="secondary" className="text-[11.5px]">{pet.gender === 'male' ? 'Macho' : 'Fêmea'}</Badge>}
            {pet.breed && <Badge variant="secondary" className="text-[11.5px]">{pet.breed}</Badge>}
            {pet.neutered && <Badge variant="success" className="text-[11.5px]">Castrado</Badge>}
            {pet.vaccinated === 'yes' && <Badge variant="outline" className="text-[11.5px]">Vacinado</Badge>}
            {pet.dewormed && <Badge variant="outline" className="text-[11.5px]">Vermifugado</Badge>}
          </div>

          {(pet.city || pet.state) && (
            <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {[pet.city, pet.state].filter(Boolean).join(', ')}
            </div>
          )}

          {pet.health_notes && (
            <div className="bg-highlight/10 border border-highlight/30 rounded-2xl p-3.5 text-[13px] leading-[1.6] text-foreground">
              <strong>Observações de saúde:</strong> {pet.health_notes}
            </div>
          )}

          {pet.adoption_requirements && (
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-3.5 text-[13px] leading-[1.6] text-foreground">
              <strong>Requisitos para adoção:</strong> {pet.adoption_requirements}
            </div>
          )}

          {pet.adoption_form_url && (
            <a
              href={pet.adoption_form_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/[0.06] px-3.5 py-3 text-[13px] font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <FileText className="h-4 w-4" /> Preencher formulário de doação/adoção
            </a>
          )}

          {!canManage && pet.owner_id && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              {/* DS_V2: Avatar com iniciais (spec §3.9) */}
              <Avatar size="sm">
                <AvatarFallback>{ownerInitials(owner?.platform_name || owner?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-foreground">{owner?.platform_name || owner?.name || 'Responsável'}</div>
                <div className="text-[11.5px] text-muted-foreground">Responsável pelo pet</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                disabled={openingChat}
                aria-busy={openingChat}
                aria-label={`Conversar com ${owner?.platform_name || 'responsável'} pelo pet ${pet?.name || ''}`}
                className="shrink-0 gap-1.5"
              >
                <MessageCircle className="h-4 w-4" /> Conversar
              </Button>
            </div>
          )}

          {/* Ações */}
          {canManage ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/pets/${petId}/edit`}>Editar</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={deletePet.isPending}
                  aria-label="Excluir este pet"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={sharing || !pet.photos?.[0]}
                aria-busy={sharing}
                aria-label="Compartilhar este pet"
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {sharing ? 'Gerando imagem...' : 'Compartilhar'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={sharing || !pet.photos?.[0]}
                className="h-[54px] w-[52px] shrink-0 p-0"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              {pet.status === 'available' && !isOwner && pet.owner_type === 'organization' && (
                /* TASK-127: pets de abrigo usam o wizard formal de adoção
                   (application + termo v2 com hash). */
                <Button asChild className="h-[54px] flex-1 gap-2 text-[15px]">
                  <Link to={`/quero-adotar/${petId}`}>
                    <Heart className="h-[19px] w-[19px]" /> Quero adotar
                  </Link>
                </Button>
              )}
              {pet.status === 'available' && !isOwner && pet.owner_type !== 'organization' && (
                <Button
                  onClick={handleInterest}
                  disabled={alreadyInterested || createInterest.isPending}
                  className="h-[54px] flex-1 gap-2 text-[15px]"
                >
                  <Heart className="h-[19px] w-[19px]" />
                  {alreadyInterested ? 'Interesse já registrado' : 'Tenho Interesse em Adotar'}
                </Button>
              )}
              {isOwner && (
                <div className="h-[54px] flex-1 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-3 text-[13px] text-muted-foreground">
                  Você é o responsável — não pode adotar seu próprio pet.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Card explicativo: por que você não pode adotar/chat?
          Atrás da flag PET_ADOPTION_GATING. Mesmo com a flag OFF, as
          validações de permissão continuam ativas — a flag só controla
          este texto explicativo. */}
      {showAdoptionGating && !canManage && blockedReasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          <section className="arena-section-card border-highlight/50 bg-highlight/5">
            <div className="arena-section-card-body space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 text-highlight" />
                Por que não posso adotar ou conversar?
              </div>
              <ul className="space-y-1.5 text-[13px] text-muted-foreground">
                {blockedReasons.map((reason, idx) => (
                  <li key={idx} className="flex gap-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-highlight/80" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {pet.status === 'available' && !userProfile?.profile_completed && user && (
                <Button asChild variant="outline" size="sm" className="mt-1">
                  <Link to="/onboarding">Completar perfil de adotante</Link>
                </Button>
              )}
            </div>
          </section>
        </motion.div>
      )}

      {/* Painel de interessados (apenas para donos) */}
      {canManage && (
        <Tabs value={managementTab} onValueChange={setManagementTab} className="mt-6">
          <TabsList className="arena-tab-bar">
            <TabsTrigger value="interests" className="arena-tab-pill">Interessados</TabsTrigger>
            <TabsTrigger value="info" className="arena-tab-pill">Informações</TabsTrigger>
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

      {/* Formulário de adoção montado na plataforma (item 5) */}
      <AdoptionFormFill
        open={formOpen}
        onOpenChange={setFormOpen}
        form={pet.adoption_form}
        petTitle={pet.title || pet.name}
        submitting={createInterest.isPending}
        onSubmit={submitInterest}
      />

      {/* Nó oculto usado apenas para gerar a imagem de compartilhamento */}
      <div style={{ position: 'fixed', top: 0, left: '-99999px', pointerEvents: 'none' }} aria-hidden="true">
        <PetShareCard ref={shareCardRef} pet={pet} shareUrl={`${window.location.origin}/pets/${petId}`} />
      </div>
    </div>
  );
}
