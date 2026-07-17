import { useEffect, useState } from 'react';
import { getAllReports, updateReportStatus } from '@/modules/reports/services/reportService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, CheckCircle, Archive, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

const STATUS_TABS = [
  { key: 'all', label: 'Todas', icon: FileText },
  { key: 'pending', label: 'Pendentes', icon: AlertCircle },
  { key: 'resolved', label: 'Resolvidas', icon: CheckCircle },
  { key: 'dismissed', label: 'Arquivadas', icon: Archive },
];

const BADGE_VARIANTS = {
  pending: 'destructive',
  resolved: 'default',   // green-like via default
  dismissed: 'secondary',
  all: 'secondary',
};

const ACTION_LABEL = {
  pending: [{ status: 'resolved', label: 'Marcar como resolvida', icon: CheckCircle }],
  resolved: [{ status: 'dismissed', label: 'Arquivar', icon: Archive }],
  dismissed: [],
};

function EmptyState({ filter }) {
  const messages = {
    all: 'Nenhuma denúncia registrada na plataforma.',
    pending: 'Não há denúncias pendentes. Ótimo trabalho!',
    resolved: 'Nenhuma denúncia resolvida ainda.',
    dismissed: 'Nenhuma denúncia arquivada.',
  };
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground">{messages[filter] || messages.all}</p>
    </div>
  );
}

function ReportCard({ report, onAction, actionLoading }) {
  const { user } = useAuth();
  const actions = ACTION_LABEL[report.status] || [];
  const dateStr = report.created_at?.seconds
    ? format(new Date(report.created_at.seconds * 1000), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '—';

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{dateStr}</span>
        <Badge variant={BADGE_VARIANTS[report.status] || 'secondary'}>
          {report.status === 'pending' ? 'Pendente' : report.status === 'resolved' ? 'Resolvida' : 'Arquivada'}
        </Badge>
      </div>

      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{report.description}</p>

      {report.address && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>📍</span>{report.address}
        </p>
      )}

      {report.reporter_name && (
        <p className="text-xs text-muted-foreground">Enviado por: {report.reporter_name}</p>
      )}

      {report.photo_urls?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {report.photo_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ver foto ${i + 1} da denúncia`}>
              <img
                src={url}
                alt={`Evidência ${i + 1}`}
                className="w-16 h-16 rounded object-cover border border-border hover:border-primary/50 transition-colors"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex gap-2 pt-1 border-t border-border/50 mt-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant="outline"
              onClick={() => onAction(report.id, action.status)}
              disabled={actionLoading}
              className="text-xs"
            >
              <action.icon className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReports() {
  const { isPlatformAdmin, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // reportId being updated
  const standardEnabled = useFeatureFlag(FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT);

  const wrapperClass = standardEnabled
    ? 'arena-page mx-auto max-w-4xl space-y-6 px-4 py-6'
    : 'mx-auto max-w-4xl space-y-6 px-4 py-6';
  const deniedClass = standardEnabled
    ? 'arena-page mx-auto max-w-3xl py-16 text-center'
    : 'mx-auto max-w-3xl py-16 text-center';
  const loadingClass = standardEnabled
    ? 'arena-page mx-auto max-w-4xl px-4 py-16'
    : 'mx-auto max-w-4xl px-4 py-16';

  useEffect(() => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    getAllReports()
      .then(setReports)
      .catch((err) => {
        console.error('[AdminReports] getAllReports failed:', err);
        setError('Não foi possível carregar as denúncias. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  const handleAction = async (reportId, newStatus) => {
    setActionLoading(reportId);
    try {
      await updateReportStatus(reportId, newStatus, user);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('[AdminReports] updateReportStatus failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className={deniedClass}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva do administrador da plataforma.
        </p>
      </div>
    );
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? reports.length : reports.filter((r) => r.status === t.key).length;
    return acc;
  }, {});

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Denúncias"
        title="Denúncias de Maus-Tratos"
        description="Denúncias enviadas pelo público. Apenas o admin master tem acesso. Cada denúncia pode gerar um PDF formatado para entrega à autoridade competente."
      />

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar denúncias por status">
        {STATUS_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={[
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
            {counts[key] > 0 && (
              <span className={[
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                filter === key ? 'bg-primary-foreground/20' : 'bg-muted',
              ].join(' ')}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3" role="tabpanel" aria-label={`Denúncias ${filter}`}>
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onAction={handleAction}
              actionLoading={actionLoading === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
