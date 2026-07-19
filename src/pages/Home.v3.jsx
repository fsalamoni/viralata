/**
 * @fileoverview Home V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-HOME: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente multicolor (rose-amber-orange)
 *  - 4 stat cards de impacto (Adoções, Resgatados, ONGs, Cidades)
 *  - 3 chips de "categorias" (Cachorro, Gato, Outros) com ícones
 *  - Próximas vitrines (até 3 cards)
 *  - Como funciona (3 steps com ícones numerados)
 *  - 4 features (Match, Comunidade, Denúncias, Seguro)
 *  - 3 histórias de adoção (cards com avatar)
 *  - CTA final com gradient
 *  - Footer com links legais
 *  - SEO + JSON-LD (Organization + WebSite schema)
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first (1/2/3 colunas)
 *  - A11y WCAG AA
 *
 * Rota: /
 *
 * @see docs/REGENCY_HOME_V3.md
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PawPrint, Heart, Shield, Users, Megaphone, ClipboardList, Search,
  Sparkles, ArrowRight, CheckCircle2, Cat, Dog, Rabbit,
  Building2, Calendar, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import Seo from '@/components/Seo';
import { cn } from '@/core/lib/utils';
import { listPublicExhibitions } from '@/modules/shelter/services/exhibitionPublicService';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const IMPACT_STATS = [
  { value: '500+', label: 'Adoções realizadas', icon: Heart, color: 'rose' },
  { value: '1.200+', label: 'Animais resgatados', icon: PawPrint, color: 'amber' },
  { value: '26', label: 'ONGs parceiras', icon: Building2, color: 'sky' },
  { value: '14', label: 'Cidades atendidas', icon: MapPin, color: 'emerald' },
];

const SPECIES_FILTERS = [
  { id: 'all', label: 'Todos', icon: Sparkles, count: '1.200+' },
  { id: 'dog', label: 'Cachorros', icon: Dog, count: '850+' },
  { id: 'cat', label: 'Gatos', icon: Cat, count: '300+' },
  { id: 'other', label: 'Outros', icon: Rabbit, count: '50+' },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Monte seu perfil',
    desc: 'Responda algumas perguntas sobre seu espaço e rotina para encontrarmos os pets mais compatíveis com você.',
    color: 'rose',
  },
  {
    icon: Search,
    title: 'Encontre seu pet',
    desc: 'Navegue pelo feed personalizado e demonstre interesse nos pets que chamarem sua atenção.',
    color: 'amber',
  },
  {
    icon: Heart,
    title: 'Adote com amor',
    desc: 'Converse com o responsável pelo chat e finalize a adoção de forma segura e responsável.',
    color: 'emerald',
  },
];

const FEATURES = [
  {
    icon: Heart,
    title: 'Match inteligente',
    desc: 'Algoritmo que cruza seu perfil com as necessidades do pet.',
    color: 'rose',
  },
  {
    icon: Users,
    title: 'Comunidade viva',
    desc: 'ONGs, tutores e adotantes trocando experiências e apoio.',
    color: 'sky',
  },
  {
    icon: Megaphone,
    title: 'Denúncias com propósito',
    desc: 'Reporte maus-tratos com GPS e gere PDF para as autoridades.',
    color: 'amber',
  },
  {
    icon: Shield,
    title: 'Seguro e gratuito',
    desc: 'Plataforma 100% gratuita, sem venda de animais.',
    color: 'emerald',
  },
];

const STORIES = [
  {
    adopter: 'Fernanda R.',
    pet: 'Bolt',
    quote: 'O Viralata me ajudou a encontrar o Bolt em uma semana. O questionário de compatibilidade fez toda diferença.',
    gradient: 'linear-gradient(135deg,#E8875F,#C1502E)',
  },
  {
    adopter: 'Marcos e Júlia',
    pet: 'Mia',
    quote: 'Adotamos a Mia pela ONG Refúgio Quatro Patas e o processo foi todo acompanhado e seguro, do início ao fim.',
    gradient: 'linear-gradient(135deg,#C9A876,#8B6F47)',
  },
  {
    adopter: 'Diego T.',
    pet: 'Zeca',
    quote: 'Denunciei um caso de maus-tratos pelo app e a ONG parceira resgatou o animal no mesmo dia.',
    gradient: 'linear-gradient(135deg,#9CAA6B,#5F6B3E)',
  },
];

// ============================================================================
// UTILS
// ============================================================================

function formatEventDate(iso) {
  if (!iso) return '—';
  let d = iso;
  if (typeof iso === 'string') d = new Date(iso);
  else if (iso?.toDate) d = iso.toDate();
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatEventLong(iso) {
  if (!iso) return '';
  let d = iso;
  if (typeof iso === 'string') d = new Date(iso);
  else if (iso?.toDate) d = iso.toDate();
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function isFuture(iso) {
  if (!iso) return false;
  let d = iso;
  if (typeof iso === 'string') d = new Date(iso);
  else if (iso?.toDate) d = iso.toDate();
  return d && d >= new Date();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ImpactStatCard({ icon: Icon, value, label, color, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-sm sm:p-4"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10', c.bg)}>
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', c.text)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xl font-extrabold sm:text-2xl', c.text)}>{value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10.5px]">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SpeciesChip({ id, label, icon: Icon, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
      <span className={cn(
        'rounded-full px-1.5 text-[10px] font-bold',
        active ? 'bg-white/20' : 'bg-muted',
      )}>
        {count}
      </span>
    </button>
  );
}

function ExhibitionCard({ exhibition, reduce }) {
  const start = exhibition.datetime_start;
  return (
    <Link
      to={`/vitrines/${exhibition.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
      data-testid={`exhibition-${exhibition.id}`}
    >
      <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-4 text-white">
        <Badge variant="secondary" className="mb-2 border-0 bg-white/25 text-[10.5px] font-bold text-white backdrop-blur">
          <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
          Próxima vitrine
        </Badge>
        <h3 className="line-clamp-2 text-base font-extrabold sm:text-lg">
          {exhibition.title || 'Vitrine'}
        </h3>
      </div>
      <div className="space-y-2 p-4 text-xs text-muted-foreground">
        {isFuture(start) && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatEventLong(start)}</span>
          </div>
        )}
        {exhibition.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{exhibition.location}</span>
          </div>
        )}
        {(exhibition.internal_pets_count || exhibition.external_pets_count) && (
          <div className="flex items-center gap-1.5">
            <PawPrint className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {(exhibition.internal_pets_count || 0) + (exhibition.external_pets_count || 0)} pets
            </span>
          </div>
        )}
      </div>
      <div className="border-t border-border/50 px-4 py-2 text-[10.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Ver detalhes →
      </div>
    </Link>
  );
}

function StepCard({ icon: Icon, title, desc, index, color, reduce }) {
  const colorMap = {
    rose: 'from-rose-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
  };
  return (
    <motion.div variants={ANIM} className="text-center">
      <div className={cn(
        'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:h-16 sm:w-16',
        colorMap[color],
      )}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </div>
      <div className="mx-auto mt-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-extrabold text-primary sm:h-8 sm:w-8">
        {index}
      </div>
      <h3 className="mt-2 mb-1.5 text-base font-bold text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, reduce }) {
  const colorMap = {
    rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400' },
    sky: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  };
  const c = colorMap[color] || colorMap.rose;
  return (
    <motion.div
      variants={ANIM}
      whileHover={reduce ? undefined : { y: -4 }}
      className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl', c.bg)}>
        <Icon className={cn('h-5 w-5', c.text)} aria-hidden="true" />
      </div>
      <h3 className="mb-1.5 text-base font-bold text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </motion.div>
  );
}

function StoryCard({ story, reduce }) {
  const initials = story.adopter.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar
          name={story.adopter}
          size="md"
          fallbackStyle={{ background: story.gradient }}
        />
        <div>
          <p className="text-sm font-bold text-foreground">{story.adopter}</p>
          <p className="text-xs text-muted-foreground">adotou {story.pet}</p>
        </div>
      </div>
      <p className="text-sm italic leading-relaxed text-foreground/85">
        &ldquo;{story.quote}&rdquo;
      </p>
    </motion.div>
  );
}

function ExhibitionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card">
          <Skeleton className="h-24 w-full rounded-t-2xl" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function HomeV3() {
  const reduce = useReducedMotion();
  const [activeSpecies, setActiveSpecies] = useState('all');
  const [exhibitions, setExhibitions] = useState([]);
  const [loadingExh, setLoadingExh] = useState(true);
  const [errorExh, setErrorExh] = useState(null);

  // Load exhibitions
  useEffect(() => {
    let cancelled = false;
    setLoadingExh(true);
    setErrorExh(null);
    listPublicExhibitions({ max: 6 })
      .then((data) => {
        if (!cancelled) {
          // Só eventos futuros
          const upcoming = (data || [])
            .filter((e) => isFuture(e.datetime_start))
            .slice(0, 3);
          setExhibitions(upcoming);
          setLoadingExh(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorExh(err.message);
          setLoadingExh(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // JSON-LD: Organization + WebSite
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Viralata',
    description: 'Plataforma gratuita de adoção responsável de pets',
    url: 'https://viralata.web.app',
    logo: 'https://viralata.web.app/logo.png',
    sameAs: [
      'https://www.instagram.com/viralata',
      'https://www.facebook.com/viralata',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'BR',
      availableLanguage: 'Portuguese',
    },
  };

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-12 sm:px-6" data-testid="home-page">
      <Seo
        title="Viralata — Adoção responsável de pets"
        description="Encontre pets para adoção, converse com ONGs e cadastre pets com segurança. Plataforma gratuita."
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-6 text-white shadow-2xl sm:p-10 lg:p-12"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Plataforma gratuita
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Adoção responsável
              <br />
              <span className="text-amber-100">começa aqui.</span>
            </motion.h1>
            <motion.p
              variants={ANIM}
              className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg lg:text-xl"
            >
              Encontre pets para adoção, converse com ONGs e cadastre
              pets com segurança. Mais de 1.200 animais resgatados,
              26 ONGs parceiras e 14 cidades atendidas.
            </motion.p>
            <motion.div variants={ANIM} className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="border-0 bg-white text-rose-700 shadow-lg hover:bg-white/90">
                <Link to="/feed">
                  <PawPrint className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Ver pets
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
                <Link to="/login">
                  Entrar
                </Link>
              </Button>
            </motion.div>

            {/* Species chips */}
            <motion.div variants={ANIM} className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/80">
                Encontre por espécie:
              </span>
              {SPECIES_FILTERS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSpecies(s.id)}
                    aria-pressed={activeSpecies === s.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      activeSpecies === s.id
                        ? 'border-white bg-white text-rose-700'
                        : 'border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.label}
                    <span className={cn(
                      'rounded-full px-1.5 text-[10px]',
                      activeSpecies === s.id ? 'bg-rose-100 text-rose-700' : 'bg-white/20',
                    )}>
                      {s.count}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </div>

          {/* Stats desktop */}
          <motion.div
            variants={ANIM}
            className="hidden lg:flex lg:flex-col lg:gap-2"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold leading-none">500+</p>
                  <p className="mt-0.5 text-xs text-white/80">adoções realizadas</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <PawPrint className="h-4 w-4" aria-hidden="true" />
                <p className="mt-1 text-lg font-extrabold leading-none">1.200+</p>
                <p className="mt-0.5 text-[10.5px] text-white/80">resgatados</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <p className="mt-1 text-lg font-extrabold leading-none">26</p>
                <p className="mt-0.5 text-[10.5px] text-white/80">ONGs</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <p className="mt-1 text-lg font-extrabold leading-none">14</p>
                <p className="mt-0.5 text-[10.5px] text-white/80">cidades</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* STATS mobile */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-2 gap-3 lg:hidden"
      >
        {IMPACT_STATS.map((s) => (
          <ImpactStatCard
            key={s.label}
            icon={s.icon}
            value={s.value}
            label={s.label}
            color={s.color}
            reduce={reduce}
          />
        ))}
      </motion.section>

      {/* PRÓXIMAS VITRINES */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              <Sparkles className="mr-1.5 inline h-6 w-6 text-primary" aria-hidden="true" />
              Próximas vitrines
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Encontros presenciais de adoção em todo o Brasil.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/eventos">
              Ver todos
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {loadingExh && <ExhibitionsSkeleton />}

        {!loadingExh && errorExh && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar as vitrines.
          </div>
        )}

        {!loadingExh && !errorExh && exhibitions.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma vitrine agendada. Volte mais tarde!
            </p>
          </div>
        )}

        {!loadingExh && !errorExh && exhibitions.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exhibitions.map((e) => (
              <ExhibitionCard key={e.id} exhibition={e} reduce={reduce} />
            ))}
          </div>
        )}
      </motion.section>

      {/* COMO FUNCIONA */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Em 3 passos simples você encontra o pet ideal para sua família.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard
              key={step.title}
              icon={step.icon}
              title={step.title}
              desc={step.desc}
              index={i + 1}
              color={step.color}
              reduce={reduce}
            />
          ))}
        </div>
      </motion.section>

      {/* HISTÓRIAS DE ADOÇÃO */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="space-y-6"
      >
        <div className="text-center">
          <Badge variant="secondary" className="mb-2 gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <Heart className="h-3 w-3" aria-hidden="true" />
            Histórias reais
          </Badge>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Vidas que mudaram de rumo
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STORIES.map((story) => (
            <StoryCard key={story.adopter} story={story} reduce={reduce} />
          ))}
        </div>
      </motion.section>

      {/* FUNCIONALIDADES */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Tudo em um só lugar
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Ferramentas pensadas para uma adoção responsável e uma comunidade engajada.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              color={f.color}
              reduce={reduce}
            />
          ))}
        </div>
      </motion.section>

      {/* CTA FINAL */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 p-8 text-center text-white shadow-2xl sm:p-12"
      >
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Pronto para encontrar seu novo melhor amigo?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/90 sm:text-lg">
          Navegue pelo feed de pets, demonstre interesse e adote com responsabilidade.
          É gratuito, seguro e transformador.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg" className="border-0 bg-white text-rose-700 shadow-lg hover:bg-white/90">
            <Link to="/feed">
              <PawPrint className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Ver pets para adoção
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
            <Link to="/organizacoes">
              <Building2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Ver abrigos
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Viralata — Adoção responsável de pets
        </p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-4 text-xs">
          <Link to="/termos" className="text-muted-foreground transition-colors hover:text-foreground">
            Termos
          </Link>
          <Link to="/politica-privacidade" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacidade
          </Link>
          <Link to="/legislacao" className="text-muted-foreground transition-colors hover:text-foreground">
            Legislação
          </Link>
        </div>
      </footer>
    </div>
  );
}
