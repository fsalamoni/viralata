import { useEffect, useMemo, useState } from 'react';
import BroadcastComposer from '../components/BroadcastComposer';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Bell, Search, ExternalLink, Shield } from 'lucide-react';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { formatAuditDate } from '@/core/services/auditService';
import { NOTIFICATION_TYPE, normalizeNotificationLink, resolveNotificationTarget } from '@/core/services/notificationService';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';

const READ_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  ...Object.values(NOTIFICATION_TYPE).map((type) => ({ value: type, label: type })),
];
export default function AdminNotifications() {
  const { isPlatformAdmin } = useAuth();
  const { settings, isLoading: settingsLoading } = usePlatformSettings();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const maxNotifications = settings.operational_limits.admin_notifications_limit;
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl px-4 py-6 space-y-6');
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');
  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-6xl px-4 py-16');

  useEffect(() => {
    if (!isPlatformAdmin) return undefined;
    const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'), limit(maxNotifications));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (err) => setError(err.message || 'Erro ao carregar notificações.'),
    );
    return () => unsubscribe();
  }, [isPlatformAdmin, maxNotifications]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesTerm = !term || [
        notification.title,
        notification.message,
        notification.user_id,
        notification.actor_name,
        notification.actor_id,
        notification.type,
        notification.link,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

      const matchesType = typeFilter === 'all' || notification.type === typeFilter;
      const matchesRead = readFilter === 'all'
        || (readFilter === 'read' && notification.read)
        || (readFilter === 'unread' && !notification.read);

      return matchesTerm && matchesType && matchesRead;
    });
  }, [notifications, readFilter, search, typeFilter]);

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

  if (settingsLoading) {
    return (
      <div className={loadingClass}>
        <p className="text-center text-muted-foreground">Carregando configurações…</p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin"
        title="Notificações"
        description={`Visão administrativa das últimas ${maxNotifications} notificações geradas pela plataforma, com status de leitura e destino.`}
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <Bell className="h-3.5 w-3.5" /> Operação e auditoria
          </span>
        )}
      />

      {/* TASK-174: broadcast segmentado */}
      <BroadcastComposer />

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Fila recente de notificações</h3>
          <p className="arena-section-card-description">Confira links originais, destinos normalizados e status de leitura.</p>
        </div>
        <div className="arena-section-card-body space-y-4 p-6 sm:p-7">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_180px_180px]">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Buscar</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground/80" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Título, mensagem, ator, destinatário ou link"
                  className="pl-8"
                />
              </div>
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Tipo</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Leitura</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
              >
                {READ_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{filtered.length} resultado(s)</Badge>
            <span>{notifications.length} notificação(ões) carregadas</span>
          </div>

          <div className="arena-table-wrap">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                  <th className="py-3 pl-4 pr-3 font-semibold">Notificação</th>
                  <th className="px-3 py-3 font-semibold">Tipo</th>
                  <th className="px-3 py-3 font-semibold">Destinatário</th>
                  <th className="px-3 py-3 font-semibold">Ator</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Destino</th>
                  <th className="px-3 py-3 font-semibold">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filtered.map((notification) => {
                  const normalizedLink = normalizeNotificationLink(notification.link);
                  const resolvedLink = resolveNotificationTarget(notification);
                  return (
                    <tr key={notification.id} className="align-top transition-colors hover:bg-secondary/40">
                      <td className="py-3 pl-4 pr-3">
                        <div className="font-medium text-foreground">{notification.title || 'Sem título'}</div>
                        {notification.message && (
                          <div className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{notification.message}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="font-mono lowercase">{notification.type || 'generic'}</Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground/85">
                        <div className="font-medium">{notification.user_id || '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground/85">{notification.actor_name || 'Sistema'}</div>
                        <div>{notification.actor_id || '—'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={notification.read ? 'secondary' : 'success'}>
                          {notification.read ? 'Lida' : 'Não lida'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {resolvedLink ? (
                          <Button asChild variant="link" className="h-auto p-0 text-xs">
                            <a
                              href={resolvedLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={normalizedLink ? 'Abrir destino da notificação' : 'Abrir destino alternativo da notificação'}
                            >
                              {normalizedLink || `${resolvedLink} (fallback)`}
                              <span className="sr-only"> (abre em nova guia)</span>
                              <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">{notification.link ? 'Link inválido' : 'Sem link'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatAuditDate(notification.created_at, notification.created_at_ms)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhuma notificação encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
