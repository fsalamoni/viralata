/**
 * @fileoverview PetLog — log imutável de todas as mudanças do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): subcoleção pets/{petId}/pet_audit_log.
 * Mostra TODAS as operações (criação, update, delete, subcoleções) com
 * quem fez, quando e o que mudou.
 */
import React from 'react';
import {
  Circle, Sparkles, Edit, Trash2, Stethoscope, Pill, Bath,
  RotateCcw, Users, MessageSquare,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { usePetLog } from '../hooks/usePetLog';
import { parseTimestamp } from '@/core/utils/timestamp';
import { cn } from '@/core/lib/utils';

const ICON_MAP = {
  Sparkles, Edit, Trash2, Stethoscope, Pill, Bath, RotateCcw, Users, MessageSquare, Circle,
};

const COLOR_BG = {
  primary: 'bg-primary/10 text-primary',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400',
};

const LABELS = {
  pet_created: 'Pet cadastrado',
  pet_updated: 'Pet atualizado',
  pet_deleted: 'Pet removido',
  vet_visit_created: 'Consulta veterinária registrada',
  vet_visit_updated: 'Consulta veterinária atualizada',
  vet_visit_deleted: 'Consulta veterinária removida',
  treatment_created: 'Tratamento iniciado',
  treatment_updated: 'Tratamento atualizado',
  treatment_deleted: 'Tratamento removido',
  care_log_created: 'Cuidado registrado',
  care_log_updated: 'Cuidado atualizado',
  care_log_deleted: 'Cuidado removido',
  medication_created: 'Medicação registrada',
  medication_updated: 'Medicação atualizada',
  medication_deleted: 'Medicação removida',
  devolution_created: 'Devolução registrada',
  devolution_updated: 'Devolução atualizada',
  devolution_deleted: 'Devolução removida',
  adopter_history_created: 'Adotante registrado',
  adopter_history_updated: 'Adotante atualizado',
  adopter_history_deleted: 'Adotante removido',
  note_created: 'Anotação adicionada',
  note_deleted: 'Anotação removida',
};

const COLORS = {
  pet_created: 'rose',
  pet_updated: 'sky',
  pet_deleted: 'slate',
  vet_visit_created: 'emerald',
  vet_visit_updated: 'emerald',
  vet_visit_deleted: 'slate',
  treatment_created: 'amber',
  treatment_updated: 'amber',
  treatment_deleted: 'slate',
  care_log_created: 'sky',
  care_log_updated: 'sky',
  care_log_deleted: 'slate',
  medication_created: 'rose',
  medication_updated: 'rose',
  medication_deleted: 'slate',
  devolution_created: 'rose',
  devolution_updated: 'rose',
  devolution_deleted: 'slate',
  adopter_history_created: 'emerald',
  adopter_history_updated: 'emerald',
  adopter_history_deleted: 'slate',
  note_created: 'sky',
  note_deleted: 'slate',
};

function formatDate(d) {
  if (!d) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function describeAction(log) {
  const d = log.details || {};
  if (Array.isArray(d.changed_fields) && d.changed_fields.length) {
    return `Campos: ${d.changed_fields.join(', ')}`;
  }
  if (d.text_preview) return `"${d.text_preview}"`;
  if (d.reason_preview) return `Motivo: "${d.reason_preview}"`;
  if (d.name) return `${d.name}${d.dosage ? ` (${d.dosage})` : ''}`;
  return '';
}

export default function PetLog({ petId }) {
  const { data: log = [], isLoading } = usePetLog(petId, 200);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <EmptyState
        icon={Circle}
        title="Nenhuma mudança registrada ainda"
        description="O log é preenchido automaticamente quando alguém altera o cadastro do pet."
      />
    );
  }

  return (
    <ol
      className="space-y-2"
      data-testid="pet-log-list"
    >
      {log.map((entry) => {
        const Icon = ICON_MAP[ICON_MAP_STRING[entry.action] || 'Circle'] || Circle;
        const color = COLORS[entry.action] || 'primary';
        const label = LABELS[entry.action] || entry.action;
        const date = parseTimestamp(entry.created_at);
        const description = describeAction(entry);
        return (
          <li
            key={entry.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            data-testid="pet-log-entry"
          >
            <span className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              COLOR_BG[color],
            )}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-bold text-foreground">{label}</p>
                <span className="text-[10.5px] text-muted-foreground">•</span>
                <p className="text-[10.5px] text-muted-foreground">{formatDate(date)}</p>
              </div>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                por <span className="font-semibold text-foreground">{entry.actor_name || 'Sistema'}</span>
                {entry.target_collection && (
                  <>
                    {' '}
                    • coleção <code className="rounded bg-secondary px-1 font-mono text-[10px]">{entry.target_collection}</code>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Mapeia action → nome do ícone (string). Mapeamento client-side para
// permitir tree-shaking correto no Rollup.
const ICON_MAP_STRING = {
  pet_created: 'Sparkles',
  pet_updated: 'Edit',
  pet_deleted: 'Trash2',
  vet_visit_created: 'Stethoscope',
  vet_visit_updated: 'Stethoscope',
  vet_visit_deleted: 'Stethoscope',
  treatment_created: 'Pill',
  treatment_updated: 'Pill',
  treatment_deleted: 'Pill',
  care_log_created: 'Bath',
  care_log_updated: 'Bath',
  care_log_deleted: 'Bath',
  medication_created: 'Pill',
  medication_updated: 'Pill',
  medication_deleted: 'Pill',
  devolution_created: 'RotateCcw',
  devolution_updated: 'RotateCcw',
  devolution_deleted: 'RotateCcw',
  adopter_history_created: 'Users',
  adopter_history_updated: 'Users',
  adopter_history_deleted: 'Users',
  note_created: 'MessageSquare',
  note_deleted: 'MessageSquare',
};
