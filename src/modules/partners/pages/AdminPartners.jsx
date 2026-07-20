/**
 * @fileoverview AdminPartners — list of partners.
 *
 * Rota: /admin/parceiros
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.1
 */
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Megaphone, Search, X, Plus, Filter, Eye, Edit, Pause, Play,
  AlertCircle, BarChart3, CheckCircle2, ExternalLink, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { cn } from '@/core/lib/utils';
import { usePartners, useSetBannerStatus, useDeletePartner } from '../hooks/usePartners';
import {
  PARTNER_STATUS, PARTNER_STATUS_LABELS, PARTNER_STATUS_COLORS,
  PARTNER_CATEGORY_LABELS, PARTNER_CATEGORIES,
} from '../domain/constants';

const ANIM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function StatCard({ icon: Icon, value, label, color, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{label}</p>
          <p className="text-xl font-extrabold text-white sm:text-2xl">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function PartnerListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function AdminPartners() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: partners = [], isLoading, error } = usePartners();
  const setStatusMutation = useSetBannerStatus();
  const deleteMutation = useDeletePartner();

  // Filter + search
  const filtered = useMemo(() => {
    let list = partners;
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.siteUrl || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [partners, statusFilter, categoryFilter, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const active = partners.filter((p) => p.status === 'active').length;
    const paused = partners.filter((p) => p.status === 'paused').length;
    const totalClicks = partners.reduce((sum, p) => sum + (p.totalClicks || 0), 0);
    const totalViews = partners.reduce((sum, p) => sum + (p.totalViews || 0), 0);
    return { active, paused, totalClicks, totalViews, total: partners.length };
  }, [partners]);

  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partners">
        <Seo title="Espaço de Parceiros — Admin" description="Gerenciamento de parceiros." />
        <EmptyState
          icon={AlertCircle}
          title="Funcionalidade desabilitada"
          description="A flag ADMIN_PARTNER_SPACES_V1 está OFF. Ative no admin de flags."
        />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partners">
        <Seo title="Acesso restrito" description="Apenas platform_admin." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 text-base font-semibold text-foreground">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">Apenas platform_admin pode gerenciar parceiros.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partners">
        <Seo title="Espaço de Parceiros — Admin" description="Gerenciamento de parceiros." />
        <PartnerListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partners">
        <Seo title="Erro — Parceiros" description="Erro ao carregar parceiros." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Erro ao carregar parceiros: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partners">
      <Seo
        title="Espaço de Parceiros — Admin"
        description="Gerenciamento de parceiros e banners publicitários."
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-indigo-800 to-violet-900 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <Megaphone className="mr-1 h-3 w-3" aria-hidden="true" />
              Espaço de Parceiros
            </Badge>
            <Badge variant="secondary" className="border-0 bg-emerald-500/20 text-emerald-100 backdrop-blur">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {stats.active} ativos
            </Badge>
          </div>

          <motion.h1
            variants={ANIM}
            className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
          >
            Gerenciamento de Parceiros
          </motion.h1>
          <motion.p
            variants={ANIM}
            className="mt-1 text-sm text-white/90 sm:text-base"
          >
            Cadastro, banners, rodízio e estatísticas de parceiros publicitários.
          </motion.p>

          {/* Stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatCard icon={Megaphone} value={stats.total} label="Total" color="primary" reduce={reduce} />
            <StatCard icon={CheckCircle2} value={stats.active} label="Ativos" color="emerald" reduce={reduce} />
            <StatCard icon={Eye} value={stats.totalViews} label="Views (30d)" color="sky" reduce={reduce} />
            <StatCard icon={BarChart3} value={stats.totalClicks} label="Clicks (30d)" color="amber" reduce={reduce} />
          </motion.div>
        </div>
      </motion.section>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground sm:text-lg">
          {filtered.length} parceiro{filtered.length === 1 ? '' : 's'}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/parceiros/relatorios">
              <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Relatórios
            </Link>
          </Button>
          <Button onClick={() => navigate('/admin/parceiros/novo')} size="sm">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Novo parceiro
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, descrição ou site..."
            className="h-10 pl-9 pr-9"
            aria-label="Buscar parceiros"
            data-testid="partners-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === 'all'
                ? 'border-primary bg-primary text-primary-foreground shadow'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50',
            )}
          >
            Todos ({stats.total})
          </button>
          {Object.values(PARTNER_STATUS).map((status) => {
            const count = partners.filter((p) => p.status === status).length;
            if (count === 0) return null;
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={active}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                {PARTNER_STATUS_LABELS[status]} ({count})
              </button>
            );
          })}
          <span className="ml-2 inline-block h-4 w-px bg-border" aria-hidden="true" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
            aria-label="Filtrar por categoria"
            data-testid="partners-category-filter"
          >
            <option value="all">Todas categorias</option>
            {PARTNER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum parceiro encontrado"
          description={search || statusFilter !== 'all' || categoryFilter !== 'all'
            ? 'Tente ajustar os filtros de busca.'
            : 'Crie seu primeiro parceiro publicitário para começar.'}
          action={
            <Button onClick={() => navigate('/admin/parceiros/novo')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo parceiro
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="space-y-2"
        >
          {filtered.map((partner) => (
            <PartnerRow
              key={partner.id}
              partner={partner}
              onView={() => navigate(`/admin/parceiros/${partner.id}`)}
              onEdit={() => navigate(`/admin/parceiros/${partner.id}/editar`)}
              onDelete={async () => {
                if (window.confirm(`Excluir "${partner.name}"? Esta ação não pode ser desfeita e remove TODOS os banners.`)) {
                  await deleteMutation.mutateAsync(partner.id);
                }
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function PartnerRow({ partner, onView, onEdit, onDelete }) {
  const ctr = partner.totalViews > 0 ? (partner.totalClicks / partner.totalViews) * 100 : 0;

  return (
    <motion.div
      variants={ANIM}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-sm sm:p-4"
      data-testid={`partner-row-${partner.id}`}
    >
      {partner.logoUrl ? (
        <img
          src={partner.logoUrl}
          alt={partner.name}
          className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground">{partner.name}</h3>
          <Badge className={cn('text-[10px]', PARTNER_STATUS_COLORS[partner.status] || PARTNER_STATUS_COLORS.active)}>
            {PARTNER_STATUS_LABELS[partner.status] || partner.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {PARTNER_CATEGORY_LABELS[partner.category] || partner.category}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="truncate">{partner.siteUrl}</span>
          {partner.totalViews > 0 && (
            <span>{partner.totalViews} views · {partner.totalClicks} clicks · {ctr.toFixed(1)}% CTR</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button onClick={onView} size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Ver detalhes">
          <Eye className="h-4 w-4" />
        </Button>
        <Button onClick={onEdit} size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Editar">
          <Edit className="h-4 w-4" />
        </Button>
        <Button onClick={onDelete} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Excluir">
          <AlertCircle className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
