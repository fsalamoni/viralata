/**
 * @fileoverview PersonaTopbar — navegação do header (desktop) e CTAs
 * adaptados à PERSONA ATIVA, a partir da fonte única personaCapabilities.
 *
 * Montado pelo Layout SOMENTE quando a flag V4_PERSONA_ENABLED está ligada
 * (com a flag OFF o Layout mantém o NAV_ITEMS clássico) — assim
 * useActivePersona só roda quando a V4 está ativa. Resolve o pedido de
 * "topbar se adapta à persona" (ex.: só o Adotante tem Feed).
 *
 * @see docs/PERSONA_CAPABILITIES.md
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { getPersonaCapabilities } from '@/core/domain/personaCapabilities';
import { cn } from '@/core/lib/utils';

// Atalhos universais (toda persona precisa) — acrescentados ao menu mobile.
const UNIVERSAL_MOBILE_ITEMS = [
  { label: 'Meu Perfil', to: '/perfil', icon: User },
  { label: 'Preferências', to: '/preferencias', icon: ShieldCheck },
];

/** Nav do header (desktop) segmentada por persona. */
export function PersonaTopbarNav() {
  const { active } = useActivePersona();
  const location = useLocation();
  const items = getPersonaCapabilities(active).topbarNav || [];

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
      {items.map(({ label, to, icon: Icon }) => {
        const base = to.split('?')[0].split('#')[0];
        const isActive = location.pathname === base || location.pathname.startsWith(`${base}/`);
        return (
          <Link
            key={`${to}-${label}`}
            to={to}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_rgba(64,34,18,0.55)]'
                : 'text-foreground/70 hover:bg-secondary/70',
            )}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** CTAs do header (ex.: "Cadastrar pet" só para o Doador). */
export function PersonaHeaderCTAs() {
  const { active } = useActivePersona();
  const ctas = getPersonaCapabilities(active).headerCTAs || [];
  if (ctas.length === 0) return null;
  return (
    <>
      {ctas.map(({ label, to }) => (
        <Button key={to} asChild size="sm">
          <Link to={to}>{label}</Link>
        </Button>
      ))}
    </>
  );
}

/** Itens do menu mobile (hambúrguer) por persona + atalhos universais. */
export function PersonaMobileNav({ onNavigate }) {
  const { active } = useActivePersona();
  const location = useLocation();
  const items = [...(getPersonaCapabilities(active).topbarNav || []), ...UNIVERSAL_MOBILE_ITEMS];
  return (
    <>
      {items.map(({ label, to, icon: Icon }) => {
        const base = to.split('?')[0].split('#')[0];
        const isActive = location.pathname === base || location.pathname.startsWith(`${base}/`);
        return (
          <Link
            key={`${to}-${label}`}
            to={to}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-secondary/70',
            )}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {label}
          </Link>
        );
      })}
    </>
  );
}

export default PersonaTopbarNav;
