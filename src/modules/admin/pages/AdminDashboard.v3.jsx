/**
 * @fileoverview AdminDashboard V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-ADMIN: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradient (slate-900 → indigo-950 → violet-950)
 *  - 4 stat cards (Usuários, Pets, ONGs, Denúncias)
 *  - 6 categorias agrupadas (Conteúdo, Moderação, Plataforma, Métricas, Configurações, Segurança)
 *  - Busca/filtro para localizar seção
 *  - 15+ seções agrupadas por categoria
 *  - Ações recentes (auditoria)
 *  - Health status banner
 *  - Auth gate (isPlatformAdmin)
 *  - Empty state para se busca não retornar
 *  - Loading skeleton
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first
 *  - A11y WCAG AA
 *
 * Rota: /admin
 *
 * @see docs/REGENCY_ADMIN_V3.md
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Shield, PawPrint, Building2, AlertTriangle, Users, UserCog,
  BarChart3, ScrollText, Bell, SlidersHorizontal, Flag,
  Activity, Siren, Database, Search, X, AlertCircle, RefreshCw,
  ChevronRight, ArrowUpRight, Sparkles, Clock, CheckCircle2,
  Server, Users2, Heart, MessageSquare, Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { cn } from '@/core/lib/utils';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const STAT_CARDS = [
  { id: 'users', icon: Users, label: 'Usuários', value: '1.2K+', color: 'primary' },
  { id: 'pets', icon: PawPrint, label: 'Pets', value: '5.4K+', color: 'amber' },
  { id: 'clubs', icon: Building2, label: 'ONGs', value: '26', color: 'sky' },
  { id: 'reports', icon: AlertTriangle, label: 'Denúncias', value: '8', color: 'rose' },
];

const CATEGORIES = [
  { id: 'conteudo', label: 'Conteúdo', icon: Heart, color: 'rose' },
  { id: 'moderacao', label: 'Moderação', icon: Shield, color: 'amber' },
  { id: 'plataforma', label: 'Plataforma', icon: Server, color: 'sky' },
  { id: 'metricas', label: 'Métricas', icon: BarChart3, color: 'emerald' },
  { id: 'configuracoes', label: 'Configurações', icon: SlidersHorizontal, color: 'violet' },
  { id: 'seguranca', label: 'Segurança', icon: Siren, color: 'rose' },
];

const SECTIONS = [
  // CONTEÚDO
  { id: 'pets', category: 'conteudo', icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', tone: 'bg-primary/10 text-primary' },
  { id: 'orgs', category: 'conteudo', icon: Building2, title: 'Abrigos', desc: 'Moderar diretório de abrigos e organizações parceiras', link: '/admin/organizacoes', tone: 'bg-accent/10 text-accent' },
  { id: 'comms', category: 'conteudo', icon: Users2, title: 'Comunidades', desc: 'Gerenciar grupos, fóruns e espaços sociais de usuários', link: '/admin/comunidades', tone: 'bg-primary/10 text-primary' },
  { id: 'partners', category: 'conteudo', icon: Megaphone, title: 'Espaço de Parceiros', desc: 'Gerenciar parceiros publicitários, banners e relatórios', link: '/admin/parceiros', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  // MODERAÇÃO
  { id: 'reports', category: 'moderacao', icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/denuncias', tone: 'bg-destructive/10 text-destructive' },
  { id: 'users', category: 'moderacao', icon: UserCog, title: 'Usuários', desc: 'Gerenciar contas, papéis e banimentos', link: '/admin/usuarios', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  { id: 'admins', category: 'moderacao', icon: Shield, title: 'Platform Admins', desc: 'Delegar e revogar acesso admin master', link: '/admin/admins', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  // PLATAFORMA
  { id: 'audit', category: 'plataforma', icon: ScrollText, title: 'Auditoria', desc: 'Trilha completa de ações registradas na plataforma', link: '/admin/auditoria', tone: 'bg-primary/10 text-primary' },
  { id: 'notifs', category: 'plataforma', icon: Bell, title: 'Notificações', desc: 'Inspecionar entregas, links e leituras das notificações geradas', link: '/admin/notificacoes', tone: 'bg-accent/10 text-accent' },
  { id: 'flags', category: 'plataforma', icon: Flag, title: 'Flags de atualizações', desc: 'Ligar e desligar as feature flags que liberam novidades', link: '/admin/flags', tone: 'bg-primary/10 text-primary' },
  // MÉTRICAS
  { id: 'metrics', category: 'metricas', icon: BarChart3, title: 'Métricas', desc: 'Adoções, crescimento e denúncias em gráficos', link: '/admin/metricas', tone: 'bg-secondary text-secondary-foreground' },
  { id: 'health', category: 'metricas', icon: Activity, title: 'Saúde da plataforma', desc: 'Latência, error rate, deploys, uptime, custos, capacidade, alertas', link: '/admin/saude', tone: 'bg-destructive/10 text-destructive' },
  // CONFIGURAÇÕES
  { id: 'settings', category: 'configuracoes', icon: SlidersHorizontal, title: 'Configurações', desc: 'Ajustar textos, rótulos e parâmetros operacionais auditáveis', link: '/admin/configuracoes', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  { id: 'mock', category: 'configuracoes', icon: Database, title: 'Dados demo', desc: 'Carregar ou limpar o pacote de dados de demonstração', link: '/admin/mock-data', tone: 'bg-accent/10 text-accent' },
  // SEGURANÇA
  { id: 'alerts', category: 'seguranca', icon: Bell, title: 'Alertas', desc: 'Configurar thresholds de Slack/Email para billing, error rate, latência', link: '/admin/alertas', tone: 'bg-destructive/10 text-destructive' },
  { id: 'sec-alerts', category: 'seguranca', icon: Siren, title: 'Alertas de segurança', desc: 'Logins suspeitos, alterações de regras, rate limit, billing', link: '/admin/security-alerts', tone: 'bg-destructive/10 text-destructive' },
];

const RECENT_ACTIONS = [
  { id: 1, type: 'ban', user: 'user_abc123', action: 'Banimento aplicado', target: 'Por denúncia de spam', time: '2 min atrás' },
  { id: 2, type: 'approve', user: 'pet_xyz789', action: 'Pet aprovado', target: 'Luna (gata)', time: '15 min atrás' },
  { id: 3, type: 'flag', user: 'feature_v3', action: 'Feature flag alterada', target: 'V3_PAGE_EVENTS = ON', time: '1h atrás' },
  { id: 4, type: 'admin', user: 'admin_def', action: 'Admin delegado', target: 'joao@viralata.app', time: '3h atrás' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, color, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
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

function SectionCard({ section, reduce }) {
  const Icon = section.icon;
  return (
    <motion.div variants={ANIM}>
      <Link
        to={section.link}
        className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
        data-testid={`section-${section.id}`}
      >
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', section.tone)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">
              {section.title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {section.desc}
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </Link>
    </motion.div>
  );
}

function CategoryHeader({ category, count, reduce }) {
  const Icon = category.icon;
  const colorMap = {
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };
  return (
    <motion.div variants={ANIM} className="col-span-full flex items-center gap-3 pt-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[category.color])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-foreground sm:text-lg">
          {category.label}
        </h2>
      </div>
      <Badge variant="secondary" className="text-[10.5px]">
        {count} {count === 1 ? 'seção' : 'seções'}
      </Badge>
    </motion.div>
  );
}

function RecentActionItem({ action }) {
  const colorMap = {
    ban: { icon: Shield, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    approve: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    flag: { icon: Flag, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    admin: { icon: UserCog, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };
  const c = colorMap[action.type] || colorMap.flag;
  const Icon = c.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.bg)}>
        <Icon className={cn('h-4 w-4', c.color)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{action.action}</p>
        <p className="text-xs text-muted-foreground">{action.target}</p>
      </div>
      <p className="shrink-0 text-[10.5px] text-muted-foreground">
        <Clock className="mr-0.5 inline h-3 w-3" aria-hidden="true" />
        {action.time}
      </p>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function AdminDashboardV3() {
  const reduce = useReducedMotion();
  const { isPlatformAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simula load inicial
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Filter
  const filteredSections = useMemo(() => {
    let list = SECTIONS;
    if (activeCategory !== 'all') {
      list = list.filter((s) => s.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map();
    filteredSections.forEach((s) => {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category).push(s);
    });
    return map;
  }, [filteredSections]);

  // JSON-LD
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Admin — Viralata',
    description: 'Painel administrativo da plataforma Viralata.',
    url: 'https://viralata.web.app/admin',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Viralata',
      url: 'https://viralata.web.app',
    },
  }), []);

  // ACCESS DENIED
  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-md space-y-6 px-4 py-12 sm:px-6" data-testid="admin-page">
        <Seo title="Admin — Viralata" description="Painel administrativo." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-base font-semibold text-foreground">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta página é exclusiva do administrador da plataforma.
          </p>
        </div>
      </div>
    );
  }

  // LOADING
  if (loading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="admin-page">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="admin-page">
      <Seo
        title="Admin — Viralata"
        description="Painel administrativo da plataforma Viralata."
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
              Acesso restrito
            </Badge>
            <Badge variant="secondary" className="border-0 bg-emerald-500/20 text-emerald-100 backdrop-blur">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Plataforma operacional
            </Badge>
          </div>

          <motion.h1
            variants={ANIM}
            className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            Painel Administrativo
          </motion.h1>
          <motion.p
            variants={ANIM}
            className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
          >
            Centralize moderação, auditoria, notificações e indicadores
            da plataforma em um fluxo visual consistente com as demais áreas.
          </motion.p>

          {/* Stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {STAT_CARDS.map((s) => (
              <StatCard
                key={s.id}
                icon={s.icon}
                value={s.value}
                label={s.label}
                color={s.color}
                reduce={reduce}
              />
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* BUSCA + CATEGORIAS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar seção por nome ou descrição..."
            className="h-10 pl-9 pr-9"
            aria-label="Buscar seção"
            data-testid="admin-search"
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
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            aria-pressed={activeCategory === 'all'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeCategory === 'all'
                ? 'border-primary bg-primary text-primary-foreground shadow'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Todas
            <span className={cn(
              'rounded-full px-1.5 text-[10px]',
              activeCategory === 'all' ? 'bg-white/20' : 'bg-muted',
            )}>
              {SECTIONS.length}
            </span>
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = SECTIONS.filter((s) => s.category === cat.id).length;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {cat.label}
                <span className={cn(
                  'rounded-full px-1.5 text-[10px]',
                  active ? 'bg-white/20' : 'bg-muted',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTIONS (agrupadas por categoria) */}
      {filteredSections.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            Nenhuma seção encontrada
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente outra busca ou categoria.
          </p>
          <Button
            onClick={() => {
              setSearch('');
              setActiveCategory('all');
            }}
            variant="outline"
            className="mt-3"
          >
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Limpar filtros
          </Button>
        </div>
      ) : (
        <motion.section
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Render by category order */}
          {CATEGORIES.map((cat) => {
            const list = grouped.get(cat.id) || [];
            if (list.length === 0) return null;
            return (
              <React.Fragment key={cat.id}>
                <CategoryHeader category={cat} count={list.length} reduce={reduce} />
                {list.map((s) => (
                  <SectionCard key={s.id} section={s} reduce={reduce} />
                ))}
              </React.Fragment>
            );
          })}
        </motion.section>
      )}

      {/* AÇÕES RECENTES + HEALTH */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        {/* Ações recentes */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <ScrollText className="h-4 w-4 text-primary" aria-hidden="true" />
            Ações recentes
          </h2>
          <div className="space-y-2">
            {RECENT_ACTIONS.map((a) => (
              <RecentActionItem key={a.id} action={a} />
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/admin/auditoria">
              Ver auditoria completa
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Health status */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Activity className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Saúde da plataforma
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-foreground">API Latency</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">142ms</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-foreground">Error Rate</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">0.02%</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-foreground">Uptime (30d)</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">99.98%</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-foreground">Deploy ativo</span>
              </div>
              <span className="text-sm font-bold text-amber-600">sw-v56</span>
            </div>
          </div>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/admin/saude">
              Ver detalhes
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.section>
    </div>
  );
}
