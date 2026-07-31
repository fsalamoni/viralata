/**
 * @fileoverview RecordStatusBadge — badge de status de agendamento para as
 * listas médicas/operacionais do pet (consultas, tratamentos, medicações,
 * cuidados, vacinas, adoções, devoluções).
 *
 * Usa o mesmo modelo de `petOpsScheduling`. Só aparece para registros
 * AGENDADOS ou ATRASADOS (os realizados normais não recebem badge, para
 * não poluir a lista). Mostra o rótulo de proximidade (hoje / amanhã /
 * em N dias / atrasada há N dias).
 */
import { CalendarClock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/lib/utils';
import {
  recordStatus,
  proximityLabel,
  PET_OPS_RECORD_STATUS,
  PET_OPS_STATUS_LABELS,
} from '@/modules/shelter/domain/operational/petOpsScheduling';

const TONE = {
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function RecordStatusBadge({ record, className }) {
  const status = recordStatus(record);
  // Registros já realizados (sem agendamento) não recebem badge.
  if (status === PET_OPS_RECORD_STATUS.DONE) return null;
  const prox = proximityLabel(record);
  const Icon = status === PET_OPS_RECORD_STATUS.OVERDUE ? AlertTriangle : CalendarClock;
  return (
    <Badge className={cn('inline-flex items-center gap-1', TONE[status], className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PET_OPS_STATUS_LABELS[status]}{prox ? ` · ${prox}` : ''}
    </Badge>
  );
}

export default RecordStatusBadge;
