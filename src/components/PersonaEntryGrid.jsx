/**
 * @fileoverview PersonaEntryGrid — grade de "portas de entrada" da landing.
 *
 * Cada acesso (persona) tem a SUA PRÓPRIA entrada na landing, com a chamada
 * apropriada: o usuário NÃO é obrigado a entrar como adotante e depois criar
 * acessos. Ele escolhe direto o acesso que quer (abrigo, comunidade,
 * voluntário, doador, adotante) — e, já dentro da plataforma, troca pelo
 * switcher do topbar (D-PERSONA-LANDING-ENTRIES).
 *
 * A entrada de ADMIN MASTER (`platform_admin`) aparece SOMENTE para quem
 * realmente tem o papel de admin master (via `canUsePlatformAdminPersona`).
 * Nenhum outro usuário a vê (D-PERSONA-ADMIN-ENTRY-ADMIN-ONLY).
 *
 * Gated pelo master `V4_PERSONA_ENABLED` — com a V4 desligada (default), a
 * landing segue exatamente como antes (zero mudança de comportamento). Usa o
 * master (e não V4_PERSONA_SELECTION) porque a porta de entrada por acesso é o
 * ponto de partida de TODAS as personas — precisa aparecer sempre que a V4
 * estiver ligada.
 *
 * Design segue o sistema "arena" da landing (docs/REGENCY_HOME_V3.md e
 * docs/DESIGN_SYSTEM.md): painéis arredondados, tiles de ícone com gradiente.
 *
 * @see docs/PLAN_PERSONAS_V4.md
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, User, Home, Users, MessageSquare, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, PERSONA_LABEL, PERSONA_TAGLINE } from '@/core/domain/personas';
import { canUsePlatformAdminPersona } from '@/core/services/personaService';
import { cn } from '@/core/lib/utils';

/**
 * Config de cada porta de entrada:
 *  - icon    : ícone lucide
 *  - to      : rota de entrada dedicada da persona
 *  - cta     : label do botão/chamada
 *  - gradient: gradiente do tile de ícone (classes tailwind)
 */
const ENTRIES = [
  {
    type: PERSONA_TYPE.ADOPTER,
    icon: Heart,
    to: '/feed',
    cta: 'Ver pets para adoção',
    gradient: 'from-rose-500 to-rose-600',
  },
  {
    type: PERSONA_TYPE.SHELTER_STAFF,
    icon: Home,
    to: '/entrar/abrigo',
    cta: 'Entrar / criar abrigo',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    type: PERSONA_TYPE.COMMUNITY_STAFF,
    icon: Users,
    to: '/entrar/comunidade',
    cta: 'Entrar / criar comunidade',
    gradient: 'from-sky-500 to-sky-600',
  },
  {
    type: PERSONA_TYPE.VOLUNTEER,
    icon: MessageSquare,
    to: '/voluntarios/seja',
    cta: 'Quero ser voluntário',
    gradient: 'from-violet-500 to-violet-600',
  },
  {
    type: PERSONA_TYPE.DONOR,
    icon: User,
    to: '/meus-pets',
    cta: 'Doar um pet',
    gradient: 'from-amber-500 to-amber-600',
  },
];

const ADMIN_ENTRY = {
  type: PERSONA_TYPE.PLATFORM_ADMIN,
  icon: Shield,
  to: '/admin',
  cta: 'Painel do admin master',
  gradient: 'from-slate-700 to-slate-900',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function EntryCard({ entry, variants }) {
  const { icon: Icon, type, to, cta, gradient } = entry;
  const label = PERSONA_LABEL[type];
  const tagline = PERSONA_TAGLINE[type];
  return (
    <motion.div variants={variants} whileHover={{ y: -4 }}>
      <Link
        to={to}
        className="arena-panel group flex h-full flex-col gap-3 rounded-[22px] p-[22px] transition"
        data-testid={`persona-entry-${type}`}
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-[15px] bg-gradient-to-br text-white shadow-sm',
            gradient,
          )}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-[16.5px] font-bold text-foreground">{label}</h3>
          <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">{tagline}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

export function PersonaEntryGrid() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const { userProfile } = useAuth();

  if (!enabled) return null;

  const isAdmin = canUsePlatformAdminPersona(userProfile);

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="px-4 sm:px-6 py-[38px]"
      data-testid="persona-entry-grid"
    >
      <div className="mx-auto max-w-[1080px]">
        <motion.div variants={fadeUp} className="mb-10 text-center">
          <span className="arena-chip mx-auto h-[30px] px-3.5 text-xs font-bold text-primary">
            <Sparkle /> Cada acesso, sua porta de entrada
          </span>
          <h2 className="mt-3.5 text-[30px] font-extrabold tracking-[-0.02em] text-foreground">
            Como você quer entrar?
          </h2>
          <p className="mx-auto mt-2.5 max-w-[520px] text-[14px] leading-[1.6] text-muted-foreground">
            Escolha o acesso que faz sentido para você agora. Depois é possível
            trocar ou adicionar outros acessos a qualquer momento.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRIES.map((entry) => (
            <EntryCard key={entry.type} entry={entry} variants={fadeUp} />
          ))}
          {/* Entrada de admin master — SOMENTE para o admin master */}
          {isAdmin && <EntryCard entry={ADMIN_ENTRY} variants={fadeUp} />}
        </div>
      </div>
    </motion.section>
  );
}

/** Pequeno ícone de brilho para o chip (evita import extra pesado). */
function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"
        fill="currentColor"
      />
    </svg>
  );
}

export default PersonaEntryGrid;
