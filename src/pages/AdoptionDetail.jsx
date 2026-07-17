/**
 * @fileoverview AdoptionDetail — página individual de um pedido de
 * adoção (TASK-130 / Regra A Eixo 1).
 *
 * Rota: /adocoes/:clubId/:applicationId (auth required — as rules do
 * Firestore só liberam leitura para o próprio applicant, o abrigo
 * dono ou platform_admin; a página é do applicant).
 *
 * Mostra a timeline do pedido (enviado → decisão → conclusão), o
 * registro do aceite do Termo de Adoção (quando presente) e link
 * para o pet.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Circle, XCircle, FileText, Undo2, PauseCircle,
  Send, BookCheck, ClipboardCheck, Award, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { getApplication } from '@/modules/shelter/services/adoptionService';
import { getPostAdoption } from '@/modules/shelter/services/postAdoptionService';
import { parseTimestamp } from '@/core/utils/timestamp';
import { PostAdoptionReturnDialog } from '@/modules/shelter/components/PostAdoptionReturnDialog';
import { PostAdoptionPauseDialog } from '@/modules/shelter/components/PostAdoptionPauseDialog';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  isTerminal,
} from '@/modules/shelter/domain/operational/adoption';
import { cn } from '@/core/lib/utils';

function formatDateTime(value) {
  const d = value?.toDate ? parseTimestamp(value) : (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Cor por status
const STATUS_COLOR = {
  applied: { icon: Send, dot: 'bg-primary', text: 'text-primary', label: 'bg-primary/10 text-primary' },
  terms_accepted: { icon: BookCheck, dot: 'bg-accent', text: 'text-accent', label: 'bg-accent/10 text-accent' },
  under_review: { icon: ClipboardCheck, dot: 'bg-amber-500', text: 'text-amber-600', label: 'bg-amber-50 text-amber-700' },
  approved: { icon: CheckCircle2, dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'bg-emerald-50 text-emerald-700' },
  rejected: { icon: XCircle, dot: 'bg-destructive', text: 'text-destructive', label: 'bg-destructive/10 text-destructive' },
  cancelled: { icon: XCircle, dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'bg-secondary text-muted-foreground' },
  withdrawn: { icon: XCircle, dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'bg-secondary text-muted-foreground' },
  adoption_completed: { icon: Award, dot: 'bg-highlight', text: 'text-highlight', label: 'bg-highlight/10 text-highlight-foreground' },
};

function getStepColor(key, failed, done) {
  if (failed) return STATUS_COLOR.rejected;
  if (!done) return { icon: Circle, dot: 'bg-muted-foreground/30', text: 'text-muted-foreground', label: 'bg-secondary text-muted-foreground' };
  return STATUS_COLOR.approved;
}

/**
 * Constrói a timeline a partir dos campos do doc. Agrupa por fase:
 * 1. Submissão — criação + aceite do termo
 * 2. Decisão — análise + resultado final
 */
function buildTimeline(app) {
  const phases = [
    {
      label: 'Submissão',
      steps: [
        {
          key: 'created',
          label: 'Pedido enviado',
          at: formatDateTime(app.created_at),
          done: true,
        },
      ],
    },
  ];

  if (app.terms_accepted_at) {
    phases[0].steps.push({
      key: 'terms',
      label: `Termo de Adoção aceito (v${app.terms_version})`,
      at: formatDateTime(app.terms_accepted_at),
      done: true,
    });
  }

  const decided = Boolean(app.decided_at);
  phases.push({
    label: 'Decisão do abrigo',
    steps: [
      {
        key: 'review',
        label: 'Análise do abrigo',
        at: decided ? formatDateTime(app.decided_at) : null,
        done: decided || app.status !== 'applied',
      },
      {
        key: 'final',
        label: APPLICATION_STATUS_LABELS[app.status] || app.status,
        at: decided ? formatDateTime(app.decided_at) : null,
        done: isTerminal(app.status) || app.status === 'approved',
        failed: ['rejected', 'cancelled', 'withdrawn'].includes(app.status),
      },
    ],
  });

  return phases;
}

