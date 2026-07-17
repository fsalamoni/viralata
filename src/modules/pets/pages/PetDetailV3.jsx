/**
 * @fileoverview PetDetailV3 — redesign completo do /pets/:petId (V3).
 *
 * TASK-V3-PET-DETAIL (TASK-927..): substitui o PetDetail V1.
 *
 * Melhorias vs V1:
 *  - Breadcrumb (PetBreadcrumb)
 *  - Galeria com swipe + thumbs + zoom + aspect 3:4 (PetGallery)
 *  - Favoritar persistente (PetFavoriteButton)
 *  - Reportar (PetReportButton)
 *  - Mapa com pin da cidade (PetMap)
 *  - Pets similares em carrossel (PetSimilar)
 *  - Temperamento com ícones (PetTemperament)
 *  - Timeline de eventos (PetTimeline)
 *  - Sumário de avaliação (PetRatingSummary)
 *  - Sticky CTA em mobile (PetStickyCta)
 *  - "Sobre mim" com Collapsible
 *  - Dark mode otimizado (saturate nas fotos)
 *  - Compact mode (prefs)
 *  - Empty/Error/Skeleton específicos
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md (regência completa)
 */
import React, { useRef, useState } from 'react';
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
import { usePetShareImage } from '../hooks/usePetShareImage';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useUiPreferences } from '@/core/hooks/useUiPreferences';
import { useColorMode } from '@/core/hooks/useColorMode';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';
import { getOrCreateDirectConversation } from '@/modules/chat/services/chatService';
import InterestPanel from '../components/InterestPanel';
import RatingForm from '../components/RatingForm';
import PetShareCard from '../components/PetShareCard';
import AdoptionFormFill from '../components/AdoptionFormFill';
import PetDetailSkeleton from '../components/PetDetailSkeleton';
import PetNotFound from '../components/PetNotFound';
import { PetGallery } from '../components/PetGallery';
import { PetBreadcrumb } from '@/components/ui/pet-breadcrumb';
import { PetMap } from '../components/PetMap';
import { PetSimilar } from '../components/PetSimilar';
import { PetTemperament } from '../components/PetTemperament';
import { PetFavoriteButton } from '../components/PetFavoriteButton';
import { PetReportButton } from '../components/PetReportButton';
import { PetTimeline } from '../components/PetTimeline';
import { PetRatingSummary } from '../components/PetRatingSummary';
import { PetStickyCta } from '../components/PetStickyCta';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Skeleton } from '@/components/ui/skeleton';
import { hasQuestions } from '../domain/adoptionForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Heart, MapPin, Trash2, Share2, MessageCircle,
  FileText, Eye, Calendar, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { cn } from '@/core/lib/utils';

const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };
const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };
const ENERGY_LABEL = { low: 'Baixa', medium: 'Média', high: 'Alta' };

function useOwnerProfile(ownerId, enabled) {
  return useQuery({
    queryKey: ['users', ownerId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'users', ownerId));
      return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
    },
    enabled: Boolean(ownerId) && Boolean(enabled),
    staleTime: 1000 * 60 * 5,
  });
}

