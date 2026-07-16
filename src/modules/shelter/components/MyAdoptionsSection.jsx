/**
 * @fileoverview MyAdoptionsSection — bloco "Minhas adoções" no /perfil
 * (TASK-129 / Regra A Eixo 1: perfil do usuário final).
 *
 * Lista todas as adoption applications do usuário logado, cross-abrigo
 * (collectionGroup `adoption_workflow` filtrado por applicant_uid).
 * Mostra status, data, link para o pet e o registro de aceite do
 * Termo de Adoção quando presente.
 */

import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyApplications } from '@/modules/shelter/hooks/useAdoptionApplications';
import { parseTimestamp } from '@/core/utils/timestamp';
import {
    APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
} from '@/modules/shelter/domain/operational/adoption';
import { useFCMRequest } from '@/modules/notifications/hooks/useFCMRequest';

function formatDate(value) {
  const d = value?.toDate ? parseTimestamp(value) : (value ? new Date(value) : null);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

export function MyAdoptionsSection({ userUid }) {
  const { data: applications = [], isLoading, isError, refetch } = useMyApplications(userUid);

  // TASK-292: solicita push permission após 1ª ação relevante (ver own applications)
  const { requestPushIfAppropriate } = useFCMRequest();

  // Após carregar applications (ação relevante = candidato se importa com status),
  // solicita push permission silenciosamente (sem banner invasivo).
  // O user já está logado e visualizando suas aplicações — momento ideal.
  if (!isLoading && applications.length > 0) {
    requestPushIfAppropriate(userUid);
  }

  return (
    <section id="adocoes" className="rounded-[24px] p-6 lg:p-7">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
          <Heart className="w-[19px] h-[19px] text-accent" /> Minhas adoções
        </h3>
        <p className="arena-section-card-description">
          Histórico dos seus pedidos de adoção em todos os abrigos.
        </p>
      </div>
      <div className="arena-section-card-body p-0 pt-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar seus pedidos.{' '}
            <button type="button" className="underline" onClick={() => refetch()}>
              Tentar de novo
            </button>
          </p>
        )}
        {!isLoading && !isError && applications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem pedidos de adoção.{' '}
            <Link to="/feed" className="underline text-primary">Conheça os pets disponíveis</Link>.
          </p>
        )}
        {!isLoading && !isError && applications.length > 0 && (
          <ol className="space-y-2">
            {applications.map((app) => (
              <li key={app.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={APPLICATION_STATUS_TONES[app.status] || ''}>
                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Enviado em {formatDate(app.created_at)}
                  </span>
                  <Link
                    to={`/adocoes/${app.shelter_club_id}/${app.id}`}
                    className="ml-auto text-xs font-medium text-primary underline"
                  >
                    Detalhes
                  </Link>
                  {app.pet_id && (
                    <Link
                      to={`/pet/${app.pet_id}`}
                      className="text-xs font-medium text-primary underline"
                    >
                      Ver pet
                    </Link>
                  )}
                </div>
                {app.decision_note && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Nota do abrigo: {app.decision_note}
                  </p>
                )}
                {app.terms_accepted_at && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Termo de Adoção aceito em {formatDate(app.terms_accepted_at)} (versão {app.terms_version}).
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export default MyAdoptionsSection;
