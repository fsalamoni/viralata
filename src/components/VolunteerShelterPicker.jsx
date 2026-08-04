/**
 * @fileoverview VolunteerShelterPicker — dropdown para voluntário multi-roster.
 *
 * D-PERSONA-MULTI-ROSTER-ISOLATED (Q18): voluntário em 2+ abrigos
 * seleciona qual operar. Cada abrigo tem escalas, tarefas e
 * audit trail isolados.
 *
 * Usa `useUserVolunteerRosters` para listar abrigos onde o user
 * é voluntário ativo.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useState, useRef, useEffect } from 'react';
import { Heart, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useUserVolunteerRosters } from '@/modules/shelter/hooks/useVolunteerProfile';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, buildPersonaKey } from '@/core/domain/personas';
import { cn } from '@/core/lib/utils';

export function VolunteerShelterPicker() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_VOLUNTEER);
  const { user } = useAuth();
  const { active, setActive } = useActivePersona();
  const { data: rosters = [], isLoading } = useUserVolunteerRosters(user?.uid, { status: 'active' });
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Click-outside — SEMPRE ANTES de early return (D-HOOKS-ORDER-PRESERVE)
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!v4Enabled) return null;
  if (!user) return null;
  if (active && active.type !== PERSONA_TYPE.VOLUNTEER) return null;
  if (isLoading) return null;
  if (rosters.length < 1) return null;

  const activeRoster = rosters.find((r) => r.club_id === active?.scopeId || r.id === active?.scopeId);

  const handleSelect = async (clubId) => {
    await setActive(buildPersonaKey(PERSONA_TYPE.VOLUNTEER, clubId));
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-card',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        data-testid="volunteer-picker-button"
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {activeRoster?.club_name || activeRoster?.name || (rosters.length === 1 ? rosters[0]?.club_name || 'Abrigo' : 'Selecionar abrigo')}
        </span>
        {rosters.length > 1 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {rosters.length}
          </span>
        )}
        {rosters.length > 1 && (
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        )}
      </button>

      {open && rosters.length > 1 && (
        <div
          role="menu"
          aria-label="Selecionar abrigo de voluntariado"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Abrigos (voluntariado)
          </div>
          <ul className="space-y-0.5">
            {rosters.map((r) => {
              const isActive = (r.club_id || r.id) === active?.scopeId;
              return (
                <li key={r.club_id || r.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(r.club_id || r.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{r.club_name || r.name || 'Abrigo'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.status === 'active' ? 'Ativo' : r.status}
                      </p>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VolunteerShelterPicker;
