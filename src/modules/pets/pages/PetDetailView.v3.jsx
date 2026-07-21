/**
 * @fileoverview PetDetailView V3 — PÁGINA PÚBLICA de visualização de um pet
 * (TASK-V3-PET-DETAIL-VIEW, 2026-07-20).
 *
 * **PROPÓSITO**: Apresentar o pet de forma COMPLETA, ATRATIVA e SIMPLES para
 * que o visitante se interesse e queira adotar. É uma página de marketing
 * emocional — o pet é o protagonista.
 *
 * **NÃO TEM ABAS**: tudo cabe em uma página só, organizado em seções
 * verticais, com sticky CTA no mobile.
 *
 * **SEM BOTÕES DE EDIÇÃO/EXCLUSÃO** (CRÍTICO):
 * - Esses botões SÓ aparecem na rota `/pets/:petId` (plural) — a página
 *   de ADMIN (PetDetailV3). Aqui, usuário anônimo ou comum vê SÓ
 *   conteúdo público.
 * - Apenas o botão "Administrar" aparece, e SOMENTE para quem tem
 *   permissão de gestão do pet (canManage via usePetPermissions).
 *   Esse botão leva para a página de admin (`/pets/:petId`).
 *
 * **QUEM PODE VER**:
 * - Qualquer visitante, autenticado ou não.
 * - A rota é `/pet/:petId` (singular, sem 's') — PÚBLICA.
 *
 * **QUEM PODE "ADMINISTRAR"** (botão visível):
 * - Criador do pet (owner_id === user.uid)
 * - Membro do abrigo vinculado (canManage via usePetPermissions)
 * - Platform admin
 *
 * **O QUE A PÁGINA MOSTRA** (público, LGPD Art. 7 §1):
 * 1. Hero com foto em destaque + badges (espécie/idade/sexo/cidade)
 * 2. Identidade do pet (nome, descrição emocional)
 * 3. Características (espécie, porte, idade, sexo, localização)
 * 4. Saúde pública (vacinação, castração, vermifugação)
 * 5. Personalidade / temperamento (se houver)
 * 6. Requisitos do lar ideal
 * 7. Sobre (descrição completa)
 * 8. Abrigo / Responsável (se ONG)
 * 9. CTAs de ação (Quero adotar / Falar / Compartilhar)
 * 10. Botão "Administrar" (só para canManage)
 * 11. Sticky CTA no mobile
 * 12. Botão de reportar (LGPD / mau uso)
 *
 * **DADOS SENSÍVEIS NUNCA EXPOSTOS**:
 * - clinical_notes (apenas para admin)
 * - histórico médico completo (apenas admin)
 * - localização exata do resgate (apenas cidade/UF)
 * - informações do tutor original (LGPD)
 * - Lista de interessados (apenas admin)
 *
 * @see docs/REGENCY_PET_DETAIL_VIEW_V3.md
 * @see src/modules/pets/hooks/usePetPermissions.js
 * @see src/modules/pets/pages/PetDetailV3.jsx (página de ADMIN)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePetPermissions } from '../hooks/usePetPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Seo from '@/components/Seo';
import SocialShare from '@/components/SocialShare';
import { Lightbox } from '@/components/Lightbox';
import { cn } from '@/core/lib/utils';
import { toast } from 'sonner';
import {
  Heart, MapPin, MessageCircle, Share2, ArrowLeft, PawPrint, Info, Users,
  CheckCircle2, XCircle, Building2, Maximize2, Shield,
  Sparkles, Stethoscope, Cake, Ruler, Weight, Star, AlertTriangle,
  ChevronRight, ShieldCheck, Home, ArrowUpRight, Lock, Clock,
} from 'lucide-react';

// ============================================================================
// CONSTANTS — labels PT-BR para o esquema do pet
// ============================================================================

const SIZE_LABEL = {
  mini: 'Mini',
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
  giant: 'Gigante',
};

const AGE_LABEL = {
  puppy: 'Filhote',
  young: 'Jovem',
  adult: 'Adulto',
  senior: 'Idoso',
};

const SPECIES_LABEL = {
  dog: 'Cachorro',
  cat: 'Gato',
  rabbit: 'Coelho',
  bird: 'Pássaro',
  other: 'Outro',
};

const SPECIES_EMOJI = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  bird: '🦜',
  other: '🐾',
};

const GENDER_LABEL = {
  male: 'Macho',
  female: 'Fêmea',
};

const STATUS = {
  available: { label: 'Disponível', color: 'bg-emerald-500/95 text-white border-emerald-400', dot: 'bg-emerald-400' },
  in_process: { label: 'Em processo', color: 'bg-amber-500/95 text-white border-amber-400', dot: 'bg-amber-400' },
  adopted: { label: 'Adotado', color: 'bg-slate-500/95 text-white border-slate-400', dot: 'bg-slate-300' },
  unavailable: { label: 'Indisponível', color: 'bg-rose-500/95 text-white border-rose-400', dot: 'bg-rose-300' },
};

const ANIM = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const STAGGER = {
  show: { transition: { staggerChildren: 0.08 } },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PetDetailViewV3() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  // ─── STATE ─────────────────────────────────────────────────────────
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null); // abrigo se for pet de ONG
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ─── PERMISSIONS — usePetPermissions (defense-in-depth) ────────────
  const petPermissions = usePetPermissions(pet);
  const canManage = petPermissions.canEdit; // só aparece o botão Administrar

  // ─── LOAD PET + OWNER ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const snap = await getDoc(doc(db, 'pets', petId));
        if (!alive) return;
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setPet(data);

        // Carrega owner (se for organização) — é informação PÚBLICA
        if (data.owner_type === 'organization' && data.owner_id) {
          try {
            const orgSnap = await getDoc(doc(db, 'clubs', data.owner_id));
            if (alive && orgSnap.exists()) {
              setOwner({ id: orgSnap.id, ...orgSnap.data() });
            }
          } catch {
            // owner não é crítico
          }
        }
        // Se for pet pessoal, NÃO carregamos user profile (regra users é autenticada)
      } catch (err) {
        console.error('[PetDetailViewV3] erro:', err);
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [petId]);

  // ─── DERIVED DATA (memorizado, ANTES dos early-returns) ────────────
  const photos = useMemo(
    () => (pet && Array.isArray(pet.photos) && pet.photos.length > 0
      ? pet.photos
      : pet && pet.photo_url
        ? [pet.photo_url]
        : []),
    [pet],
  );
  const publicIds = useMemo(() => {
    if (!pet) return [];
    const ids = [];
    if (pet.pet_code) ids.push({ label: 'Código', value: pet.pet_code });
    // Microchip é informação que pode ajudar matching, mas não é sensível
    if (pet.microchip) ids.push({ label: 'Microchip', value: pet.microchip });
    return ids;
  }, [pet]);

  // ─── HANDLERS ──────────────────────────────────────────────────────
  const handleAdoptClick = useCallback(() => {
    if (!user) {
      sessionStorage.setItem('postLoginRedirect', `/quero-adotar/${petId}`);
      navigate('/login');
      return;
    }
    navigate(`/quero-adotar/${petId}`);
  }, [user, petId, navigate]);

  const handleChatClick = useCallback(() => {
    if (!user) {
      sessionStorage.setItem('postLoginRedirect', `/pet/${petId}`);
      navigate('/login');
      toast.info('Faça login para falar com o abrigo.');
      return;
    }
    // SEMPRE usa o chat geral (com petId no query). Anteriormente ia para
    // /pets/<id> (admin) que dependia de canManage e dava flash. Agora vai
    // direto para o chat — funciona para pet pessoal e de ONG.
    navigate(`/chat?pet=${petId}`);
  }, [user, petId, navigate]);

  const handleAdminClick = useCallback(() => {
    // SEMPRE vai para a página de admin
    navigate(`/pets/${petId}`);
  }, [petId, navigate]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/pet/${petId}`;
    const title = pet?.title || pet?.name || 'Conheça este pet';
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} — disponível para adoção no Viralata!`,
          url,
        });
      } catch {
        // user cancelou
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado para a área de transferência!');
      } catch {
        toast.error('Não foi possível copiar o link.');
      }
    }
  }, [petId, pet]);

  // ─── LOADING STATE ─────────────────────────────────────────────────
  if (loading) {
    return <PetDetailViewSkeleton />;
  }

  // ─── NOT FOUND ─────────────────────────────────────────────────────
  if (notFound || !pet) {
    return <PetNotFoundView />;
  }

  // ─── DERIVED DATA ─────────────────────────────────────────────────
  const currentPhotoUrl = photos[currentPhoto] || photos[0];
  const statusInfo = pet ? (STATUS[pet.status] || STATUS.available) : STATUS.available;
  const speciesEmoji = pet ? (SPECIES_EMOJI[pet.species] || '🐾') : '🐾';
  const speciesLabel = pet ? (SPECIES_LABEL[pet.species] || 'Pet') : 'Pet';
  const isOrg = pet ? pet.owner_type === 'organization' : false;
  const isAdopted = pet ? pet.status === 'adopted' : false;
  const isInProcess = pet ? pet.status === 'in_process' : false;

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="arena-page min-h-screen bg-background" data-testid="pet-detail-view">
      <Seo
        title={`${pet.title || pet.name || 'Pet'} — Viralata`}
        description={`${speciesEmoji} ${speciesLabel} para adoção em ${pet.city || 'Brasil'}. ${pet.description?.slice(0, 140) || 'Conheça no Viralata.'}`}
        image={currentPhotoUrl}
        url={`/pet/${petId}`}
        type="article"
      />

      {/* ─── HERO — Capa + Identidade ───────────────────────────── */}
      <PetDetailViewHero
        pet={pet}
        photos={photos}
        currentPhoto={currentPhoto}
        setCurrentPhoto={setCurrentPhoto}
        currentPhotoUrl={currentPhotoUrl}
        statusInfo={statusInfo}
        speciesEmoji={speciesEmoji}
        speciesLabel={speciesLabel}
        reduceMotion={reduceMotion}
        onOpenLightbox={() => setLightboxOpen(true)}
        onBack={() => navigate(-1)}
        onShare={handleShare}
      />

      {/* ─── BODY: Grid 2 colunas (desktop) / 1 coluna (mobile) ─── */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* COLUNA PRINCIPAL (2/3) */}
          <motion.main
            initial={reduceMotion ? false : 'hidden'}
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={STAGGER}
            className="space-y-6 lg:col-span-2"
          >
            {/* Identidade do pet */}
            <motion.section variants={ANIM}>
              <PetIdentityCard
                pet={pet}
                statusInfo={statusInfo}
                speciesEmoji={speciesEmoji}
                speciesLabel={speciesLabel}
                publicIds={publicIds}
              />
            </motion.section>

            {/* Sobre / descrição */}
            {pet.description && (
              <motion.section variants={ANIM}>
                <PetAboutCard description={pet.description} />
              </motion.section>
            )}

            {/* Personalidade / temperamento */}
            {(pet.temperament || pet.personality) && (
              <motion.section variants={ANIM}>
                <PetTemperamentCard
                  temperament={pet.temperament || pet.personality}
                />
              </motion.section>
            )}

            {/* Saúde pública */}
            <motion.section variants={ANIM}>
              <PetHealthCard pet={pet} />
            </motion.section>

            {/* Requisitos do lar ideal */}
            <motion.section variants={ANIM}>
              <PetRequirementsCard pet={pet} />
            </motion.section>

            {/* CTAs de ação — desktop */}
            <motion.section variants={ANIM} className="hidden lg:block">
              <PetCtaCard
                pet={pet}
                canManage={canManage}
                isAdopted={isAdopted}
                isInProcess={isInProcess}
                onAdopt={handleAdoptClick}
                onChat={handleChatClick}
                onAdmin={handleAdminClick}
                onShare={handleShare}
                user={user}
              />
            </motion.section>
          </motion.main>

          {/* COLUNA LATERAL (1/3) */}
          <motion.aside
            initial={reduceMotion ? false : 'hidden'}
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={STAGGER}
            className="space-y-6"
          >
            {/* Abrigo (se for ONG) */}
            {isOrg && owner && (
              <motion.section variants={ANIM}>
                <OwnerCard owner={owner} petId={petId} />
              </motion.section>
            )}

            {/* Localização */}
            {(pet.city || pet.state) && (
              <motion.section variants={ANIM}>
                <PetLocationCard pet={pet} />
              </motion.section>
            )}

            {/* Características rápidas */}
            <motion.section variants={ANIM}>
              <PetQuickFactsCard pet={pet} />
            </motion.section>

            {/* ID público */}
            {publicIds.length > 0 && (
              <motion.section variants={ANIM}>
                <PetIdCard ids={publicIds} />
              </motion.section>
            )}

            {/* Trust badge LGPD */}
            <motion.section variants={ANIM}>
              <PetTrustBadge />
            </motion.section>

            {/* Report button */}
            <motion.section variants={ANIM}>
              <div className="text-center">
                <Link
                  to={`/denuncias/nova?pet=${petId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Reportar este anúncio
                </Link>
              </div>
            </motion.section>
          </motion.aside>
        </div>

        {/* CTAs de ação — mobile (sempre após o grid) */}
        <motion.section
          initial={reduceMotion ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          variants={ANIM}
          className="mt-6 lg:hidden"
        >
          <PetCtaCard
            pet={pet}
            canManage={canManage}
            isAdopted={isAdopted}
            isInProcess={isInProcess}
            onAdopt={handleAdoptClick}
            onChat={handleChatClick}
            onAdmin={handleAdminClick}
            onShare={handleShare}
            user={user}
          />
        </motion.section>
      </div>

      {/* ─── STICKY CTA (mobile) ──────────────────────────────────── */}
      {!reduceMotion && (
        <PetStickyCtaView
          pet={pet}
          canManage={canManage}
          isAdopted={isAdopted}
          isInProcess={isInProcess}
          onAdopt={handleAdoptClick}
          onChat={handleChatClick}
          onAdmin={handleAdminClick}
        />
      )}

      {/* ─── LIGHTBOX ─────────────────────────────────────────────── */}
      <Lightbox
        images={photos.map((url, i) => ({
          url,
          alt: pet.title || pet.name || `Foto ${i + 1}`,
        }))}
        open={lightboxOpen && photos.length > 0}
        index={currentPhoto}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setCurrentPhoto}
      />
    </div>
  );
}

// ============================================================================
// HERO
// ============================================================================

function PetDetailViewHero({
  pet, photos, currentPhoto, setCurrentPhoto, currentPhotoUrl,
  statusInfo, speciesEmoji, speciesLabel, reduceMotion, onOpenLightbox, onBack, onShare,
}) {
  return (
    <section
      className="relative isolate overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/30"
      data-testid="pet-detail-hero"
    >
      {/* Botão voltar + share (topo) */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="rounded-full bg-white/70 backdrop-blur hover:bg-white/90 dark:bg-slate-900/60"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Voltar</span>
        </Button>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            className="rounded-full bg-white/70 backdrop-blur hover:bg-white/90 dark:bg-slate-900/60"
            aria-label="Compartilhar"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <SocialShare
            kind="pet"
            id={pet.id}
            title={pet.title || pet.name || 'Conheça este pet'}
            description={pet.description?.slice(0, 140)}
            variant="icon"
          />
        </div>
      </div>

      {/* Capa principal */}
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-3 sm:px-6 sm:pb-10 sm:pt-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-3xl bg-muted shadow-2xl ring-1 ring-black/5 sm:aspect-[16/10]"
        >
          {currentPhotoUrl ? (
            <button
              type="button"
              onClick={onOpenLightbox}
              className="block h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`Ampliar foto de ${pet.title || pet.name || 'pet'}`}
            >
              <img
                src={currentPhotoUrl}
                alt={pet.title || pet.name || 'Pet'}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                loading="eager"
              />
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-100 via-amber-100 to-orange-100 dark:from-rose-950/50 dark:via-amber-950/50 dark:to-orange-950/50">
              <span className="text-9xl">{speciesEmoji}</span>
            </div>
          )}

          {/* Status badge (canto superior esquerdo) */}
          <Badge className={cn('absolute left-3 top-3 border backdrop-blur-sm sm:left-4 sm:top-4', statusInfo.color)}>
            <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', statusInfo.dot)} />
            {statusInfo.label}
          </Badge>

          {/* Lightbox hint */}
          {currentPhotoUrl && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4">
              <Maximize2 className="h-3 w-3" /> Ampliar
            </span>
          )}
        </motion.div>

        {/* Thumbs */}
        {photos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:gap-2.5">
            {photos.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPhoto(i)}
                className={cn(
                  'flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                  i === currentPhoto
                    ? 'border-primary shadow-md ring-2 ring-primary/20'
                    : 'border-transparent opacity-70 hover:opacity-100',
                )}
                aria-label={`Foto ${i + 1}`}
              >
                <img
                  src={url}
                  alt=""
                  className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// CARDS
// ============================================================================

function PetIdentityCard({ pet, statusInfo, speciesEmoji, speciesLabel, publicIds }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="pet-identity">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-orange-500/20 text-2xl">
          {speciesEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
            {pet.title || pet.name || 'Pet'}
          </h1>
          {pet.name && pet.title && (
            <p className="mt-0.5 text-base font-semibold text-muted-foreground">
              {pet.name}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{speciesLabel}</span>
            {pet.breed && (
              <>
                <span>·</span>
                <span>{pet.breed}</span>
              </>
            )}
            {pet.size && (
              <>
                <span>·</span>
                <span>{SIZE_LABEL[pet.size] || pet.size}</span>
              </>
            )}
            {pet.age_group && (
              <>
                <span>·</span>
                <span>{AGE_LABEL[pet.age_group] || pet.age_group}</span>
              </>
            )}
            {pet.gender && (
              <>
                <span>·</span>
                <span>{GENDER_LABEL[pet.gender] || pet.gender}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chips rápidos */}
      <div className="mt-4 flex flex-wrap gap-2">
        {pet.city && (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="h-3 w-3" /> {pet.city}{pet.state ? `, ${pet.state}` : ''}
          </Badge>
        )}
        {pet.age_months != null && (
          <Badge variant="secondary" className="gap-1">
            <Cake className="h-3 w-3" />
            {pet.age_months < 12
              ? `${pet.age_months} meses`
              : `${Math.floor(pet.age_months / 12)} ${Math.floor(pet.age_months / 12) === 1 ? 'ano' : 'anos'}`}
          </Badge>
        )}
        {pet.weight_kg && (
          <Badge variant="secondary" className="gap-1">
            <Weight className="h-3 w-3" /> {pet.weight_kg} kg
          </Badge>
        )}
        {pet.color && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> {pet.color}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PetAboutCard({ description }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="pet-about">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
        <Info className="h-4 w-4 text-primary" />
        Sobre
      </h2>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
        {description}
      </p>
    </div>
  );
}

function PetTemperamentCard({ temperament }) {
  // temperament pode ser: array de strings, ou string única
  const traits = Array.isArray(temperament)
    ? temperament
    : typeof temperament === 'string'
      ? temperament.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : [];

  if (traits.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="pet-temperament">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
        <Sparkles className="h-4 w-4 text-amber-500" />
        Personalidade
      </h2>
      <div className="flex flex-wrap gap-2">
        {traits.map((trait, i) => (
          <Badge
            key={i}
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <Star className="mr-1 h-3 w-3" />
            {trait}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PetHealthCard({ pet }) {
  const hasAnyHealth = pet.vaccinated !== undefined || pet.neutered !== undefined || pet.dewormed !== undefined;
  if (!hasAnyHealth) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="pet-health">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
        <Stethoscope className="h-4 w-4 text-emerald-600" />
        Saúde
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <HealthBadge
          ok={pet.vaccinated === 'yes'}
          partial={pet.vaccinated === 'partial'}
          label="Vacinação"
        />
        <HealthBadge ok={pet.neutered === true} label="Castrado" />
        <HealthBadge ok={pet.dewormed === true} label="Vermifugado" />
      </div>
      {pet.health_notes_public && (
        <p className="mt-3 text-sm text-muted-foreground">
          {pet.health_notes_public}
        </p>
      )}
    </div>
  );
}

function HealthBadge({ ok, partial, label }) {
  let Icon = XCircle;
  let bgClass = 'bg-slate-50 border-slate-200 text-slate-600';
  let text = 'Não informado';
  if (ok) {
    Icon = CheckCircle2;
    bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
    text = 'Em dia';
  } else if (partial) {
    Icon = AlertTriangle;
    bgClass = 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
    text = 'Parcial';
  }
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border p-3', bgClass)}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-bold">{text}</p>
      </div>
    </div>
  );
}

function PetRequirementsCard({ pet }) {
  const reqs = useMemo(() => {
    const list = [];
    if (pet.needs_yard) list.push({ icon: Home, text: 'Precisa de quintal ou espaço amplo' });
    if (pet.needs_screened_apt) list.push({ icon: Shield, text: 'Apartamento precisa ter telas de segurança' });
    if (pet.good_with_kids === false) list.push({ icon: Users, text: 'Sem crianças pequenas na casa' });
    if (pet.good_with_dogs === false) list.push({ icon: XCircle, text: 'Sem outros cachorros' });
    if (pet.good_with_cats === false) list.push({ icon: XCircle, text: 'Sem gatos na casa' });
    if (pet.experience_required) list.push({ icon: Sparkles, text: 'Tutor com experiência prévia recomendada' });
    if (pet.time_commitment) list.push({ icon: Clock4, text: `Disponibilidade: ${pet.time_commitment}` });
    if (list.length === 0) {
      list.push({ icon: CheckCircle2, text: 'Adapta-se bem a diferentes lares' });
    }
    return list;
  }, [pet]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="pet-requirements">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
        <Home className="h-4 w-4 text-sky-600" />
        Lar ideal
      </h2>
      <ul className="space-y-2">
        {reqs.map((req, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <req.icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
            <span>{req.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PetCtaCard({ pet, canManage, isAdopted, isInProcess, onAdopt, onChat, onAdmin, onShare, user }) {
  return (
    <div
      className="rounded-2xl border border-border bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 p-5 shadow-sm dark:from-rose-950/20 dark:via-amber-950/20 dark:to-orange-950/20 sm:p-6"
      data-testid="pet-cta"
    >
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
        <Sparkles className="h-4 w-4 text-amber-500" />
        {isAdopted ? 'Pet já foi adotado' : 'Quer conhecer melhor?'}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {isAdopted
          ? 'Este pet já encontrou um lar. Continue procurando no feed — temos muitos outros esperando.'
          : 'Entre em contato com o responsável. Adoption responsável começa com uma boa conversa.'}
      </p>

      <div className="space-y-2.5">
        {/* PRIMARY: Quero adotar */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md hover:from-rose-600 hover:to-amber-600"
          onClick={onAdopt}
          disabled={isAdopted}
        >
          <Heart className="mr-2 h-5 w-5" />
          {isAdopted ? 'Já foi adotado' : 'Quero adotar'}
        </Button>

        {/* SECONDARY: Falar com o responsável */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onChat}
          disabled={isAdopted}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          {user ? 'Falar com o responsável' : 'Falar (entrar)'}
        </Button>

        {/* ADMIN: SÓ para canManage */}
        {canManage && (
          <Button
            variant="default"
            size="lg"
            className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={onAdmin}
            data-testid="admin-entry-button"
          >
            <Lock className="mr-2 h-4 w-4" />
            Administrar este pet
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {/* TERTIARY: Compartilhar */}
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onShare}>
          <Share2 className="mr-2 h-3.5 w-3.5" />
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

function OwnerCard({ owner, petId }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid="pet-owner">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Building2 className="h-4 w-4 text-primary" />
        Responsável
      </h3>
      <Link
        to={`/abrigos/${owner.id}`}
        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/60"
      >
        <Avatar className="h-12 w-12 ring-2 ring-white">
          {owner.photo_url ? (
            <AvatarImage src={owner.photo_url} alt={owner.name} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 font-bold text-white">
            {owner.name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{owner.name || 'Abrigo'}</p>
          {owner.city && (
            <p className="truncate text-xs text-muted-foreground">
              <MapPin className="mr-0.5 inline h-3 w-3" />
              {owner.city}{owner.state ? `, ${owner.state}` : ''}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
      {owner.about && (
        <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{owner.about}</p>
      )}
    </div>
  );
}

function PetLocationCard({ pet }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid="pet-location">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
        <MapPin className="h-4 w-4 text-rose-600" />
        Localização
      </h3>
      <p className="text-sm text-foreground/85">
        {pet.city || '—'}{pet.state ? `, ${pet.state}` : ''}
      </p>
      {pet.neighborhood && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {pet.neighborhood}
        </p>
      )}
    </div>
  );
}

function PetQuickFactsCard({ pet }) {
  const facts = useMemo(() => {
    const list = [];
    if (pet.species) list.push({ icon: PawPrint, label: 'Espécie', value: SPECIES_LABEL[pet.species] || pet.species });
    if (pet.size) list.push({ icon: Ruler, label: 'Porte', value: SIZE_LABEL[pet.size] || pet.size });
    if (pet.age_group) list.push({ icon: Cake, label: 'Idade', value: AGE_LABEL[pet.age_group] || pet.age_group });
    if (pet.gender) list.push({ icon: Users, label: 'Sexo', value: GENDER_LABEL[pet.gender] || pet.gender });
    if (pet.weight_kg) list.push({ icon: Weight, label: 'Peso', value: `${pet.weight_kg} kg` });
    if (list.length === 0) return null;
    return list;
  }, [pet]);

  if (!facts) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid="pet-quick-facts">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Info className="h-4 w-4 text-sky-600" />
        Características
      </h3>
      <dl className="space-y-2">
        {facts.map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </dt>
            <dd className="font-semibold text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PetIdCard({ ids }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid="pet-id">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Identificação
      </h3>
      <dl className="space-y-2">
        {ids.map((id, i) => (
          <div key={i} className="text-xs">
            <dt className="text-muted-foreground">{id.label}</dt>
            <dd className="font-mono font-semibold text-foreground">{id.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PetTrustBadge() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <div className="text-xs text-emerald-800 dark:text-emerald-200">
          <p className="font-bold">Adoção responsável</p>
          <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
            Todos os anúncios passam por verificação manual. Reporte qualquer problema.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STICKY CTA (mobile)
// ============================================================================

function PetStickyCtaView({ pet, canManage, isAdopted, isInProcess, onAdopt, onChat, onAdmin }) {
  if (isAdopted) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:hidden"
      data-testid="pet-sticky-cta"
    >
      <div className="flex items-center gap-2">
        <Button
          size="lg"
          className="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
          onClick={onAdopt}
        >
          <Heart className="mr-1.5 h-4 w-4" />
          Quero adotar
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onChat}
          aria-label="Falar com o responsável"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        {canManage && (
          <Button
            variant="default"
            size="lg"
            onClick={onAdmin}
            className="bg-slate-900 text-white hover:bg-slate-800"
            aria-label="Administrar este pet"
            data-testid="admin-entry-sticky"
          >
            <Lock className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function PetDetailViewSkeleton() {
  return (
    <div className="min-h-screen bg-background" data-testid="pet-detail-view-skeleton">
      <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 py-8 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/30">
        <div className="mx-auto max-w-6xl space-y-3 px-4 sm:px-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="aspect-[4/3] w-full rounded-3xl sm:aspect-[16/10]" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOT FOUND
// ============================================================================

function PetNotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <PawPrint className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Pet não encontrado</h1>
        <p className="mb-6 text-muted-foreground">
          Este pet pode ter sido removido ou o link está incorreto.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/feed">Ver outros pets</Link>
          </Button>
          <Button asChild>
            <Link to="/">Ir para o início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ICON ALIAS (usar Clock no lugar de Clock4 que não existe no lucide)
// ============================================================================

const Clock4 = Clock;
