/**
 * @fileoverview ShelterPicker — dropdown no TopBar para selecionar abrigo ativo.
 *
 * D-PERSONA-MULTI-CLUB (Q17): usado na persona 'shelter_staff' quando
 * o user é membro de 2+ abrigos. Mostra badge numérica, dropdown
 * com lista de abrigos, troca instantânea.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useUserClubMemberships } from '@/modules/organizations/hooks/useUserClubMemberships';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, buildPersonaKey } from '@/core/domain/personas';
import { cn } from '@/core/lib/utils';

export function ShelterPicker() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_SHELTER_STAFF);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active, setActive } = useActivePersona();
  const { data: memberships = [], isLoading } = useUserClubMemberships(user?.uid);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Só renderiza se persona ativa é shelter_staff e tem 2+ memberships
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
  if (active && active.type !== PERSONA_TYPE.SHELTER_STAFF) return null;
  if (isLoading) return null;
  if (memberships.length < 1) return null;

  const activeClub = memberships.find((m) => m.club?.id === active?.scopeId)?.club;

  const handleSelect = async (clubId) => {
    await setActive(buildPersonaKey(PERSONA_TYPE.SHELTER_STAFF, clubId));
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
        data-testid="shelter-picker-button"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {activeClub?.name || activeClub?.title || 'Abrigo'}
        </span>
        {memberships.length > 1 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {memberships.length}
          </span>
        )}
        {memberships.length > 1 && (
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        )}
      </button>

      {open && memberships.length > 1 && (
        <div
          role="menu"
          aria-label="Selecionar abrigo"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl"
          data-testid="shelter-picker-dropdown"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Abrigos
          </div>
          <ul className="space-y-0.5">
            {memberships.map((m) => {
              const club = m.club;
              if (!club) return null;
              const isActive = club.id === active?.scopeId;
              return (
                <li key={club.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(club.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                    data-testid={`shelter-option-${club.id}`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{club.name || club.title || 'Abrigo'}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.role === 'admin' ? 'Admin' : 'Membro'}
                      </p>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/entrar/abrigo');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-primary transition hover:bg-primary/5"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Adicionar outro abrigo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShelterPicker;
