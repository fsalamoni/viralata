/**
 * @fileoverview AdminPartnerDetail — partner detail with tabs.
 *
 * Rota: /admin/parceiros/:partnerId
 *
 * Tabs: Geral | Banners | Estatísticas | Histórico
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.2
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, Megaphone, Image as ImageIcon, ExternalLink,
  Info, Plus, Edit, Trash2, BarChart3, Clock, Pause, Play,
  Eye, Calendar, Percent, AlertCircle, RefreshCw, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { cn } from '@/core/lib/utils';
import { usePartner, useBannersByPartner, useUpdatePartner, useDeletePartner, useSetBannerStatus, useDeleteBanner, useCreateBanner, useUpdateBanner, useBannerEvents } from '../hooks/usePartners';
import {
  PARTNER_STATUS, PARTNER_STATUS_LABELS, PARTNER_STATUS_COLORS,
  PARTNER_CATEGORY_LABELS, BANNER_STATUS, BANNER_STATUS_LABELS, BANNER_STATUS_COLORS,
  BANNER_POSITIONS, BANNER_POSITION_LABELS,
} from '../domain/constants';
import { groupEventsByDay } from '../services/analyticsService';
import { PartnerForm } from '../components/PartnerForm';
import { BannerForm } from '../components/BannerForm';
import { uploadBannerImage, validateBannerFile, compressImage } from '../services/bannerStorageService';

const ANIM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const TABS = [
  { key: 'general', label: 'Geral', icon: Info },
  { key: 'banners', label: 'Banners', icon: ImageIcon },
  { key: 'stats', label: 'Estatísticas', icon: BarChart3 },
  { key: 'history', label: 'Histórico', icon: Clock },
];

function StatMini({ icon: Icon, value, label, color }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    sky: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30',
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    rose: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorMap[color])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function PartnerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminPartnerDetail() {
  const reduce = useReducedMotion();
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1);
  const [activeTab, setActiveTab] = useState('general');
  const [showEditPartner, setShowEditPartner] = useState(false);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const { data: partner, isLoading, error, refetch } = usePartner(partnerId);
  const { data: banners = [], isLoading: loadingBanners, refetch: refetchBanners } = useBannersByPartner(partnerId);
  const updatePartner = useUpdatePartner();
  const deletePartnerMut = useDeletePartner();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const setBannerStatus = useSetBannerStatus();
  const deleteBannerMut = useDeleteBanner();

  // Reset tab on partner change
  useEffect(() => setActiveTab('general'), [partnerId]);

  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-detail">
        <Seo title="Parceiro — Admin" description="Detalhe do parceiro." />
        <EmptyState icon={AlertCircle} title="Funcionalidade desabilitada" description="Flag ADMIN_PARTNER_SPACES_V1 está OFF." />
      </div>
    );
  }
  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-detail">
        <Seo title="Acesso restrito" description="Apenas platform_admin." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Apenas platform_admin pode ver este parceiro.
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partner-detail">
        <Seo title="Carregando..." description="Carregando parceiro." />
        <PartnerDetailSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-detail">
        <Seo title="Erro" description="Erro ao carregar parceiro." />
        <ErrorState
          title="Não foi possível carregar este parceiro"
          description={error.message}
          action={
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }
  if (!partner) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-detail">
        <Seo title="Não encontrado" description="Parceiro não encontrado." />
        <EmptyState
          icon={Megaphone}
          title="Parceiro não encontrado"
          description="Este parceiro pode ter sido excluído."
          action={<Button asChild><Link to="/admin/parceiros">Voltar</Link></Button>}
        />
      </div>
    );
  }

  const ctr = partner.totalViews > 0 ? (partner.totalClicks / partner.totalViews) * 100 : 0;

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partner-detail">
      <Seo title={`${partner.name} — Parceiro`} description="Detalhe do parceiro." />

      {/* Breadcrumb + back */}
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/admin/parceiros">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Voltar para Parceiros
          </Link>
        </Button>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Parceiros', href: '/admin/parceiros' },
            { label: partner.name },
          ]}
        />
      </div>

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="rounded-3xl border border-border bg-card p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-start gap-4">
          {partner.logoUrl ? (
            <img
              src={partner.logoUrl}
              alt={partner.name}
              className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <ImageIcon className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                {partner.name}
              </h1>
              <Badge className={cn('text-[10px]', PARTNER_STATUS_COLORS[partner.status] || PARTNER_STATUS_COLORS.active)}>
                {PARTNER_STATUS_LABELS[partner.status] || partner.status}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {PARTNER_CATEGORY_LABELS[partner.category] || partner.category}
              </Badge>
            </div>
            <a
              href={partner.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {partner.siteUrl}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setShowEditPartner(true)} data-testid="edit-partner-button">
              <Edit className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={async () => {
                if (window.confirm(`Excluir "${partner.name}"? Esta ação não pode ser desfeita e remove TODOS os banners.`)) {
                  await deletePartnerMut.mutateAsync(partner.id);
                  navigate('/admin/parceiros');
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Excluir
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Stats mini */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini icon={ImageIcon} value={banners.length} label="Banners" color="primary" />
        <StatMini icon={Eye} value={partner.totalViews || 0} label="Views" color="sky" />
        <StatMini icon={BarChart3} value={partner.totalClicks || 0} label="Clicks" color="emerald" />
        <StatMini icon={Percent} value={`${ctr.toFixed(1)}%`} label="CTR" color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2" data-testid="partner-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={active}
              data-testid={`tab-${tab.key}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && (
        <GeneralTab partner={partner} />
      )}

      {activeTab === 'banners' && (
        <BannersTab
          partnerId={partner.id}
          banners={banners}
          loading={loadingBanners}
          onCreate={() => setShowNewBanner(true)}
          onEdit={(banner) => setEditingBanner(banner)}
          onStatus={async (bannerId, status) => {
            await setBannerStatus.mutateAsync({ partnerId: partner.id, bannerId, status });
            refetchBanners();
          }}
          onDelete={async (bannerId) => {
            if (window.confirm('Excluir este banner?')) {
              await deleteBannerMut.mutateAsync({ partnerId: partner.id, bannerId });
              refetchBanners();
            }
          }}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab partnerId={partner.id} banners={banners} />
      )}

      {activeTab === 'history' && (
        <HistoryTab partner={partner} />
      )}

      {/* Modals */}
      {showEditPartner && (
        <PartnerForm
          open={showEditPartner}
          onOpenChange={setShowEditPartner}
          partner={partner}
          onSubmit={async (data) => {
            await updatePartner.mutateAsync({ partnerId: partner.id, input: data });
            refetch();
            setShowEditPartner(false);
          }}
        />
      )}

      {showNewBanner && (
        <BannerForm
          open={showNewBanner}
          onOpenChange={setShowNewBanner}
          partnerId={partner.id}
          onSubmit={async (data, files) => {
            // Upload files first
            const bannerId = crypto.randomUUID();
            const finalData = { ...data };
            if (files?.desktop) {
              const val = validateBannerFile(files.desktop);
              if (!val.ok) throw new Error(val.error);
              let fileToUpload = files.desktop;
              if (files.desktop.size > 400 * 1024) {
                const compressed = await compressImage(files.desktop, 1200, 0.85);
                if (compressed) fileToUpload = new File([compressed], 'banner.webp', { type: 'image/webp' });
              }
              finalData.imageUrl = await uploadBannerImage({
                file: fileToUpload, partnerId: partner.id, bannerId, slot: 'desktop', filename: files.desktop.name,
              });
            }
            if (files?.mobile) {
              const val = validateBannerFile(files.mobile);
              if (!val.ok) throw new Error(val.error);
              let fileToUpload = files.mobile;
              if (files.mobile.size > 400 * 1024) {
                const compressed = await compressImage(files.mobile, 600, 0.85);
                if (compressed) fileToUpload = new File([compressed], 'banner-mobile.webp', { type: 'image/webp' });
              }
              finalData.imageUrlMobile = await uploadBannerImage({
                file: fileToUpload, partnerId: partner.id, bannerId, slot: 'mobile', filename: files.mobile.name,
              });
            }
            await createBanner.mutateAsync({ partnerId: partner.id, input: finalData });
            refetchBanners();
            setShowNewBanner(false);
          }}
        />
      )}

      {editingBanner && (
        <BannerForm
          open={!!editingBanner}
          onOpenChange={(o) => !o && setEditingBanner(null)}
          partnerId={partner.id}
          banner={editingBanner}
          onSubmit={async (data, files) => {
            const finalData = { ...data };
            if (files?.desktop) {
              const val = validateBannerFile(files.desktop);
              if (!val.ok) throw new Error(val.error);
              let fileToUpload = files.desktop;
              if (files.desktop.size > 400 * 1024) {
                const compressed = await compressImage(files.desktop, 1200, 0.85);
                if (compressed) fileToUpload = new File([compressed], 'banner.webp', { type: 'image/webp' });
              }
              finalData.imageUrl = await uploadBannerImage({
                file: fileToUpload, partnerId: partner.id, bannerId: editingBanner.id, slot: 'desktop', filename: files.desktop.name,
              });
            }
            if (files?.mobile) {
              const val = validateBannerFile(files.mobile);
              if (!val.ok) throw new Error(val.error);
              let fileToUpload = files.mobile;
              if (files.mobile.size > 400 * 1024) {
                const compressed = await compressImage(files.mobile, 600, 0.85);
                if (compressed) fileToUpload = new File([compressed], 'banner-mobile.webp', { type: 'image/webp' });
              }
              finalData.imageUrlMobile = await uploadBannerImage({
                file: fileToUpload, partnerId: partner.id, bannerId: editingBanner.id, slot: 'mobile', filename: files.mobile.name,
              });
            }
            await updateBanner.mutateAsync({
              partnerId: partner.id, bannerId: editingBanner.id, input: finalData,
            });
            refetchBanners();
            setEditingBanner(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Tab components ────────────────────────────────────────────────────────

function GeneralTab({ partner }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-4"
    >
      <motion.div variants={ANIM} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <Info className="h-4 w-4 text-primary" aria-hidden="true" />
          Informações gerais
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">{partner.name}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</dt>
            <dd className="mt-0.5 text-sm text-foreground">{PARTNER_CATEGORY_LABELS[partner.category] || partner.category}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Site</dt>
            <dd className="mt-0.5 text-sm">
              <a href={partner.siteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {partner.siteUrl}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</dt>
            <dd className="mt-0.5 text-sm text-foreground">{partner.contactEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telefone</dt>
            <dd className="mt-0.5 text-sm text-foreground">{partner.contactPhone || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expira em</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {partner.expiresAt
                ? new Date(partner.expiresAt.seconds ? partner.expiresAt.seconds * 1000 : partner.expiresAt).toLocaleDateString('pt-BR')
                : 'Sem prazo'}
            </dd>
          </div>
        </dl>
        {partner.description && (
          <div className="mt-4 border-t border-border pt-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground/85">{partner.description}</dd>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function BannersTab({ partnerId, banners, loading, onCreate, onEdit, onStatus, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          {banners.length} banner{banners.length === 1 ? '' : 's'}
        </h2>
        <Button onClick={onCreate} size="sm" data-testid="new-banner-button">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Novo banner
        </Button>
      </div>
      {banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Nenhum banner ainda"
          description="Crie banners para exibir nas posições configuradas."
          action={
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo banner
            </Button>
          }
        />
      ) : (
        banners.map((b) => <BannerRow key={b.id} banner={b} onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} />)
      )}
    </motion.div>
  );
}

function BannerRow({ banner, onEdit, onStatus, onDelete }) {
  const ctr = banner.currentImpressions > 0 ? (banner.currentClicks / banner.currentImpressions) * 100 : 0;
  return (
    <motion.div
      variants={ANIM}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:p-4"
      data-testid={`banner-row-${banner.id}`}
    >
      <img
        src={banner.imageUrl}
        alt={banner.alt}
        className="h-20 w-full rounded-lg object-cover sm:h-16 sm:w-32"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={cn('text-[10px]', BANNER_STATUS_COLORS[banner.status])}>
            {BANNER_STATUS_LABELS[banner.status]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {BANNER_POSITION_LABELS[banner.position] || banner.position}
          </Badge>
          <span className="text-[10px] text-muted-foreground">peso: {banner.weight}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {banner.linkUrl}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>{banner.currentImpressions} views</span>
          <span>{banner.currentClicks} clicks</span>
          {banner.currentImpressions > 0 && <span>{ctr.toFixed(1)}% CTR</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {banner.status === BANNER_STATUS.ACTIVE ? (
          <Button onClick={() => onStatus(banner.id, BANNER_STATUS.PAUSED)} size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Pausar">
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => onStatus(banner.id, BANNER_STATUS.ACTIVE)} size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Ativar">
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button onClick={() => onEdit(banner)} size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Editar">
          <Edit className="h-4 w-4" />
        </Button>
        <Button onClick={() => onDelete(banner.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function StatsTab({ partnerId, banners }) {
  if (banners.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem dados ainda"
        description="Crie banners para começar a coletar estatísticas."
      />
    );
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-3"
    >
      <motion.h2 variants={ANIM} className="text-base font-bold text-foreground">
        Estatísticas por banner
      </motion.h2>
      {banners.map((b) => (
        <BannerStatsCard key={b.id} partnerId={partnerId} banner={b} />
      ))}
    </motion.div>
  );
}

function BannerStatsCard({ partnerId, banner }) {
  const { data: events = [] } = useBannerEvents(partnerId, banner.id, 500);
  const dayData = useMemo(() => groupEventsByDay(events), [events]);
  const ctr = banner.currentImpressions > 0 ? (banner.currentClicks / banner.currentImpressions) * 100 : 0;

  return (
    <motion.div variants={ANIM} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-foreground">{banner.alt}</h3>
        <Badge variant="outline" className="text-[10px]">
          {BANNER_POSITION_LABELS[banner.position] || banner.position}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-2xl font-extrabold text-foreground">{banner.currentImpressions}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Views</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-foreground">{banner.currentClicks}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-foreground">{ctr.toFixed(1)}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</p>
        </div>
      </div>
      {dayData.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Últimos {dayData.length} dias</p>
          <div className="flex items-end gap-1 h-16">
            {dayData.slice(-14).map((d) => {
              const max = Math.max(...dayData.map((x) => x.views), 1);
              const heightPct = (d.views / max) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.views}v ${d.clicks}c`}>
                  <div className="w-full bg-sky-400 dark:bg-sky-600 rounded-t" style={{ height: `${heightPct}%`, minHeight: '2px' }} />
                  <span className="text-[8px] text-muted-foreground">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function HistoryTab({ partner }) {
  const entries = [
    { id: 'created', label: 'Parceiro criado', date: partner.createdAt, by: partner.createdBy },
    { id: 'updated', label: 'Última atualização', date: partner.updatedAt, by: null },
    partner.activatedAt && { id: 'activated', label: 'Ativado pela primeira vez', date: partner.activatedAt, by: null },
  ].filter(Boolean);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
        Histórico
      </h2>
      <div className="space-y-2">
        {entries.map((e) => (
          <motion.div
            key={e.id}
            variants={ANIM}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{e.label}</p>
              {e.by && <p className="text-[11px] text-muted-foreground">por {e.by}</p>}
            </div>
            <p className="text-[10.5px] text-muted-foreground">
              {e.date
                ? new Date(e.date.seconds ? e.date.seconds * 1000 : e.date).toLocaleString('pt-BR')
                : '—'}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
