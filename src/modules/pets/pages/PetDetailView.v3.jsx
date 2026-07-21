/**
 * @fileoverview PetDetailView V3 — PÁGINA PÚBLICA do pet (TASK-V3-PET-DETAIL-VIEW-V2, 2026-07-21).
 *
 * **PROPÓSITO**: Apresentar o pet de forma IMPACTANTE, PERSUASIVA e
 * ATRATIVA para que o visitante se apaixone e queira adotar. A página
 * é um "marketing emocional" — o pet é o protagonista absoluto.
 *
 * **DS-V2 (Design System V2)**:
 * - Hero com gradient multicolor (rose→amber→orange)
 * - Stat cards coloridos (4 cards: idade/sexo/porte/cidade)
 * - Cards de seção com rounded-3xl e shadow-lg
 * - Sticky CTA no mobile com glassmorphism
 * - TopBar + BottomTabBar obrigatórios (via withLayout)
 * - SEM pontos de admin/gestão (página pública)
 *
 * **SEM BOTÕES DE EDIÇÃO/EXCLUSÃO** (defense-in-depth):
 * - Esses botões SÓ aparecem na rota `/pets/:petId` (plural) — admin
 * - Botão "Administrar" SÓ para owner/membro (canManage)
 * - Platform admin NÃO vê este botão (usa /admin/pets)
 *
 * **QUEM PODE VER**: Qualquer visitante, autenticado ou não.
 *
 * **SEÇÕES** (single-page, sem abas):
 * 1. Hero impactante com foto + badges + stats
 * 2. Sobre / história emocional
 * 3. Personalidade (chips)
 * 4. Saúde (3 badges grandes)
 * 5. Lar ideal (requisitos)
 * 6. Características (tabela visual)
 * 7. Localização + Responsável
 * 8. Galeria de fotos
 * 9. CTAs persuasivos
 * 10. Trust badge + Report
 * 11. Sticky CTA no mobile
 *
 * @see docs/REGENCY_PET_DETAIL_VIEW_V3.md
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
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
  XCircle, Building2, Maximize2, Shield,
  Sparkles, Stethoscope, Cake, Ruler, Weight, Star, AlertTriangle,
  ChevronRight, ShieldCheck, Home, ArrowUpRight,
  Check, HelpCircle, X, HeartHandshake,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
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

const STATUS = {
  available: {
    label: 'Disponível para adoção',
    shortLabel: 'Disponível',
    color: 'bg-emerald-500 text-white border-emerald-600',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-900/40',
    gradient: 'from-emerald-500 to-teal-600',
  },
  in_process: {
    label: 'Em processo de adoção',
    shortLabel: 'Em processo',
    color: 'bg-amber-500 text-white border-amber-600',
    dot: 'bg-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-900/40',
    gradient: 'from-amber-500 to-orange-600',
  },
  adopted: {
    label: 'Já foi adotado ❤️',
    shortLabel: 'Adotado',
    color: 'bg-slate-500 text-white border-slate-600',
    dot: 'bg-slate-300',
    ring: 'ring-slate-200 dark:ring-slate-800',
    gradient: 'from-slate-500 to-slate-700',
  },
  unavailable: {
    label: 'Indisponível',
    shortLabel: 'Indisponível',
    color: 'bg-rose-500 text-white border-rose-600',
    dot: 'bg-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-900/40',
    gradient: 'from-rose-500 to-pink-600',
  },
};

const ANIM = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
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

  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ─── LOAD PET + OWNER ─────────────────────────────────────────
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
      } catch (err) {
        console.error('[PetDetailViewV3] erro:', err);
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [petId]);

  const photos = useMemo(
    () => (pet && Array.isArray(pet.photos) && pet.photos.length > 0
      ? pet.photos
      : pet && pet.photo_url
        ? [pet.photo_url]
        : []),
    [pet],
  );

  // ─── HANDLERS ─────────────────────────────────────────────────
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
    navigate(`/chat?pet=${petId}`);
  }, [user, petId, navigate]);

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

  // ─── DERIVED DATA (memorizado, ANTES dos early-returns) ────────────
  const currentPhotoUrl = photos[currentPhoto] || photos[0];
  const statusInfo = pet ? (STATUS[pet.status] || STATUS.available) : STATUS.available;
  const speciesEmoji = null; // sem emoji — ícone PawPrint em vez disso (não usado)
  const speciesLabel = pet ? (SPECIES_LABEL[pet.species] || 'Pet') : 'Pet';
  const isOrg = pet ? pet.owner_type === 'organization' : false;
  const isAdopted = pet ? pet.status === 'adopted' : false;

  // Stats para o card (4 stats)
  const stats = useMemo(() => {
    if (!pet) return [];
    const arr = [];
    if (pet.age_group || pet.age_months != null) {
      const ageText = pet.age_group
        ? AGE_LABEL[pet.age_group] || pet.age_group
        : pet.age_months < 12
          ? `${pet.age_months} meses`
          : `${Math.floor(pet.age_months / 12)} ${Math.floor(pet.age_months / 12) === 1 ? 'ano' : 'anos'}`;
      arr.push({ icon: Cake, label: 'Idade', value: ageText, color: 'rose' });
    }
    if (pet.gender) {
      arr.push({ icon: Users, label: 'Sexo', value: GENDER_LABEL[pet.gender] || pet.gender, color: 'sky' });
    }
    if (pet.size) {
      arr.push({ icon: Ruler, label: 'Porte', value: SIZE_LABEL[pet.size] || pet.size, color: 'amber' });
    }
    if (pet.weight_kg) {
      arr.push({ icon: Weight, label: 'Peso', value: `${pet.weight_kg} kg`, color: 'emerald' });
    }
    return arr;
  }, [pet]);

  // Personalidade
  const traits = useMemo(() => {
    if (!pet) return [];
    const t = pet.temperament || pet.personality;
    if (!t) return [];
    if (Array.isArray(t)) return t;
    if (typeof t === 'string') return t.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    return [];
  }, [pet]);

  // Saúde
  const health = useMemo(() => {
    if (!pet) return [];
    const list = [];
    if (pet.vaccinated === 'yes') {
      list.push({ key: 'vac', label: 'Vacinação', value: 'Em dia', status: 'ok' });
    } else if (pet.vaccinated === 'partial') {
      list.push({ key: 'vac', label: 'Vacinação', value: 'Parcial', status: 'partial' });
    } else {
      list.push({ key: 'vac', label: 'Vacinação', value: 'A verificar', status: 'na' });
    }
    list.push({
      key: 'cast',
      label: 'Castrado',
      value: pet.neutered === true ? 'Sim' : pet.neutered === false ? 'Não' : 'A verificar',
      status: pet.neutered === true ? 'ok' : pet.neutered === false ? 'no' : 'na',
    });
    list.push({
      key: 'verm',
      label: 'Vermifugado',
      value: pet.dewormed === true ? 'Sim' : pet.dewormed === false ? 'Não' : 'A verificar',
      status: pet.dewormed === true ? 'ok' : pet.dewormed === false ? 'no' : 'na',
    });
    return list;
  }, [pet]);

  // Requisitos
  const requirements = useMemo(() => {
    if (!pet) return [];
    const list = [];
    if (pet.needs_yard) list.push({ icon: Home, text: 'Lar com quintal ou espaço amplo' });
    if (pet.needs_screened_apt) list.push({ icon: Shield, text: 'Apartamento com telas de segurança' });
    if (pet.good_with_kids === false) list.push({ icon: Users, text: 'Sem crianças pequenas' });
    if (pet.good_with_dogs === false) list.push({ icon: XCircle, text: 'Sem outros cachorros' });
    if (pet.good_with_cats === false) list.push({ icon: XCircle, text: 'Sem gatos' });
    if (pet.experience_required) list.push({ icon: Sparkles, text: 'Tutor com experiência recomendada' });
    if (list.length === 0) {
      list.push({ icon: HeartHandshake, text: 'Adapta-se bem a diferentes lares' });
    }
    return list;
  }, [pet]);

  // Características para o grid
  const features = useMemo(() => {
    if (!pet) return [];
    const list = [];
    list.push({ icon: PawPrint, label: 'Espécie', value: speciesLabel });
    if (pet.breed) list.push({ icon: Sparkles, label: 'Raça', value: pet.breed });
    if (pet.size) list.push({ icon: Ruler, label: 'Porte', value: SIZE_LABEL[pet.size] || pet.size });
    if (pet.age_group) list.push({ icon: Cake, label: 'Idade', value: AGE_LABEL[pet.age_group] || pet.age_group });
    if (pet.age_months != null && !pet.age_group) {
      const ageText = pet.age_months < 12
        ? `${pet.age_months} meses`
        : `${Math.floor(pet.age_months / 12)} ${Math.floor(pet.age_months / 12) === 1 ? 'ano' : 'anos'}`;
      list.push({ icon: Cake, label: 'Idade', value: ageText });
    }
    if (pet.gender) list.push({ icon: Users, label: 'Sexo', value: GENDER_LABEL[pet.gender] || pet.gender });
    if (pet.weight_kg) list.push({ icon: Weight, label: 'Peso', value: `${pet.weight_kg} kg` });
    if (pet.color) list.push({ icon: Sparkles, label: 'Cor', value: pet.color });
    return list;
  }, [pet, speciesLabel]);

  // ID público (código / microchip)
  const publicIds = useMemo(() => {
    if (!pet) return [];
    const ids = [];
    if (pet.pet_code) ids.push({ label: 'Código Viralata', value: pet.pet_code });
    if (pet.microchip) ids.push({ label: 'Microchip', value: pet.microchip });
    return ids;
  }, [pet]);

  // ─── STATES (early returns) ──────────────────────────────────
  if (loading) return <PetDetailViewSkeleton />;
  if (notFound || !pet) return <PetNotFoundView />;

  return (
    <div
      className="min-h-screen bg-background"
      data-testid="pet-detail-view"
    >
      <Seo
        title={`${pet.title || pet.name || 'Pet'} — Viralata`}
        description={`${speciesLabel} para adoção em ${pet.city || 'Brasil'}. ${pet.description?.slice(0, 140) || 'Conheça no Viralata.'}`}
        image={currentPhotoUrl}
        url={`/pet/${petId}`}
        type="article"
      />

      {/* ─── HERO ──────────────────────────────────────────────── */}
      <PetHero
        pet={pet}
        photos={photos}
        currentPhoto={currentPhoto}
        setCurrentPhoto={setCurrentPhoto}
        currentPhotoUrl={currentPhotoUrl}
        statusInfo={statusInfo}
        speciesEmoji={speciesEmoji}
        reduceMotion={reduceMotion}
        onOpenLightbox={() => setLightboxOpen(true)}
        onBack={() => navigate(-1)}
        onShare={handleShare}
        isAdopted={isAdopted}
      />

      {/* ─── BODY ──────────────────────────────────────────────── */}
      <motion.div
        initial={reduceMotion ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        variants={STAGGER}
        className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:space-y-8 sm:px-6 sm:py-12"
      >
        {/* Stats cards (4 stats coloridos - padrão DS-V2) */}
        {stats.length > 0 && (
          <motion.section variants={ANIM}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s, i) => (
                <StatCard key={i} {...s} />
              ))}
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* COLUNA PRINCIPAL (2/3) */}
          <motion.main variants={STAGGER} className="space-y-6 lg:col-span-2">
            {/* Sobre / descrição */}
            {pet.description && (
              <motion.section variants={ANIM}>
                <SectionCard
                  icon={Info}
                  title="Sobre o pet"
                  accent="rose"
                >
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                    {pet.description}
                  </p>
                </SectionCard>
              </motion.section>
            )}

            {/* Personalidade */}
            {traits.length > 0 && (
              <motion.section variants={ANIM}>
                <SectionCard
                  icon={Sparkles}
                  title="Personalidade"
                  accent="amber"
                >
                  <p className="mb-3 text-sm text-muted-foreground">
                    Como esse pet se comporta no dia a dia:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait, i) => (
                      <Badge
                        key={i}
                        className="border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              </motion.section>
            )}

            {/* Saúde */}
            <motion.section variants={ANIM}>
              <SectionCard
                icon={Stethoscope}
                title="Saúde"
                accent="emerald"
              >
                <p className="mb-4 text-sm text-muted-foreground">
                  Cuidados de saúde verificados e informados pelo responsável:
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {health.map((h) => (
                    <HealthBadge key={h.key} {...h} />
                  ))}
                </div>
              </SectionCard>
            </motion.section>

            {/* Lar ideal */}
            <motion.section variants={ANIM}>
              <SectionCard
                icon={Home}
                title="Lar ideal"
                accent="sky"
              >
                <p className="mb-4 text-sm text-muted-foreground">
                  O tipo de lar perfeito para esse pet:
                </p>
                <ul className="space-y-2.5">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-900/30 dark:bg-sky-950/20">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        <req.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{req.text}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </motion.section>

            {/* Galeria de fotos (se houver mais de 1) */}
            {photos.length > 1 && (
              <motion.section variants={ANIM}>
                <SectionCard
                  icon={Sparkles}
                  title="Galeria"
                  accent="primary"
                >
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCurrentPhoto(i);
                          setLightboxOpen(true);
                        }}
                        className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-border/50 transition-all hover:ring-2 hover:ring-primary"
                      >
                        <img
                          src={url}
                          alt={`${pet.title || pet.name || 'Pet'} - foto ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </motion.section>
            )}
          </motion.main>

          {/* COLUNA LATERAL (1/3) */}
          <motion.aside variants={STAGGER} className="space-y-6">
            {/* Card de ação (sticky em desktop) */}
            <motion.div variants={ANIM} className="lg:sticky lg:top-24">
              <ActionCard
                pet={pet}
                isAdopted={isAdopted}
                isOrg={isOrg}
                onAdopt={handleAdoptClick}
                onChat={handleChatClick}
                onShare={handleShare}
                user={user}
              />
            </motion.div>

            {/* Responsável (se ONG) */}
            {isOrg && owner && (
              <motion.section variants={ANIM}>
                <OwnerCard owner={owner} />
              </motion.section>
            )}

            {/* Localização */}
            {(pet.city || pet.state) && (
              <motion.section variants={ANIM}>
                <LocationCard pet={pet} />
              </motion.section>
            )}

            {/* Características */}
            <motion.section variants={ANIM}>
              <SectionCard
                icon={Info}
                title="Características"
                accent="primary"
                compact
              >
                <dl className="space-y-2.5">
                  {features.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                        <f.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {f.label}
                      </dt>
                      <dd className="text-right text-sm font-semibold text-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
            </motion.section>

            {/* ID público */}
            {publicIds.length > 0 && (
              <motion.section variants={ANIM}>
                <SectionCard
                  icon={ShieldCheck}
                  title="Identificação"
                  accent="primary"
                  compact
                >
                  <dl className="space-y-3">
                    {publicIds.map((id, i) => (
                      <div key={i} className="rounded-lg bg-secondary/40 p-2.5">
                        <dt className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                          {id.label}
                        </dt>
                        <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                          {id.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </SectionCard>
              </motion.section>
            )}

            {/* Trust + Report */}
            <motion.section variants={ANIM}>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div className="text-xs text-emerald-800 dark:text-emerald-200">
                    <p className="font-bold">Adoção responsável</p>
                    <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                      Todos os anúncios passam por verificação manual. Reporte qualquer problema.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <Link
                  to={`/denuncias/nova?pet=${petId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Reportar este anúncio
                </Link>
              </div>
            </motion.section>
          </motion.aside>
        </div>
      </motion.div>

      {/* ─── STICKY CTA (mobile) ──────────────────────────────── */}
      <PetStickyCta
        pet={pet}
        isAdopted={isAdopted}
        onAdopt={handleAdoptClick}
        onChat={handleChatClick}
        onShare={handleShare}
      />

      {/* ─── LIGHTBOX ─────────────────────────────────────────── */}
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

function PetHero({
  pet, photos, currentPhoto, setCurrentPhoto, currentPhotoUrl,
  statusInfo, speciesEmoji, reduceMotion, onOpenLightbox, onBack, onShare, isAdopted,
}) {
  const heroTitle = pet.title || pet.name || 'Pet para adoção';
  const petName = pet.name && pet.title && pet.name !== pet.title ? pet.name : null;

  return (
    <section
      className={cn(
        'relative isolate -mt-[calc(var(--top-bar-h,0px))] overflow-hidden',
        'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500',
        'dark:from-rose-950 dark:via-orange-950 dark:to-amber-500',
      )}
      data-testid="pet-detail-hero"
    >
      {/* Radial gradient decorativo */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(0,0,0,0.10),_transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Top bar (voltar + share) */}
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Voltar</span>
          </Button>
          <div className="flex items-center gap-1.5">
            <SocialShare
              kind="pet"
              id={pet.id}
              title={heroTitle}
              description={pet.description?.slice(0, 140)}
              variant="icon"
              className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
            />
          </div>
        </div>

        {/* Hero grid: photo + identity */}
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Foto do pet (com lightbox) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <button
              type="button"
              onClick={onOpenLightbox}
              className="group relative block w-full overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 focus:outline-none focus:ring-4 focus:ring-white/40"
              aria-label={`Ampliar foto de ${heroTitle}`}
            >
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={heroTitle}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:aspect-[16/10]"
                  loading="eager"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-rose-100 to-amber-100 sm:aspect-[16/10]">
                  <PawPrint className="h-24 w-24 text-rose-700/40" aria-hidden="true" />
                </div>
              )}
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" /> Ampliar
              </span>
            </button>

            {/* Thumbs */}
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.slice(0, 6).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPhoto(i)}
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center overflow-hidden rounded-xl border-2 transition-all sm:h-16 sm:w-16',
                      i === currentPhoto
                        ? 'border-white shadow-lg ring-2 ring-white/40'
                        : 'border-white/30 opacity-70 hover:opacity-100',
                    )}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
                {photos.length > 6 && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-xs font-bold text-white backdrop-blur sm:h-16 sm:w-16">
                    +{photos.length - 6}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Identidade do pet (lado direito no desktop) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-white"
          >
            {/* Status badge */}
            <Badge
              className={cn(
                'mb-3 border backdrop-blur-md',
                statusInfo.color,
              )}
            >
              <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', statusInfo.dot)} />
              {statusInfo.label}
            </Badge>

            {/* Nome + badge da espécie (sem emoji) */}
            <div className="flex items-center gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur sm:h-16 sm:w-16"
                aria-hidden="true"
              >
                <PawPrint className="h-7 w-7 text-white sm:h-8 sm:w-8" />
              </span>
              <div>
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {petName || heroTitle}
                </h1>
                {petName && heroTitle !== petName && (
                  <p className="mt-1 text-2xl font-bold text-white/90 sm:text-3xl">
                    {heroTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Description teaser */}
            {pet.description && (
              <p className="mt-4 line-clamp-3 text-base text-white/90 sm:text-lg">
                {pet.description}
              </p>
            )}

            {/* Tags */}
            {pet.breed && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="border-0 bg-white/20 text-white backdrop-blur">
                  {pet.breed}
                </Badge>
                {pet.color && (
                  <Badge className="border-0 bg-white/20 text-white backdrop-blur">
                    {pet.color}
                  </Badge>
                )}
                {pet.age_group && (
                  <Badge className="border-0 bg-white/20 text-white backdrop-blur">
                    {AGE_LABEL[pet.age_group] || pet.age_group}
                  </Badge>
                )}
              </div>
            )}

            {/* Location inline */}
            {(pet.city || pet.state) && (
              <div className="mt-4 flex items-center gap-2 text-white/90">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {[pet.neighborhood, pet.city, pet.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', ring: 'ring-rose-200 dark:ring-rose-900/40' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', ring: 'ring-amber-200 dark:ring-amber-900/40' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30', ring: 'ring-sky-200 dark:ring-sky-900/40' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', ring: 'ring-emerald-200 dark:ring-emerald-900/40' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-3 transition-all hover:shadow-md sm:p-4',
        c.ring,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10', c.bg)}>
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', c.text)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-lg font-extrabold sm:text-xl', c.text)}>{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10.5px]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, accent = 'primary', compact = false, children }) {
  const accentMap = {
    primary: 'text-primary bg-primary/10',
    rose: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    sky: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30',
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  };
  const a = accentMap[accent] || accentMap.primary;
  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-card shadow-sm',
        compact ? 'p-5' : 'p-6 sm:p-7',
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', a)}>
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-extrabold text-foreground sm:text-xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function HealthBadge({ label, value, status }) {
  const config = {
    ok: {
      icon: Check,
      bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-500 text-white',
    },
    partial: {
      icon: HelpCircle,
      bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-500 text-white',
    },
    no: {
      icon: X,
      bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-500 text-white',
    },
    na: {
      icon: HelpCircle,
      bg: 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800',
      text: 'text-slate-600 dark:text-slate-300',
      iconBg: 'bg-slate-400 text-white',
    },
  };
  const c = config[status] || config.na;
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border p-3.5', c.bg)}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', c.iconBg)}>
        <c.icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className={cn('text-[10.5px] font-bold uppercase tracking-wider', c.text, 'opacity-80')}>
          {label}
        </p>
        <p className={cn('text-base font-extrabold', c.text)}>{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ pet, isAdopted, isOrg, onAdopt, onChat, onShare, user }) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      data-testid="pet-cta"
    >
      <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-5 text-white sm:p-6">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10.5px] font-bold uppercase tracking-wider">
            {isAdopted ? 'Pet já adotado' : 'Quer conhecer melhor?'}
          </span>
        </div>
        <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          {isAdopted ? 'Continue procurando' : 'Dê um lar para esse pet'}
        </h2>
        <p className="mt-2 text-sm text-white/90">
          {isAdopted
            ? 'Este pet já encontrou um lar feliz. Temos muitos outros esperando por você.'
            : 'Adoção responsável começa com uma boa conversa. Entre em contato com o responsável.'}
        </p>
      </div>

      <div className="space-y-2.5 p-5 sm:p-6">
        {/* PRIMARY: Quero adotar */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md hover:from-rose-600 hover:to-amber-600"
          onClick={onAdopt}
          disabled={isAdopted}
        >
          <Heart className="mr-2 h-5 w-5 fill-white" aria-hidden="true" />
          {isAdopted ? 'Já foi adotado' : 'Quero adotar'}
        </Button>

        {/* SECONDARY: Falar */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onChat}
          disabled={isAdopted}
        >
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {user ? 'Falar com o responsável' : 'Falar (entrar)'}
        </Button>

        {/* TERTIARY: Compartilhar */}
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onShare}>
          <Share2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

function OwnerCard({ owner }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/50 bg-secondary/30 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Responsável
        </h3>
      </div>
      <Link
        to={`/abrigos/${owner.id}`}
        className="group block p-5 transition-colors hover:bg-secondary/20"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-white">
            {owner.photo_url ? (
              <AvatarImage src={owner.photo_url} alt={owner.name} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-base font-extrabold text-white">
              {owner.name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground">
              {owner.name || 'Abrigo'}
            </p>
            {owner.city && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {owner.city}{owner.state ? `, ${owner.state}` : ''}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        {owner.about && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{owner.about}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
          Ver perfil do abrigo
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </div>
      </Link>
    </div>
  );
}

function LocationCard({ pet }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <MapPin className="h-4 w-4 text-rose-600" aria-hidden="true" />
        Localização
      </h3>
      <div className="space-y-1">
        <p className="text-base font-extrabold text-foreground">
          {pet.city || '—'}{pet.state ? `, ${pet.state}` : ''}
        </p>
        {pet.neighborhood && (
          <p className="text-xs text-muted-foreground">{pet.neighborhood}</p>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Encontros podem ser organizados após conversa com o responsável.
      </p>
    </div>
  );
}

// ============================================================================
// STICKY CTA (mobile)
// ============================================================================

function PetStickyCta({ pet, isAdopted, onAdopt, onChat, onShare }) {
  if (isAdopted) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:hidden"
      data-testid="pet-sticky-cta"
    >
      <div className="flex items-center gap-2">
        <Button
          size="lg"
          className="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md hover:from-rose-600 hover:to-amber-600"
          onClick={onAdopt}
        >
          <Heart className="mr-1.5 h-4 w-4 fill-white" aria-hidden="true" />
          Quero adotar
        </Button>
        <Button variant="outline" size="icon" onClick={onChat} aria-label="Falar com o responsável" className="h-11 w-11">
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShare} aria-label="Compartilhar" className="h-11 w-11">
          <Share2 className="h-4 w-4" />
        </Button>
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
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-6 sm:p-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-24 rounded-full bg-white/20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full bg-white/20" />
              <Skeleton className="h-9 w-9 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <Skeleton className="aspect-[4/3] w-full rounded-3xl bg-white/20 sm:aspect-[16/10]" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-24 rounded-full bg-white/20" />
              <Skeleton className="h-12 w-3/4 rounded-2xl bg-white/20" />
              <Skeleton className="h-4 w-full rounded-lg bg-white/20" />
              <Skeleton className="h-4 w-5/6 rounded-lg bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Body skeleton */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
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
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <PawPrint className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-extrabold">Pet não encontrado</h1>
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
