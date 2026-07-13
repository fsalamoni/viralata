/**
 * @fileoverview InterviewCard — card de entrevista (TASK-290).
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Video, Phone, MapPin, CheckCircle2, XCircle, Star, ClipboardList } from 'lucide-react';
import { INTERVIEW_STATUS } from '../schemas/interviewSchema';

const STATUS_LABEL = {
  [INTERVIEW_STATUS.PROPOSED]: 'Proposta',
  [INTERVIEW_STATUS.SCHEDULED]: 'Agendada',
  [INTERVIEW_STATUS.COMPLETED]: 'Concluída',
  [INTERVIEW_STATUS.EVALUATED]: 'Avaliada',
  [INTERVIEW_STATUS.CANCELLED]: 'Cancelada',
};

const STATUS_VARIANT = {
  [INTERVIEW_STATUS.PROPOSED]: 'secondary',
  [INTERVIEW_STATUS.SCHEDULED]: 'default',
  [INTERVIEW_STATUS.COMPLETED]: 'default',
  [INTERVIEW_STATUS.EVALUATED]: 'default',
  [INTERVIEW_STATUS.CANCELLED]: 'destructive',
};

const MODE_ICON = {
  in_person: MapPin,
  video: Video,
  phone: Phone,
};

const MODE_LABEL = {
  in_person: 'Presencial',
  video: 'Vídeo',
  phone: 'Telefone',
};

export function InterviewCard({ interview, onComplete, onEvaluate, onCancel, canAct = true }) {
  const { id, status, mode, scheduled_at, applicant_name, checklist = [], evaluation_stars, evaluation_notes, notes } = interview;
  const ModeIcon = MODE_ICON[mode] || Calendar;
  const completed = (checklist || []).filter((c) => c.done).length;
  const total = (checklist || []).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Entrevista
            </CardTitle>
            <CardDescription className="text-xs">
              {applicant_name} · {id.slice(0, 12)}…
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[status] || 'outline'}>
            {STATUS_LABEL[status] || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {scheduled_at && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <ModeIcon className="h-4 w-4" /> {MODE_LABEL[mode] || mode} ·{' '}
              {new Date(scheduled_at).toLocaleString('pt-BR')}
            </p>
          )}
          {checklist.length > 0 && (
            <p className="text-muted-foreground">
              Checklist: {completed}/{total} concluído
              {total > 0 && ` (${Math.round((completed / total) * 100)}%)`}
            </p>
          )}
          {notes && (
            <p className="text-xs text-muted-foreground italic">&ldquo;{notes}&rdquo;</p>
          )}
          {evaluation_stars && (
            <p className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < evaluation_stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
              {evaluation_notes && (
                <span className="text-xs text-muted-foreground ml-2">&ldquo;{evaluation_notes}&rdquo;</span>
              )}
            </p>
          )}
        </div>
        {canAct && (
          <div className="flex gap-2 mt-3">
            {status === INTERVIEW_STATUS.SCHEDULED && onComplete && (
              <Button size="sm" onClick={() => onComplete(id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
              </Button>
            )}
            {status === INTERVIEW_STATUS.COMPLETED && onEvaluate && (
              <Button size="sm" onClick={() => onEvaluate(id)}>
                <Star className="h-4 w-4 mr-1" /> Avaliar
              </Button>
            )}
            {(status === INTERVIEW_STATUS.PROPOSED || status === INTERVIEW_STATUS.SCHEDULED) && onCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(id)}>
                <XCircle className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
