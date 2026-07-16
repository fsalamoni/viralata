/**
 * @fileoverview VolunteerAuditTrail — histórico de auditoria do voluntário
 * (TASK-211).
 *
 * Mostra os últimos eventos de auditoria relacionados ao voluntário:
 * - signup, terms_accepted, profile_updated
 * - roster_updated (vínculo)
 * - participation_created/updated
 * - check_in/check_out
 * - data_anonymized (LGPD)
 *
 * Filtros: action type, período.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, UserPlus, FileCheck, UserCog, Link2, UserMinus,
  Calendar, LogIn, LogOut, ShieldOff, FileText, Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { AUDIT_ACTION_LABELS, formatAuditDate } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';

const ACTION_ICONS = {
  volunteer_terms_accepted: FileCheck,
  volunteer_joined_shelter: Link2,
  volunteer_profile_created: UserPlus,
  volunteer_profile_updated: UserCog,
  volunteer_roster_updated: UserCog,
  volunteer_roster_deleted: UserMinus,
  volunteer_participation_created: Calendar,
  volunteer_participation_updated: Calendar,
  volunteer_participation_deleted: UserMinus,
  volunteer_check_in: LogIn,
  volunteer_check_out: LogOut,
  volunteer_data_anonymized: ShieldOff,
  volunteer_consent_withdrawn: Shield,
};

const ACTION_TONES = {
  volunteer_terms_accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  volunteer_joined_shelter: 'bg-blue-100 text-blue-800 border-blue-200',
  volunteer_profile_created: 'bg-blue-100 text-blue-800 border-blue-200',
  volunteer_profile_updated: 'bg-amber-100 text-amber-800 border-amber-200',
  volunteer_roster_updated: 'bg-amber-100 text-amber-800 border-amber-200',
  volunteer_roster_deleted: 'bg-rose-100 text-rose-700 border-rose-200',
  volunteer_participation_created: 'bg-blue-100 text-blue-800 border-blue-200',
  volunteer_participation_updated: 'bg-amber-100 text-amber-800 border-amber-200',
  volunteer_participation_deleted: 'bg-rose-100 text-rose-700 border-rose-200',
  volunteer_check_in: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  volunteer_check_out: 'bg-slate-100 text-slate-700 border-slate-200',
  volunteer_data_anonymized: 'bg-slate-100 text-slate-700 border-slate-200',
  volunteer_consent_withdrawn: 'bg-rose-100 text-rose-700 border-rose-200',
};

const VOLUNTEER_ACTIONS = Object.keys(ACTION_ICONS);

export function VolunteerAuditTrail({ volunteerUid, max = 50 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    if (!volunteerUid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Query audit_logs filtrado por actor
        const constraints = [where('actor.uid', '==', volunteerUid)];
        constraints.push(orderBy('created_at', 'desc'));
        constraints.push(limit(max));
        const q = query(collection(db, 'audit_logs'), ...constraints);
        const snap = await getDocs(q);
        if (!cancelled) {
          setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          logger.warn('VolunteerAuditTrail', { err: String(err) });
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [volunteerUid, max]);

  const filtered = useMemo(() => {
    let items = events.filter((e) => VOLUNTEER_ACTIONS.includes(e.action));
    if (actionFilter !== 'all') {
      items = items.filter((e) => e.action === actionFilter);
    }
    return items;
  }, [events, actionFilter]);

  if (!volunteerUid) return null;

  if (loading) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Histórico de auditoria
          </h3>
        </div>
        <div className="arena-section-card-body space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-2/3" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Histórico de auditoria
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={Shield}
            title="Não foi possível carregar"
            description={error}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Histórico de auditoria ({filtered.length})
        </h3>
      </div>
      <div className="arena-section-card-body space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="action-filter">Filtrar por ação</Label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todas as ações de voluntário</option>
              {VOLUNTEER_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABELS[a] || a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum evento de auditoria"
            description="Nenhuma ação de voluntário registrada para este usuário."
          />
        ) : (
          <ol className="space-y-2" aria-label="Eventos de auditoria do voluntário">
            {filtered.map((ev) => {
              const Icon = ACTION_ICONS[ev.action] || Shield;
              const tone = ACTION_TONES[ev.action] || 'bg-slate-100 text-slate-700';
              return (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border/40 hover:bg-muted/30"
                  data-testid={`audit-${ev.id}`}
                >
                  <div className={`p-2 rounded-full ${tone} shrink-0`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {AUDIT_ACTION_LABELS[ev.action] || ev.action}
                      </p>
                      <Badge className={`text-[10px] ${tone}`}>
                        {ev.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatAuditDate(ev.created_at, ev._ms)}
                    </p>
                    {ev.details && Object.keys(ev.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {Object.entries(ev.details).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="mr-2">{k}={String(v).substring(0, 30)}</span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export default VolunteerAuditTrail;
