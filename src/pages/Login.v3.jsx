/**
 * @fileoverview Login V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-LOGIN: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Layout split (esquerda: marketing / direita: card de login)
 *  - Hero com gradient multicolor (slate-900 → indigo-900 → violet-900)
 *  - Brand mark no topo
 *  - H1 impactante + descrição
 *  - 3 feature highlights com ícones
 *  - 1 quote de social proof
 *  - 3 trust badges (LGPD, gratuito, seguro)
 *  - Card de login centralizado (max-w-md)
 *  - Botão Google com ícone oficial
 *  - Error state inline (não toast)
 *  - Auth unavailable state
 *  - Loading skeleton
 *  - Termos + privacidade
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first (stack vertical)
 *  - A11y WCAG AA
 *  - Auth flow (signInWithGoogle)
 *
 * Rota: /login
 *
 * @see docs/REGENCY_LOGIN_V3.md
 */
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PawPrint, Heart, MessageCircle, Users, Shield, Lock, Sparkles,
  AlertCircle, CheckCircle2, ArrowRight, BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { cn } from '@/core/lib/utils';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_HIGHLIGHTS = [
  {
    icon: Heart,
    title: 'Match inteligente',
    desc: 'Encontramos pets compatíveis com seu espaço e rotina.',
  },
  {
    icon: MessageCircle,
    title: 'Chat integrado',
    desc: 'Converse diretamente com ONGs e responsáveis.',
  },
  {
    icon: Users,
    title: 'Comunidade engajada',
    desc: 'Tutores, ONGs e adotantes trocando apoio e experiências.',
  },
];

const TRUST_BADGES = [
  { icon: Lock, label: 'LGPD compliant' },
  { icon: Sparkles, label: '100% gratuito' },
  { icon: Shield, label: 'Sem venda de animais' },
];