function TimelineStep({ step }) {
  const color = getStepColor(step.key, step.failed, step.done);
  const Icon = color.icon;

  return (
    <li key={step.key} className="relative flex items-start gap-3">
      <div className="relative flex flex-col items-center">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border-2', step.failed ? 'border-destructive bg-destructive/10' : step.done ? 'border-[currentColor] bg-background' : 'border-muted-foreground/30 bg-background')}>
          <Icon className={cn('h-3.5 w-3.5', color.text)} />
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className={cn('text-sm', step.done && !step.failed ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {step.label}
        </p>
        {step.at ? (
          <p className="text-[11.5px] text-muted-foreground">{step.at}</p>
        ) : (
          !step.failed && (
            <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Aguardando</span>
            </div>
          )
        )}
      </div>
    </li>
  );
}

/**
 * Loading skeleton — espelha o layout real da página.
 * ANTES: mostrava só skeletons soltos sem wrapper arena-section-card,
 * fazendo a transição loading→conteúdo parecer um salto de layout.
 */
function LoadingSkeleton({ wrapperClass }) {
  return (
    <div className={wrapperClass}>
      {/* Back button skeleton */}
      <Skeleton className="h-8 w-44 rounded-lg mb-3" />
      {/* Card skeleton */}
      <section className="arena-section-card rounded-2xl p-6 lg:p-7">
        <div className="arena-section-card-header">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 rounded mt-1.5" />
        </div>
        <div className="arena-section-card-body p-0 pt-4 space-y-6">
          {/* Fase 1 skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
              {[1, 2].map((i) => (
                <li key={i} className="relative flex items-start gap-3">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdoptionDetail() {
  const { clubId, applicationId } = useParams();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto w-full max-w-2xl px-4 py-6 sm:px-6');
  const returnEnabled = useFeatureFlag(FEATURE_FLAG.SHELTER_POST_ADOPTION_RETURN);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['application', clubId, applicationId],
    queryFn: () => getApplication(clubId, applicationId),
    enabled: Boolean(clubId && applicationId),
  });

  if (isLoading) {
    return <LoadingSkeleton wrapperClass={wrapperClass} />;
  }

  if (isError || !app) {
    return (
      <div className={wrapperClass}>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
          <Link to="/perfil#adocoes">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Minhas adoções
          </Link>
        </Button>
        <EmptyState
          icon={FileText}
          title="Pedido não encontrado"
          description="Este pedido de adoção não existe ou você não tem acesso a ele."
          action={
            <Button asChild variant="outline">
              <Link to="/perfil#adocoes">Voltar ao perfil</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const phases = buildTimeline(app);

  // Post-adoption record (only fetched when feature flag is on and app is completed)
  const { data: postAdoption } = useQuery({
    queryKey: ['postAdoption', clubId, applicationId],
    queryFn: () => getPostAdoption(clubId, applicationId),
    enabled: Boolean(returnEnabled && clubId && applicationId && app?.status === 'adoption_completed'),
  });

  const showPostAdoptionActions =
    returnEnabled && app?.status === 'adoption_completed';

  return (
    <div className={wrapperClass}>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/perfil#adocoes">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Minhas adoções
        </Link>
      </Button>

      <section className="arena-section-card p-6 lg:p-7">
        <div className="arena-section-card-header">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="arena-section-card-title">Pedido de adoção</h3>
            <Badge className={APPLICATION_STATUS_TONES[app.status] || ''}>
              {APPLICATION_STATUS_LABELS[app.status] || app.status}
            </Badge>
          </div>
          <p className="arena-section-card-description text-[12.5px]">
            Enviado em {formatDateTime(app.created_at) || '—'}
            {app.pet_id && (
              <>
                {' · '}
                <Link to={`/pet/${app.pet_id}`} className="text-primary underline">Ver pet</Link>
              </>
            )}
          </p>
        </div>

        {/* Timeline grouped by phase */}
        <div className="arena-section-card-body p-0 pt-4 space-y-6">
          {phases.map((phase, pi) => (
            <div key={phase.label}>
              {/* Fase header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold',
                  pi === 0 ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent',
                )}>
                  {pi + 1}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {phase.label}
                </span>
              </div>

              {/* Timeline steps */}
              <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
                {phase.steps.map((step) => (
                  <TimelineStep key={step.key} step={step} />
                ))}
              </ol>
            </div>
          ))}

          {app.decision_notes && (
            <div className="mt-5 rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-xs font-semibold text-foreground">Nota do abrigo</p>
              <p className="mt-1 text-sm text-muted-foreground">{app.decision_notes}</p>
            </div>
          )}

          {app.terms_accepted_at && (
            <p className="mt-4 text-[11px] text-muted-foreground">
              Assinatura eletrônica registrada em {formatDateTime(app.terms_accepted_at)} —
              versão {app.terms_version} (Lei 14.063/2020).
            </p>
          )}

          {/* Ações pós-adoção (TASK-308) */}
          {showPostAdoptionActions && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setReturnDialogOpen(true)}
              >
                <Undo2 className="mr-1.5 h-4 w-4" />
                Devolver animal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPauseDialogOpen(true)}
              >
                <PauseCircle className="mr-1.5 h-4 w-4" />
                Pausar acompanhamento
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Dialogs */}
      {showPostAdoptionActions && (
        <>
          <PostAdoptionReturnDialog
            open={returnDialogOpen}
            onOpenChange={setReturnDialogOpen}
            postAdoption={postAdoption || { id: applicationId, shelter_club_id: clubId }}
            petName={app?.pet_name}
          />
          <PostAdoptionPauseDialog
            open={pauseDialogOpen}
            onOpenChange={setPauseDialogOpen}
            postAdoption={postAdoption || { id: applicationId, shelter_club_id: clubId }}
            petName={app?.pet_name}
          />
        </>
      )}
    </div>
  );
}
