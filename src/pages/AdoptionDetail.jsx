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
import { ArrowLeft, CheckCircle2, Circle, XCircle, FileText, Undo2, PauseCircle } from 'lucide-react';
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

function formatDateTime(value) {
  const d = value?.toDate ? parseTimestamp(value) : (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Constrói a timeline a partir dos campos do doc. O workflow não
 * guarda um array de history — os marcos derivam de created_at,
 * decided_at e status atual.
 */
function buildTimeline(app) {
  const steps = [
    {
      key: 'created',
      label: 'Pedido enviado',
      at: formatDateTime(app.created_at),
      done: true,
    },
  ];
  if (app.terms_accepted_at) {
    steps.push({
      key: 'terms',
      label: `Termo de Adoção aceito (versão ${app.terms_version})`,
      at: formatDateTime(app.terms_accepted_at),
      done: true,
    });
  }
  const decided = Boolean(app.decided_at);
  steps.push({
    key: 'review',
    label: 'Análise do abrigo',
    at: decided ? formatDateTime(app.decided_at) : null,
    done: decided || app.status !== 'applied',
  });
  steps.push({
    key: 'final',
    label: APPLICATION_STATUS_LABELS[app.status] || app.status,
    at: decided ? formatDateTime(app.decided_at) : null,
    done: isTerminal(app.status) || app.status === 'approved',
    failed: ['rejected', 'cancelled', 'withdrawn'].includes(app.status),
  });
  return steps;
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
    return (
      <div className={wrapperClass}>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className={wrapperClass}>
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

  const timeline = buildTimeline(app);

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

      <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
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
        <div className="arena-section-card-body p-0">
          <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
            {timeline.map((step) => (
              <li key={step.key} className="relative">
                <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                  {step.failed ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </span>
                <p className={`text-sm ${step.done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                {step.at && <p className="text-xs text-muted-foreground">{step.at}</p>}
              </li>
            ))}
          </ol>

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
