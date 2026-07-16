/**
 * @fileoverview VolunteerShiftsBrowse — lista escalas (shifts) abertas
 * para voluntário se candidatar (TASK-207).
 *
 * **Schema esperado**:
 *   clubs/{clubId}/exhibitions/{exhibitionId}/shifts/{shiftId}
 *   { start_at, end_at, role, slots_total, slots_filled }
 *
 * **UX**:
 * - Lista escalas futuras abertas (slots_filled < slots_total)
 * - Mostra abrigo, role, horário, vagas
 * - Botão "Quero participar" (call onApply)
 *
 * Multi-tenant: collectionGroup query em 'shifts' subcollection.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, Users, MapPin, Building2, Calendar, ArrowRight } from 'lucide-react';
import { logger } from '@/core/lib/logger';
import { toast } from 'sonner';
import { createParticipation } from '@/modules/shelter/services/volunteerParticipationService';

const ROLE_LABELS = {
  caregiver: 'Cuidador',
  transport: 'Transporte',
  reception: 'Recepção',
  photographer: 'Fotógrafo',
  vet: 'Veterinário',
  general: 'Apoio geral',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function durationHours(start, end) {
  if (!start || !end) return null;
  const s = typeof start === 'string' ? new Date(start) : start?.toDate?.() || null;
  const e = typeof end === 'string' ? new Date(end) : end?.toDate?.() || null;
  if (!s || !e) return null;
  return Math.round((e - s) / (1000 * 60 * 60));
}

export function VolunteerShiftsBrowse({ actor, max = 30 }) {
  const [shifts, setShifts] = useState([]);
  const [exhibitions, setExhibitions] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // collectionGroup query em 'shifts'
        const constraints = [orderBy('start_at', 'asc'), limit(max)];
        const q = query(collection(db, 'shifts'), ...constraints);
        const snap = await getDocs(q);
        if (cancelled) return;
        const now = new Date();
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => {
            const start = typeof s.start_at === 'string' ? new Date(s.start_at) : s.start_at?.toDate?.();
            return start && start >= now;
          })
          .filter((s) => (s.slots_filled || 0) < (s.slots_total || 1));
        setShifts(items);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('VolunteerShiftsBrowse', { err: String(err) });
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [max]);

  const handleApply = async (shift) => {
    if (!actor?.uid) {
      toast.error('Você precisa estar logado para se candidatar');
      return;
    }
    setApplying(shift.id);
    try {
      await createParticipation(
        shift.shelter_club_id,
        {
          volunteer_uid: actor.uid,
          volunteer_name: actor.displayName || actor.email?.split('@')[0] || 'Voluntário',
          event_type: 'exhibition',
          event_id: shift.exhibition_id,
          exhibition_id: shift.exhibition_id,
          event_label: shift.event_label || 'Vitrine',
          event_date: shift.start_at,
          role: shift.role || 'general',
          terms_accepted_at: new Date().toISOString(),
        },
        { uid: actor.uid, displayName: actor.displayName },
      );
      toast.success('Candidatura enviada! O abrigo vai confirmar.');
    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Escalas abertas
          </h3>
        </div>
        <div className="arena-section-card-body space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Escalas abertas
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={Calendar}
            title="Erro ao carregar escalas"
            description={error}
          />
        </div>
      </section>
    );
  }

  if (shifts.length === 0) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Escalas abertas
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={Calendar}
            title="Nenhuma escala aberta no momento"
            description="Volte mais tarde — os abrigos abrem escalas frequentemente."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Escalas abertas ({shifts.length})
        </h3>
      </div>
      <div className="arena-section-card-body">
        <ul className="space-y-3" aria-label="Escalas abertas para candidatura">
          {shifts.map((s) => {
            const dur = durationHours(s.start_at, s.end_at);
            const filled = s.slots_filled || 0;
            const total = s.slots_total || 1;
            const remaining = total - filled;
            return (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/40 hover:bg-muted/30"
                data-testid={`shift-${s.id}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[s.role] || s.role}
                    </Badge>
                    {s.shelter_name && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {s.shelter_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {s.event_label || 'Vitrine'} — {formatDate(s.start_at)}
                  </p>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(s.start_at)} → {formatTime(s.end_at)}
                      {dur && ` (${dur}h)`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {remaining} de {total} vaga{remaining === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApply(s)}
                  disabled={applying === s.id}
                >
                  {applying === s.id ? 'Enviando...' : (
                    <>Participar <ArrowRight className="h-3 w-3 ml-1" /></>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default VolunteerShiftsBrowse;