const SOCIAL_QUOTE = {
  quote: 'O Viralata me ajudou a encontrar o Bolt em uma semana. O questionário de compatibilidade fez toda diferença.',
  adopter: 'Fernanda R.',
  pet: 'Bolt',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FeatureHighlight({ icon: Icon, title, desc, reduce }) {
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/15"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
          <Icon className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/80">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

function TrustBadge({ icon: Icon, label, reduce }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold text-white/90 backdrop-blur-sm">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </div>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoginSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
      <Skeleton className="mx-auto h-7 w-2/3" />
      <Skeleton className="mx-auto h-4 w-full" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function LoginV3() {
  const reduce = useReducedMotion();
  const {
    signInWithGoogle,
    isAuthenticated,
    isLoadingAuth,
    authError,
    isAuthAvailable,
    authUnavailableReason,
    isProfileComplete,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/feed';
  const prevErrorRef = useRef(null);

  // Redirect after auth
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isProfileComplete ? from : '/onboarding', { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, navigate, from]);

  // Track auth error
  useEffect(() => {
    const msg = authError?.message;
    if (msg && msg !== prevErrorRef.current) {
      prevErrorRef.current = msg;
    }
  }, [authError?.message]);

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Login — Viralata',
    description: 'Acesse sua conta Viralata para encontrar pets para adoção ou cadastrar pets.',
    url: 'https://viralata.web.app/login',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Viralata',
      url: 'https://viralata.web.app',
    },
  };

  const onClick = async () => {
    if (!isAuthAvailable) return;
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // tratado via authError state
    } finally {
      setBusy(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="arena-page mx-auto max-w-md px-4 py-12 sm:px-6" data-testid="login-page">
        <LoginSkeleton />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950"
      data-testid="login-page"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(245,158,11,0.18),transparent_40%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_90%,rgba(139,92,246,0.15),transparent_40%)]" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center lg:gap-8">
        {/* LEFT — marketing panel (desktop only) */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="hidden h-full min-h-[42rem] flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-sm lg:flex lg:p-14"
        >
          {/* Brand mark */}
          <motion.div variants={ANIM}>
            <Link to="/" className="inline-flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <PawPrint className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.24em] text-amber-200/80">
                  Viralata
                </span>
                <span className="block text-base font-semibold text-white sm:text-lg">
                  Adoção responsável de pets
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Hero text + features */}
          <div className="space-y-5">
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border border-white/20 bg-white/10 text-amber-200 backdrop-blur">
                <PawPrint className="mr-1 h-3 w-3" aria-hidden="true" />
                Plataforma gratuita de adoção
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="max-w-[440px] text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl"
            >
              Conecte-se com pets que precisam de um lar
              <span className="text-amber-200"> e famílias que têm amor para dar.</span>
            </motion.h1>

            <motion.div variants={ANIM} className="space-y-2">
              {FEATURE_HIGHLIGHTS.map((f) => {
                const Icon = f.icon;
                return (
                  <FeatureHighlight
                    key={f.title}
                    icon={Icon}
                    title={f.title}
                    desc={f.desc}
                    reduce={reduce}
                  />
                );
              })}
            </motion.div>
          </div>

          {/* Social proof */}
          <motion.blockquote
            variants={ANIM}
            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
          >
            <p className="text-sm italic leading-relaxed text-white/90">
              &ldquo;{SOCIAL_QUOTE.quote}&rdquo;
            </p>
            <footer className="mt-2 flex items-center gap-2 text-xs">
              <BadgeCheck className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
              <span className="font-bold text-amber-200/90">
                {SOCIAL_QUOTE.adopter}
              </span>
              <span className="text-white/60">·</span>
              <span className="text-white/80">adotou {SOCIAL_QUOTE.pet}</span>
            </footer>
          </motion.blockquote>
        </motion.section>

        {/* RIGHT — login card */}
        <div className="flex items-center justify-center">
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8"
            data-testid="login-card"
          >
            <Seo
              title="Entrar — Viralata"
              description="Acesse sua conta Viralata para encontrar pets para adoção ou cadastrar pets."
            />
            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Mobile brand (lg:hidden) */}
            <Link
              to="/"
              className="mx-auto mb-4 inline-flex items-center gap-3 text-foreground lg:hidden"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <PawPrint className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold">Viralata</span>
            </Link>

            {/* Central icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <PawPrint className="h-6 w-6 text-white" aria-hidden="true" />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Bem-vindo ao Viralata
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Use sua conta Google para acessar a plataforma e encontrar
              ou cadastrar pets para adoção responsável.
            </p>

            {/* Trust badges (mobile) */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 lg:hidden">
              {TRUST_BADGES.map((b) => {
                const Icon = b.icon;
                return <TrustBadge key={b.label} icon={Icon} label={b.label} reduce={reduce} />;
              })}
            </div>

            {/* Google button */}
            <div className="mt-6">
              <Button
                onClick={onClick}
                disabled={busy || !isAuthAvailable}
                variant="outline"
                className="h-12 w-full gap-2.5 border-border bg-card text-sm font-bold text-foreground shadow-sm hover:bg-muted"
                data-testid="google-login-btn"
              >
                <GoogleIcon className="h-[18px] w-[18px] flex-shrink-0" />
                {busy ? 'Conectando…' : isAuthAvailable ? 'Continuar com Google' : 'Login indisponível'}
              </Button>
            </div>

            {/* Error state (inline) */}
            {authError && isAuthAvailable && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <p className="text-xs text-destructive">
                  {authError.message || 'Ocorreu um erro. Tente novamente.'}
                </p>
              </div>
            )}

            {/* Auth unavailable */}
            {!isAuthAvailable && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  {authUnavailableReason || 'Configure o Firebase para habilitar autenticação.'}
                </p>
              </div>
            )}

            {/* Success hint (mobile) */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground lg:hidden">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              <span>Acesso seguro via Google</span>
            </div>

            {/* Terms */}
            <p className="mt-5 text-[10.5px] leading-relaxed text-muted-foreground">
              Ao continuar você aceita nossa{' '}
              <Link
                to="/politica-privacidade"
                className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
              >
                Política de Privacidade
              </Link>{' '}
              e os{' '}
              <Link
                to="/termos"
                className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
              >
                Termos de Uso
              </Link>
              . O Viralata é 100% gratuito e não realiza venda de animais.
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
