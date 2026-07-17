import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/core/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';

/**
 * AdminHeader — header padronizado para painéis admin (Club/Community).
 *
 * Suporta dois modos:
 * - `theme="club"` → usa `ClubThemedScope` (gradiente customizado do clube)
 * - `theme="community"` → usa `arena-panel-strong` (gradiente da plataforma)
 *
 * @param {Object} props
 * @param {'club'|'community'} props.theme - tipo de tema
 * @param {Object} props.entity - doc do Firestore (club ou community)
 * @param {string} props.entityId - ID da entidade
 * @param {string} [props.entityType] - 'club' | 'community' (para label)
 * @param {string} props.backHref - link do botão "Voltar"
 * @param {string} props.backLabel - label do botão "Voltar"
 * @param {string} [props.subtitle] - subtítulo customizado
 * @param {React.ReactNode} [props.badges] - badges extras
 * @param {BreadcrumbItem[]} [props.breadcrumbs] - items de breadcrumb
 * @param {React.ReactNode} [props.children] - conteúdo extra abaixo do header
 * @param {'loading'|'error'|'ready'} [props.status='ready']
 * @param {string} [props.className]
 *
 * Uso:
 *   <AdminHeader
 *     theme="club"
 *     entity={club}
 *     entityId={clubId}
 *     backHref={`/organizacoes/${clubId}`}
 *     backLabel="Voltar para a ONG"
 *     breadcrumbs={[{ label: 'Início', href: '/' }, { label: 'Organizações', href: '/organizacoes' }, { label: club.name, href: `/organizacoes/${clubId}` }, { label: 'Administração' }]}
 *     status={isLoading ? 'loading' : canAccess ? 'ready' : 'error'}
 *   >
 *     <Tabs>...</Tabs>
 *   </AdminHeader>
 *
 * Para loading state, usar o prop `status="loading"` em vez de手动.
 */
export function AdminHeader({
  theme = 'community',
  entity,
  entityId,
  entityType,
  backHref,
  backLabel,
  subtitle,
  badges,
  breadcrumbs,
  children,
  status = 'ready',
  className,
}) {
  if (status === 'loading') {
    return (
      <div className={cn('space-y-3', className || '')}>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 rounded-[2rem]" />
      </div>
    );
  }

  if (status === 'error' || !entity) {
    return null; // EmptyState deve ser renderizada pelo caller
  }

  const name = entity.name || entityType === 'club' ? 'Organização' : 'Comunidade';
  const initials = (entity.name || name[0]).split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('');
  const location = [entity.city, entity.state].filter(Boolean).join(', ');
  const owner = entity.owner_id; // caller deve complementar com membership check

  const defaultSubtitle = `Painel interno de gestão${location ? ` · ${location}` : ''}`;

  return (
    <div className={cn('flex flex-col gap-2', className || '')}>
      {/* Back button */}
      {backHref && (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={backHref}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {backLabel || 'Voltar'}
          </Link>
        </Button>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs?.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      {/* Header card */}
      {theme === 'club' ? (
        // ClubThemedScope é usado no OrganizationAdminPanel via wrapper.
        // Este componente retorna o conteúdo para dentro do ClubThemedScope.
        // O caller (OrganizationAdminPanel) é responsável por envolver com ClubThemedScope.
        <ClubAdminHeaderContent
          initials={initials}
          name={name}
          location={location}
          owner={owner}
          subtitle={subtitle || defaultSubtitle}
          badges={badges}
        />
      ) : (
        <CommunityAdminHeaderContent
          initials={initials}
          name={name}
          location={location}
          subtitle={subtitle || defaultSubtitle}
          badges={badges}
        />
      )}

      {/* Extra content (tabs, etc.) */}
      {children}
    </div>
  );
}

/** Header content para Club (dentro de ClubThemedScope). */
function ClubAdminHeaderContent({ initials, name, location, owner, subtitle, badges }) {
  return (
    <section className="arena-admin-header">
      <div className="arena-admin-header-content">
        <span className="arena-admin-header-avatar" aria-hidden>
          {initials || <Building2 className="h-7 w-7" />}
        </span>
        <div className="arena-admin-header-info">
          <div className="arena-admin-header-title-row">
            <h1 className="arena-admin-header-title">{name}</h1>
            <span className="arena-admin-header-badge">
              <ShieldCheck className="h-3.5 w-3.5" /> Administração
            </span>
            {badges}
          </div>
          <p className="arena-admin-header-subtitle">
            {subtitle}{owner ? ' · Você é o proprietário' : ''}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Header content para Community (arena-panel-strong). */
function CommunityAdminHeaderContent({ initials, name, location, subtitle, badges }) {
  return (
    <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-6 sm:rounded-[2rem] sm:p-10">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[19px] font-extrabold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{name}</h1>
            <Badge className="rounded-full border-0 bg-white/10 text-white hover:bg-white/10">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Administração
            </Badge>
            {badges}
          </div>
          <p className="mt-2 text-sm text-orange-50/80">
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