function ownerInitials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default function PetDetailV3() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const { data: pet, isLoading } = usePet(petId);
  const { data: alreadyInterested } = useHasInterest(petId, user?.uid);
  const createInterest = useCreateInterest();
  const completeAdoption = useCompleteAdoption();
  const deletePet = useDeletePet();
  const [formOpen, setFormOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const { data: owner } = useOwnerProfile(pet?.owner_id, Boolean(user));
  const [uiPrefs] = useUiPreferences();
  const { isDark } = useColorMode();
  const reduceMotion = useReducedMotionSafe();
  const compact = Boolean(uiPrefs?.compactMode);

  const isOwner = user?.uid === pet?.owner_id;
  const isAdopter = user?.uid === pet?.adopted_by;
  const ratedUid = isAdopter ? pet?.owner_id : pet?.adopted_by;
  const canRate = pet?.status === 'adopted' && (isOwner || isAdopter) && Boolean(ratedUid);
  const { data: myRating } = useMyRatingForPet(canRate ? petId : null, user?.uid);
  const createRating = useCreateRating();
  const shareCardRef = useRef(null);
  const { shareFromNode, generating: sharing } = usePetShareImage();

  const petPermissions = usePetPermissions(pet);
  const canManage = petPermissions.canEdit;
  const managementTab = searchParams.get('tab') === 'info' ? 'info' : 'interests';

  if (isLoading) return <PetDetailSkeleton />;
  if (!pet) return <PetNotFound petId={petId} />;

  // Blocos de bloqueio (explicação quando user não pode agir)
  const blockedReasons = [];
  if (isOwner) {
    blockedReasons.push('Você é o responsável por este pet.');
  }
  if (pet.status === 'adopted') {
    blockedReasons.push('Este pet já foi adotado.');
  } else if (pet.status === 'in_process') {
    blockedReasons.push('Este pet está em processo de adoção.');
  }
  if (!user) {
    blockedReasons.push('Faça login para demonstrar interesse.');
  } else if (userProfile && userProfile.profile_completed === false) {
    blockedReasons.push('Complete seu perfil de adotante.');
  }
  if (alreadyInterested) {
    blockedReasons.push('Você já demonstrou interesse neste pet.');
  }

  const petName = pet.title || pet.name || 'este pet';
  const hasInterest = pet.status === 'available' && !isOwner;
  const isOrg = pet.owner_type === 'organization';

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
      toast.error('Você é o responsável — sem conversa a iniciar.');
      return;
    }
    if (pet.status !== 'available') {
      toast.error('Pet não disponível para nova conversa.');
      return;
    }
    setOpeningChat(true);
    try {
      const other = {
        uid: pet.owner_id,
        name: owner?.platform_name || owner?.name || 'Responsável',
        photo_url: owner?.photo_url || '',
      };
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

  const wrapperClass = useArenaPageClasses(
    cn(
      'arena-page max-w-5xl mx-auto px-4 py-5 pb-24 sm:pb-12 space-y-6',
      compact && 'py-3 space-y-4',
    ),
  );

  return (
    <div className={wrapperClass}>
      <Seo
        title={pet?.name ? `${pet.name} para adoção` : 'Pet para adoção'}
        description={pet?.description?.slice(0, 160) || 'Conheça este pet disponível para adoção responsável no Viralata.'}
        image={pet?.photos?.[0]}
      />

      {/* Breadcrumb + Ações topo */}
      <div className="flex items-center justify-between gap-3">
        <PetBreadcrumb petTitle={petName} />
        <div className="flex shrink-0 items-center gap-2">
          <PetFavoriteButton petId={petId} size="sm" />
          <PetReportButton petId={petId} petName={petName} />
        </div>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
      >
        {/* Coluna galeria + meta rápida (sticky em md+) */}
        <div className="space-y-3 md:sticky md:top-20 md:self-start">
          <PetGallery photos={pet.photos || []} petName={petName} />

          {/* Temperamento logo abaixo da galeria */}
          {Array.isArray(pet.temperament) && pet.temperament.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Temperamento
              </h3>
              <PetTemperament traits={pet.temperament} />
            </div>
          )}

          {/* Sumário de avaliação (se houver) */}
          {pet.rating_summary?.count > 0 && (
            <PetRatingSummary
              rating={pet.rating_summary.average}
              count={pet.rating_summary.count}
            />
          )}
        </div>

        {/* Coluna info */}
        <div className="space-y-4">
          {/* Título + status + espécie */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-foreground">
                  {pet.title || pet.name}
                </h1>
                {pet.name && pet.title && pet.name !== pet.title && (
                  <p className="text-[13px] text-muted-foreground">Nome: {pet.name}</p>
                )}
              </div>
              {pet.status === 'adopted' && <Badge variant="success">Adotado ✓</Badge>}
              {pet.status === 'in_process' && (
                <Badge className="bg-highlight text-highlight-foreground">Em processo</Badge>
              )}
            </div>
          </div>

          {/* Badges principais */}
          <div className="flex flex-wrap gap-1.5">
            {pet.species && <Badge variant="secondary" className="text-[11.5px]">{SPECIES_LABEL[pet.species]}</Badge>}
            {pet.size && <Badge variant="secondary" className="text-[11.5px]">{SIZE_LABEL[pet.size]}</Badge>}
            {pet.age_group && <Badge variant="secondary" className="text-[11.5px]">{AGE_LABEL[pet.age_group]}</Badge>}
            {pet.gender && (
              <Badge variant="secondary" className="text-[11.5px]">
                {pet.gender === 'male' ? 'Macho' : 'Fêmea'}
              </Badge>
            )}
            {pet.breed && <Badge variant="secondary" className="text-[11.5px]">{pet.breed}</Badge>}
            {pet.energy_level && (
              <Badge variant="outline" className="text-[11.5px]">
                <Activity className="mr-1 h-3 w-3" /> Energia: {ENERGY_LABEL[pet.energy_level]}
              </Badge>
            )}
            {pet.neutered && <Badge variant="success" className="text-[11.5px]">Castrado</Badge>}
            {pet.vaccinated === 'yes' && <Badge variant="outline" className="text-[11.5px]">Vacinado</Badge>}
            {pet.dewormed && <Badge variant="outline" className="text-[11.5px]">Vermifugado</Badge>}
          </div>

          {/* Localização + mapa */}
          {(pet.city || pet.state) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {[pet.city, pet.state].filter(Boolean).join(', ')}
              </div>
              <PetMap city={pet.city} state={pet.state} />
            </div>
          )}

          {/* Sobre mim (Collapsible) */}
          {pet.description && (
            <CollapsibleCard
              title={`Sobre ${pet.name || 'este pet'}`}
              subtitle="Personalidade e história"
              defaultOpen
              testId="pet-about-collapsible"
            >
              <p className="whitespace-pre-line text-[13.5px] leading-[1.7] text-foreground">
                {pet.description}
              </p>
            </CollapsibleCard>
          )}

          {/* Saúde */}
          {(pet.health_notes || pet.special_needs) && (
            <CollapsibleCard
              title="Saúde e cuidados"
              subtitle="Informações veterinárias"
              testId="pet-health-collapsible"
            >
              {pet.health_notes && (
                <div className="mb-3 rounded-2xl border border-highlight/30 bg-highlight/10 p-3.5 text-[13px] leading-[1.6] text-foreground">
                  <strong>Observações:</strong> {pet.health_notes}
                </div>
              )}
              {pet.special_needs && (
                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-[13px] leading-[1.6] text-foreground">
                  <strong>Necessidades especiais:</strong> {pet.special_needs}
                </div>
              )}
              {/* Datas de castração/vacina (se existirem) */}
              {(pet.neutered_date || pet.last_vaccination_date) && (
                <div className="mt-3 space-y-1 text-[12px] text-muted-foreground">
                  {pet.neutered_date && (
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Castrado em: {pet.neutered_date}
                    </p>
                  )}
                  {pet.last_vaccination_date && (
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Última vacinação: {pet.last_vaccination_date}
                    </p>
                  )}
                </div>
              )}
            </CollapsibleCard>
          )}

          {/* Requisitos */}
          {pet.adoption_requirements && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-[13px] leading-[1.6] text-foreground">
              <strong>Requisitos para adoção:</strong> {pet.adoption_requirements}
            </div>
          )}

          {/* Formulário externo */}
          {pet.adoption_form_url && (
            <a
              href={pet.adoption_form_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/[0.06] px-3.5 py-3 text-[13px] font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <FileText className="h-4 w-4" /> Preencher formulário de adoção
            </a>
          )}

          {/* Timeline (se houver eventos) */}
          {Array.isArray(pet.events) && pet.events.length > 0 && (
            <PetTimeline events={pet.events} />
          )}

          {/* Contador de visualizações (discreto) */}
          {pet.view_count > 0 && (
            <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground/70">
              <Eye className="h-3 w-3" />
              {pet.view_count} {pet.view_count === 1 ? 'pessoa viu' : 'pessoas viram'} este pet
            </div>
          )}

          {/* Responsável */}
          {!canManage && pet.owner_id && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <Avatar size="sm">
                <AvatarFallback>{ownerInitials(owner?.platform_name || owner?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-foreground">
                  {owner?.platform_name || owner?.name || 'Responsável'}
                </div>
                <div className="text-[11.5px] text-muted-foreground">Responsável pelo pet</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                disabled={openingChat}
                aria-busy={openingChat}
                className="shrink-0 gap-1.5"
              >
                <MessageCircle className="h-4 w-4" /> Conversar
              </Button>
            </div>
          )}

          {/* Ações (desktop) */}
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
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {sharing ? 'Gerando imagem...' : 'Compartilhar'}
              </Button>
            </div>
          ) : (
            <div className="hidden gap-2.5 pt-2 sm:flex">
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={sharing || !pet.photos?.[0]}
                className="h-[54px] w-[52px] shrink-0 p-0"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              {isOrg ? (
                <Button asChild className="h-[54px] flex-1 gap-2 text-[15px]">
                  <Link to={`/quero-adotar/${petId}`}>
                    <Heart className="h-[19px] w-[19px]" /> Quero adotar
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={handleInterest}
                  disabled={alreadyInterested || createInterest.isPending}
                  className="h-[54px] flex-1 gap-2 text-[15px]"
                >
                  <Heart className="h-[19px] w-[19px]" />
                  {alreadyInterested ? 'Interesse já registrado' : 'Tenho Interesse em Adotar'}
                </Button>
              )}
            </div>
          )}

          {/* Card explicativo de bloqueio (sempre visível, sem flag) */}
          {!canManage && blockedReasons.length > 0 && (
            <section className="rounded-2xl border border-highlight/40 bg-highlight/5 p-3.5">
              <div className="mb-2 text-[12.5px] font-bold text-foreground">
                Por que não posso adotar?
              </div>
              <ul className="space-y-1 text-[12px] text-muted-foreground">
                {blockedReasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-highlight">•</span> {r}
                  </li>
                ))}
              </ul>
              {pet.status === 'available' && !userProfile?.profile_completed && user && (
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link to="/onboarding">Completar perfil de adotante</Link>
                </Button>
              )}
            </section>
          )}
        </div>
      </motion.div>

      {/* Pets similares */}
      {pet.owner_id && (
        <PetSimilar ownerId={pet.owner_id} excludePetId={petId} className="mt-8" />
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

      {/* Formulário de adoção montado na plataforma */}
      <AdoptionFormFill
        open={formOpen}
        onOpenChange={setFormOpen}
        form={pet.adoption_form}
        petTitle={petName}
        submitting={createInterest.isPending}
        onSubmit={submitInterest}
      />

      {/* Sticky CTA mobile */}
      {!canManage && hasInterest && (
        <PetStickyCta
          primaryAction={
            isOrg
              ? { label: 'Quero adotar', icon: Heart, onClick: () => navigate(`/quero-adotar/${petId}`) }
              : {
                  label: alreadyInterested ? 'Interesse registrado' : 'Tenho Interesse',
                  icon: Heart,
                  onClick: handleInterest,
                  disabled: alreadyInterested || createInterest.isPending,
                  ariaBusy: createInterest.isPending,
                }
          }
          secondaryAction={
            !isOwner && {
              label: 'Conversar',
              icon: MessageCircle,
              onClick: handleOpenChat,
              disabled: openingChat,
              ariaBusy: openingChat,
            }
          }
        />
      )}

      {/* Nó oculto para gerar imagem de compartilhamento */}
      <div
        style={{ position: 'fixed', top: 0, left: '-99999px', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <PetShareCard ref={shareCardRef} pet={pet} shareUrl={`${window.location.origin}/pets/${petId}`} />
      </div>
    </div>
  );
}
