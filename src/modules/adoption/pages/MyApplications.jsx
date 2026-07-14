/**
 * @fileoverview Página "Minha Application" — TASK-304.
 *
 * Lista as applications de adoção do usuário logado com timeline visual
 * do status. Diferente de "Meus Interesses" (que é só curtidas em pets),
 * esta página rastreia o WORKFLOW de adoção: applied → under_review →
 * approved → contract_signed, etc.
 *
 * Carregamento:
 * 1. listMyApplications(uid) via collectionGroup em adoption_workflow
 * 2. Enriquece com pet (foto, nome) e abrigo (nome)
 * 3. Filtros: status, pet, abrigo
 *
 * Rota: /meus-pedidos (separado de /meus-interesses legacy)
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import {
  ArrowLeft, FileText, PawPrint, Building2, CheckCircle2, XCircle,
  Hourglass, CalendarCheck, Filter, Search, X, AlertCircle, History,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listMyApplications } from '@/modules/shelter/services/adoptionService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
} from '@/modules/shelter/domain/operational/adoption';
import { toast } from 'sonner';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

// ─── Status helpers ────────────────────────────────────────────────────

const STATUS_ICONS = {
  applied: FileText,
  under_review: Hourglass,
  approved: CheckCircle2,
  rejected: XCircle,
  adoption_completed: CalendarCheck,
  cancelled: XCircle,
  withdrawn: AlertCircle,
};

// Timeline visual (passos do workflow)
const WORKFLOW_STEPS = [
  { key: 'applied', label: 'Enviado' },
  { key: 'under_review', label: 'Em análise' },
  { key: 'approved', label: 'Aprovado' },
  { key: 'adoption_completed', label: 'Concluído' },
];

function getStepIndex(status) {
  if (status === 'cancelled' || status === 'withdrawn' || status === 'rejected') return -1;
  return WORKFLOW_STEPS.findIndex((s) => s.key === status);
}

function formatDate(value) {
  if (!value) return '—';
  const d = value?.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Application Card ──────────────────────────────────────────────────

function ApplicationCard({ application, pet, shelter, onCancel, cancelling }) {
  const StatusIcon = STATUS_ICONS[application.status] || FileText;
  const stepIdx = getStepIndex(application.status);
  const isTerminal = application.status === 'cancelled' ||
                     application.status === 'withdrawn' ||
                     application.status === 'rejected' ||
                     application.status === 'adoption_completed';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-0">
          {/* Pet info */}
          <div className="bg-muted/30 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {pet?.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <PawPrint className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <Link
                  to={pet ? `/pets/${pet.id}` : '#'}
                  className="font-semibold hover:underline truncate block"
                >
                  {pet?.name || 'Pet não encontrado'}
                </Link>
                {pet?.species && (
                  <p className="text-sm text-muted-foreground">{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</p>
                )}
              </div>
            </div>
            {shelter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{shelter.name || 'Abrigo'}</span>
              </div>
            )}
          </div>

          {/* Status + Timeline */}
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4 text-muted-foreground" />
                <Badge
                  variant="secondary"
                  className={APPLICATION_STATUS_TONES[application.status] || ''}
                >
                  {APPLICATION_STATUS_LABELS[application.status] || application.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Enviado em {formatDate(application.created_at)}
                </span>
              </div>
              {application.status === 'applied' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(application)}
                  disabled={cancelling === application.id}
                  aria-label="Cancelar application"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>

            {/* Timeline */}
            {stepIdx >= 0 && (
              <div className="flex items-center gap-1">
                {WORKFLOW_STEPS.map((step, i) => {
                  const isCompleted = i <= stepIdx;
                  const isCurrent = i === stepIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <div
                          className={[
                            'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold',
                            isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            isCurrent ? 'ring-2 ring-primary ring-offset-1' : '',
                          ].join(' ')}
                          title={step.label}
                          aria-label={`${step.label} ${isCompleted ? 'concluído' : 'pendente'}`}
                        >
                          {isCompleted ? '✓' : i + 1}
                        </div>
                        <span className={['text-[10px] truncate max-w-[60px]', isCurrent ? 'font-semibold' : 'text-muted-foreground'].join(' ')}>
                          {step.label}
                        </span>
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className={['flex-1 h-0.5', isCompleted && i < stepIdx ? 'bg-primary' : 'bg-muted'].join(' ')} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {isTerminal && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                {application.status === 'rejected' && application.decision_reason && (
                  <span>Motivo: {application.decision_reason}</span>
                )}
                {application.status === 'cancelled' && (
                  <span>Você cancelou esta application</span>
                )}
                {application.status === 'withdrawn' && (
                  <span>Você desistiu desta application</span>
                )}
                {application.status === 'adoption_completed' && (
                  <span className="text-emerald-700 font-medium">🎉 Adoção concluída!</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-5 pb-12 py-6');

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState(null);

  // 1) Carrega applications
  const { data: applications = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['applications', 'mine', user?.uid],
    queryFn: () => listMyApplications(user.uid),
    enabled: Boolean(user?.uid),
    staleTime: 30_000,
  });

  // 2) Enriquece com pets
  const petIds = useMemo(() => [...new Set(applications.map((a) => a.pet_id).filter(Boolean))], [applications]);
  const { data: petsById = {} } = useQuery({
    queryKey: ['applications', 'mine', 'pets', petIds],
    queryFn: async () => {
      const out = {};
      await Promise.all(petIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'pets', id));
          if (snap.exists()) out[id] = { id: snap.id, ...snap.data() };
        } catch { /* ignore */ }
      }));
      return out;
    },
    enabled: petIds.length > 0,
    staleTime: 60_000,
  });

  // 3) Enriquece com abrigos
  const shelterIds = useMemo(() => [...new Set(applications.map((a) => a.shelter_club_id).filter(Boolean))], [applications]);
  const { data: sheltersById = {} } = useQuery({
    queryKey: ['applications', 'mine', 'shelters', shelterIds],
    queryFn: async () => {
      const out = {};
      await Promise.all(shelterIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'clubs', id));
          if (snap.exists()) out[id] = { id: snap.id, ...snap.data() };
        } catch { /* ignore */ }
      }));
      return out;
    },
    enabled: shelterIds.length > 0,
    staleTime: 60_000,
  });

  // Filtros
  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((a) => {
        const pet = petsById[a.pet_id];
        const shelter = sheltersById[a.shelter_club_id];
        return (
          (pet?.name || '').toLowerCase().includes(q) ||
          (shelter?.name || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [applications, statusFilter, search, petsById, sheltersById]);

  // Cancel handler
  const handleCancel = async (application) => {
    if (!confirm(`Cancelar a application para ${petsById[application.pet_id]?.name || 'este pet'}?`)) return;
    setCancelling(application.id);
    try {
      // Import lazy para evitar ciclo
      const { cancelApplication } = await import('@/modules/shelter/services/adoptionService');
      await cancelApplication(application.shelter_club_id, application.id, "Adotante cancelou pela página Meus Pedidos", { uid: user.uid });
      toast.success('Application cancelada');
      refetch();
    } catch (err) {
      toast.error(`Erro ao cancelar: ${err.message}`);
    } finally {
      setCancelling(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const counts = { active: 0, approved: 0, completed: 0, rejected: 0 };
    applications.forEach((a) => {
      if (a.status === 'applied' || a.status === 'under_review') counts.active++;
      else if (a.status === 'approved') counts.approved++;
      else if (a.status === 'adoption_completed') counts.completed++;
      else if (a.status === 'rejected' || a.status === 'cancelled' || a.status === 'withdrawn') counts.rejected++;
    });
    return counts;
  }, [applications]);

  if (isError) {
    return (
      <div className={wrapperClass}>
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold">Erro ao carregar applications</h2>
          <p className="text-sm text-muted-foreground">Tente recarregar a página.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {/* Hero */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/perfil')}
          className="mb-3"
          aria-label="Voltar para o perfil"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao perfil
        </Button>
        <h1 className="text-2xl font-bold">Minhas Applications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o andamento dos seus pedidos de adoção.
        </p>
      </div>

      {/* Stats */}
      {!isLoading && applications.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-rose-700">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Encerradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Buscar por pet ou abrigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar applications"
          />
        </div>
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filtro por status">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            role="tab"
            aria-selected={statusFilter === 'all'}
          >
            <Filter className="h-3.5 w-3.5 mr-1" /> Todas
          </Button>
          {APPLICATION_STATUS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              role="tab"
              aria-selected={statusFilter === s}
            >
              {APPLICATION_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={applications.length === 0 ? 'Nenhuma application ainda' : 'Nenhum resultado'}
          description={
            applications.length === 0
              ? 'Quando você se candidatar para adotar um pet, ele aparecerá aqui.'
              : 'Tente ajustar os filtros para encontrar o que procura.'
          }
          action={
            applications.length === 0 ? (
              <Button asChild>
                <a href="/feed">Ver pets para adoção</a>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              pet={petsById[app.pet_id]}
              shelter={sheltersById[app.shelter_club_id]}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
