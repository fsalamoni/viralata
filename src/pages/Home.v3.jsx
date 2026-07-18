/**
 * @fileoverview HOME V3 — redesign completo no padrão DS-V2.
 *
 * V3 (TASK-V3-HOME): implementação do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_HOME (default OFF, gated via React.lazy).
 *
 * Design system: V3 com 6 seções distintas (hero, stats, steps, features,
 * stories, CTA) + Skeleton/EmptyState/ErrorState integrados.
 *
 * @see docs/V3_HOME_QUESTIONS.md
 * @see docs/REGENCY_HOME_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PawPrint, Heart, Shield, Users, Megaphone,
  ClipboardList, Search, Sparkles, ArrowRight, CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { useHomeStats } from '@/core/hooks/useHomeStats';

// ============================================================================
// DATA (estático — não há remote fetch na home por enquanto)
// ============================================================================

const IMPACT_STATS = [
  { value: '500+', label: 'Adoções responsáveis', icon: Heart },
  { value: '1.200+', label: 'Animais resgatados', icon: PawPrint },
  { value: '26', label: 'ONGs parceiras', icon: Users },
  { value: '14', label: 'Cidades atendidas', icon: Megaphone },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Conte sobre você',
    desc: 'Responda um quiz rápido de 5 perguntas sobre seu espaço, rotina e experiência com pets.',
    cta: { label: 'Começar quiz', href: '/onboarding' },
  },
  {
    icon: Search,
    title: 'Encontre seu match',
    desc: 'Veja no feed pets compatíveis com seu perfil, com nível de afinidade e histórico da ONG.',
    cta: { label: 'Ver feed', href: '/feed' },
  },
  {
    icon: Heart,
    title: 'Adote com cuidado',
    desc: 'Converse com a ONG, visite o pet e finalize a adoção com contrato digital e acompanhamento.',
    cta: { label: 'Como funciona', href: '/como-funciona' },
  },
];

const FEATURES = [
  {
    icon: Heart,
    title: 'Match por compatibilidade',
    desc: 'Algoritmo cruza seu perfil (espaço, rotina, experiência) com o que cada pet precisa.',
    color: 'hsl(17 72% 38%)',
    bg: 'hsl(17 72% 45% / 0.10)',
  },
  {
    icon: Users,
    title: 'ONGs verificadas',
    desc: 'Todas as ONGs parceiras passam por validação documental e acompanham a adoção.',
    color: 'hsl(86 34% 26%)',
    bg: 'hsl(86 30% 32% / 0.12)',
  },
  {
    icon: Megaphone,
    title: 'Denúncias com GPS',
    desc: 'Reporte maus-tratos com localização e gere um PDF pronto para o órgão responsável.',
    color: 'hsl(30 60% 32%)',
    bg: 'hsl(40 88% 54% / 0.16)',
  },
  {
    icon: Shield,
    title: 'Gratuito e sem comissão',
    desc: 'Plataforma 100% sem fins lucrativos, sem venda de animais e sem taxa de adoção.',
    color: 'hsl(20 20% 25%)',
    bg: 'hsl(20 20% 20% / 0.06)',
  },
];

const STORIES = [
  {
    adopter: 'Fernanda R.',
    pet: 'Bolt',
    city: 'Porto Alegre',
    quote: 'Encontrei o Bolt em uma semana. O quiz de compatibilidade fez toda diferença — ele se adaptou em 2 dias.',
    gradient: 'linear-gradient(135deg,#E8875F,#C1502E)',
  },
  {
    adopter: 'Marcos e Júlia',
    pet: 'Mia',
    city: 'Curitiba',
    quote: 'Adotamos pela ONG Refúgio Quatro Patas. O processo foi acompanhado, transparente e seguro do início ao fim.',
    gradient: 'linear-gradient(135deg,#C9A876,#8B6F47)',
  },
  {
    adopter: 'Diego T.',
    pet: 'Zeca',
    city: 'Belo Horizonte',
    quote: 'Denunciei um caso de maus-tratos pelo app e a ONG parceira resgatou o animal no mesmo dia.',
    gradient: 'linear-gradient(135deg,#9CAA6B,#5F6B3E)',
  },
];

// ============================================================================
// ANIMATIONS
// ============================================================================

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HeroSection({ onCta }) {
  const reduce = useReducedMotion();
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-background via-background to-card/30"
      aria-labelledby="hero-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
        <motion.div
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Adoção responsável, gratuita e rastreável</span>
          </motion.div>

          <motion.h1
            id="hero-title"
            variants={fadeUp}
            className="mt-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Encontre o pet que combina<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"> com a sua vida.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base md:text-lg"
          >
            Conectamos pessoas a animais resgatados por ONGs verificadas.
            Sem compra, sem comissão, sem decisão precipitada.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/feed" onClick={() => onCta?.('feed')}>
                <PawPrint className="mr-2 h-4 w-4" aria-hidden="true" />
                Ver pets disponíveis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/onboarding" onClick={() => onCta?.('onboarding')}>
                <ClipboardList className="mr-2 h-4 w-4" aria-hidden="true" />
                Fazer quiz de compatibilidade
              </Link>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-xs text-muted-foreground"
          >
            <CheckCircle2 className="mr-1 inline-block h-3.5 w-3.5 text-primary" aria-hidden="true" />
            100% gratuito · sem cadastro para navegar
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  const { data, isLoading, isError, refetch } = useHomeStats();
  if (isLoading) {
    return (
      <section className="border-y border-border bg-card/50 py-10 sm:py-12" aria-labelledby="stats-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="stats-title" className="sr-only">Nossos números</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {IMPACT_STATS.map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (isError) {
    return (
      <section className="border-y border-border bg-card/50 py-10" aria-labelledby="stats-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="stats-title" className="sr-only">Nossos números</h2>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-center">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <p className="text-sm text-foreground">Não conseguimos carregar os números agora.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar de novo</Button>
          </div>
        </div>
      </section>
    );
  }
  const stats = data ?? IMPACT_STATS.map((s) => ({ value: s.value, label: s.label, icon: s.icon }));
  return (
    <section className="border-y border-border bg-card/50 py-10 sm:py-12" aria-labelledby="stats-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="stats-title" className="sr-only">Nossos números</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((s, i) => {
            const Icon = IMPACT_STATS[i]?.icon ?? Heart;
            return (
              <div key={i} className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20" aria-labelledby="steps-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Como funciona</p>
          <h2 id="steps-title" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            3 passos para adotar com responsabilidade
          </h2>
        </div>
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="relative rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Passo {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                {step.cta && (
                  <Button asChild variant="link" size="sm" className="mt-3 h-auto p-0 text-primary">
                    <Link to={step.cta.href}>
                      {step.cta.label}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-card/30 py-12 sm:py-16 md:py-20" aria-labelledby="features-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Diferenciais</p>
          <h2 id="features-title" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Construído com cuidado para quem ama pets
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <article key={i} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: f.bg, color: f.color }}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StoriesSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20" aria-labelledby="stories-title">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Histórias reais</p>
          <h2 id="stories-title" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Quem adotou, recomenda
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5">
          {STORIES.map((s, i) => (
            <figure key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: s.gradient }}
                  aria-hidden="true"
                >
                  {s.adopter.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <figcaption className="text-sm font-semibold text-foreground">{s.adopter}</figcaption>
                  <p className="text-xs text-muted-foreground">Adotou {s.pet} · {s.city}</p>
                </div>
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{s.quote}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="bg-primary/5 py-12 sm:py-16" aria-labelledby="cta-title">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 id="cta-title" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Pronto para encontrar seu novo melhor amigo?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          São mais de {IMPACT_STATS[1].value} animais esperando por um lar.
          Comece pelo quiz e descubra pets compatíveis com seu perfil.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/feed">
              <PawPrint className="mr-2 h-4 w-4" aria-hidden="true" />
              Ver pets disponíveis
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/denunciar">
              <Megaphone className="mr-2 h-4 w-4" aria-hidden="true" />
              Denunciar maus-tratos
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function HomeV3() {
  const { flags } = usePlatformSettings();
  const showPartnerCta = !!flags?.partnerSpacesV1;

  return (
    <div className="arena-page min-h-screen bg-background" data-testid="home-page">
      <Seo
        title="Viralata — Adoção responsável e gratuita de pets"
        description="Conectamos pessoas a animais resgatados por ONGs verificadas. Match por compatibilidade, sem comissão, sem venda."
        keywords="adoção responsável, pets, ONGs, viralata, adotar cachorro, adotar gato"
      />
      <HeroSection />
      <StatsSection />
      <StepsSection />
      <FeaturesSection />
      <StoriesSection />
      {showPartnerCta && (
        <section className="border-t border-border bg-card/40 py-8">
          <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
            <span className="rounded-full border border-border bg-card px-3 py-1">
              Espaço para parceiros
            </span>
          </div>
        </section>
      )}
      <CtaSection />
    </div>
  );
}
