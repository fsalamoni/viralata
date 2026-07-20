/**
 * @fileoverview AdminPartnerReports — analytics dashboard for partners.
 *
 * Rota: /admin/parceiros/relatorios
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.3
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, Megaphone, BarChart3, Eye, TrendingUp, Calendar,
  AlertCircle, ImageIcon, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Seo from '@/components/Seo';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { cn } from '@/core/lib/utils';
import { usePartners } from '../hooks/usePartners';
import {
  BANNER_STATUS_LABELS, BANNER_STATUS_COLORS, BANNER_POSITION_LABELS,
} from '../domain/constants';

const ANIM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminPartnerReports() {
  const reduce = useReducedMotion();
  const { isPlatformAdmin } = useAuth();
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1);
  const [range, setRange] = useState('30d'); // 7d | 30d | 90d

  const { data: partners = [], isLoading, error } = usePartners();

  // Aggregate top-level stats
  const stats = useMemo(() => {
    const totalViews = partners.reduce((sum, p) => sum + (p.totalViews || 0), 0);
    const totalClicks = partners.reduce((sum, p) => sum + (p.totalClicks || 0), 0);
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    return {
      totalViews,
      totalClicks,
      ctr,
      partners: partners.length,
      active: partners.filter((p) => p.status === 'active').length,
    };
  }, [partners]);

  // Top 5 partners by views
  const topByViews = useMemo(() => {
    return [...partners].sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0)).slice(0, 5);
  }, [partners]);

  // Top 5 by CTR
  const topByCtr = useMemo(() => {
    return [...partners]
      .filter((p) => (p.totalViews || 0) > 0)
      .map((p) => ({ ...p, ctr: (p.totalClicks / p.totalViews) * 100 }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);
  }, [partners]);

  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-reports">
        <Seo title="Relatórios — Parceiros" description="Relatórios de parceiros." />
        <EmptyState icon={AlertCircle} title="Funcionalidade desabilitada" description="Flag ADMIN_PARTNER_SPACES_V1 está OFF." />
      </div>
    );
  }
  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-reports">
        <Seo title="Acesso restrito" description="Apenas platform_admin." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Apenas platform_admin pode ver relatórios.
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partner-reports">
        <Seo title="Relatórios — Parceiros" description="Relatórios de parceiros." />
        <ReportsSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-reports">
        <Seo title="Erro" description="Erro ao carregar." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Erro: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partner-reports">
      <Seo title="Relatórios — Parceiros" description="Métricas agregadas de parceiros e banners." />

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
            { label: 'Relatórios' },
          ]}
        />
      </div>

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <BarChart3 className="mr-1 h-3 w-3" aria-hidden="true" />
              Relatórios
            </Badge>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-0 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Últimos 30 dias
            </span>
          </div>

          <motion.h1
            variants={ANIM}
            className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
          >
            Métricas de Parceiros
          </motion.h1>
          <motion.p
            variants={ANIM}
            className="mt-1 text-sm text-white/90 sm:text-base"
          >
            Visão consolidada de visualizações, clicks e CTR por parceiro e posição.
          </motion.p>

          {/* Top-level stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-white/90" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Views</p>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{stats.totalViews}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-white/90" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Clicks</p>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{stats.totalClicks}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-white/90" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">CTR</p>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{stats.ctr.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-white/90" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Ativos</p>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                {stats.active}/{stats.partners}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Top by views */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
          Top 5 — Mais visualizados
        </h2>
        {topByViews.length === 0 || stats.totalViews === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma visualização ainda.</p>
        ) : (
          <div className="space-y-2">
            {topByViews.map((p, i) => {
              const max = topByViews[0].totalViews || 1;
              const pct = ((p.totalViews || 0) / max) * 100;
              return (
                <motion.div key={p.id} variants={ANIM} className="flex items-center gap-3">
                  <span className="w-6 text-base font-extrabold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                      <a href={p.siteUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">{p.totalViews || 0}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Top by CTR */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Top 5 — Maior CTR
        </h2>
        {topByCtr.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de CTR ainda (precisa views + clicks).</p>
        ) : (
          <div className="space-y-2">
            {topByCtr.map((p, i) => (
              <motion.div
                key={p.id}
                variants={ANIM}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3"
              >
                <span className="w-6 text-base font-extrabold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.totalViews} views · {p.totalClicks} clicks</p>
                </div>
                <span className="text-base font-extrabold text-emerald-600">{p.ctr.toFixed(1)}%</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Note */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:border-sky-900/30 dark:bg-sky-900/10 p-4 text-xs text-sky-800 dark:text-sky-300">
        <p className="font-semibold">ℹ Sobre os contadores</p>
        <p className="mt-1">
          Contadores `totalViews`/`totalClicks` são denormalizados e atualizados a cada evento.
          Para detalhes por dia e por banner, abra o detalhe de cada parceiro e aba "Estatísticas".
        </p>
      </div>
    </div>
  );
}
