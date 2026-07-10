/**
 * @fileoverview Componente: VolunteersList (Fase 13).
 *
 * Lista de voluntários do abrigo (perfis) com filtros por skill e dia
 * de disponibilidade. Cards mostram skills, certificações, agenda
 * semanal e status ativo/inativo.
 *
 * Feature flag: `shelter_volunteers` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (voluntários)
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_SKILL_SUGGESTIONS,
  DAY_OF_WEEK_LABELS,
  isVolunteerAvailableAt,
  filterProfilesBySkills,
} from '@/modules/shelter/domain/operational/volunteer';
import { useVolunteerProfilesByIds } from '@/modules/shelter/hooks/useVolunteers';

const ACTIVE_TONES = {
  true: 'bg-green-100 text-green-900',
  false: 'bg-zinc-100 text-zinc-700',
};

function formatTimeRange(slot) {
  if (!slot) return '';
  return `${slot.from}–${slot.to}`;
}

function WeeklyAgenda({ availability = [] }) {
  // Renderiza um mini-grid 7 dias (seg → dom). Cada dia mostra um bullet
  // se há algum slot, com a faixa de horário.
  const byDay = useMemo(() => {
    const m = {};
    for (const s of availability || []) {
      if (!m[s.day_of_week]) m[s.day_of_week] = [];
      m[s.day_of_week].push(s);
    }
    return m;
  }, [availability]);

  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {order.map((d) => {
        const slots = byDay[d] || [];
        return (
          <div key={d} className="rounded border border-border p-1">
            <div className="font-medium text-[10px] text-muted-foreground">
              {DAY_OF_WEEK_LABELS[d].slice(0, 3)}
            </div>
            <div className="text-[11px] text-foreground mt-1">
              {slots.length === 0
                ? <span className="text-muted-foreground">—</span>
                : slots.map((s, i) => (
                  <div key={i}>{formatTimeRange(s)}</div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VolunteersList({ userIds = [], canEdit = false }) {
  const [skillFilter, setSkillFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const { data: profiles = [], isLoading } = useVolunteerProfilesByIds(userIds);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let list = profiles;
    if (skillFilter) {
      list = filterProfilesBySkills(list, skillFilter);
    }
    if (dayFilter) {
      // Filtra por cobertura mínima no dia: se o dia tem QUALQUER slot,
      // mantém. (Comparação refinada possível no futuro.)
      list = list.filter((p) => (p.availability || []).some(
        (s) => s.day_of_week === dayFilter,
      ));
    }
    return list;
  }, [profiles, skillFilter, dayFilter]);

  if (userIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum voluntário cadastrado ainda.
      </p>
    );
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando voluntários…</p>;

  const handleCopyEmail = (displayName) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(displayName);
      toast({ title: 'Nome copiado', description: displayName });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Voluntários</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {filtered.length} de {profiles.length} voluntário(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <select
              className="rounded border border-border px-2 py-1 text-xs"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              aria-label="Filtrar por skill"
            >
              <option value="">Todas as skills</option>
              {VOLUNTEER_SKILL_SUGGESTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="rounded border border-border px-2 py-1 text-xs"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              aria-label="Filtrar por dia de disponibilidade"
            >
              <option value="">Qualquer dia</option>
              {Object.entries(DAY_OF_WEEK_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {(skillFilter || dayFilter) && (
              <Button
                size="sm" variant="ghost"
                onClick={() => { setSkillFilter(''); setDayFilter(''); }}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum voluntário {(skillFilter || dayFilter) ? 'com esses filtros' : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {filtered.map((p) => {
              const isActive = p.active !== false;
              return (
                <li key={p.id || p.user_id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <button
                          type="button"
                          className="text-sm font-semibold text-foreground hover:underline"
                          onClick={() => handleCopyEmail(p.display_name)}
                          aria-label="Copiar nome"
                        >
                          {p.display_name}
                        </button>
                        <Badge className={ACTIVE_TONES[String(isActive)] || ''}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {p.notes && (
                          <span className="text-xs text-muted-foreground italic">
                            {p.notes.slice(0, 80)}{p.notes.length > 80 ? '…' : ''}
                          </span>
                        )}
                      </div>

                      {p.skills && p.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.skills.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {p.certifications && p.certifications.length > 0 && (
                        <details className="mb-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:underline">
                            {p.certifications.length} certificação(ões)
                          </summary>
                          <ul className="mt-1 ml-4 text-xs text-foreground list-disc">
                            {p.certifications.map((c, i) => (
                              <li key={i}>
                                {c.name}
                                {c.issuer && ` — ${c.issuer}`}
                                {c.year && ` (${c.year})`}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}

                      <WeeklyAgenda availability={p.availability || []} />

                      {isVolunteerAvailableAt(p.availability, 'saturday', '10:00') && (
                        <p className="text-xs text-green-700 mt-2">
                          ✓ Disponível sábado de manhã
                        </p>
                      )}

                      {p.hours_logged_total > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Histórico: {p.hours_logged_total.toFixed(1)}h registradas
                          {p.transport_provided_count > 0 && `, ${p.transport_provided_count} transporte(s) ida`}
                          {p.transport_return_count > 0 && `, ${p.transport_return_count} volta`}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.alert('Convocar voluntário: ação a ser implementada no painel do abrigo.');
                            }
                          }}
                        >
                          Convocar
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
