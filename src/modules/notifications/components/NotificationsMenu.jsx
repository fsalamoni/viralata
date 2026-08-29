import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, Heart, Building2, PawPrint, MessagesSquare, CalendarDays, CheckCheck,
  Check, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { useNotifications } from '@/modules/notifications/hooks/useNotifications';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION_KIND,
  NOTIFICATION_ACTION_STATE,
  resolveNotificationTarget,
  updateNotificationActionState,
} from '@/core/services/notificationService';
import { useRespondClubInviteFromNotification } from '@/modules/organizations/hooks/useClubs';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { cn } from '@/core/lib/utils';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';

const TYPE_META = {
  [NOTIFICATION_TYPE.CHAT_MESSAGE]: { icon: MessageCircle, tone: 'bg-primary/15 text-primary' },
  [NOTIFICATION_TYPE.CHAT_INVITE]: { icon: MessageCircle, tone: 'bg-primary/15 text-primary' },
  [NOTIFICATION_TYPE.ADOPTION_INTEREST]: { icon: Heart, tone: 'bg-destructive/15 text-destructive' },
  [NOTIFICATION_TYPE.ADOPTION_MATCH]: { icon: Heart, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.ADOPTION_REJECTED]: { icon: Heart, tone: 'bg-muted text-muted-foreground' },
  [NOTIFICATION_TYPE.ADOPTION_COMPLETED]: { icon: Heart, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.PET_STATUS_CHANGED]: { icon: PawPrint, tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  [NOTIFICATION_TYPE.PET_RADAR_MATCH]: { icon: PawPrint, tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  [NOTIFICATION_TYPE.CLUB_INVITE]: { icon: Building2, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.CLUB_INVITE_ACCEPTED]: { icon: Building2, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.CLUB_JOIN_REQUEST]: { icon: Building2, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.CLUB_JOIN_APPROVED]: { icon: Building2, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.CLUB_JOIN_REJECTED]: { icon: Building2, tone: 'bg-muted text-muted-foreground' },
  [NOTIFICATION_TYPE.CLUB_EVENT_PUBLISHED]: { icon: CalendarDays, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.EVENT_INVITE]: { icon: CalendarDays, tone: 'bg-accent/15 text-accent' },
  [NOTIFICATION_TYPE.FORUM_REPLY]: { icon: MessagesSquare, tone: 'bg-primary/15 text-primary' },
  [NOTIFICATION_TYPE.FORUM_MENTION]: { icon: MessagesSquare, tone: 'bg-primary/15 text-primary' },
};

function timeAgo(notification) {
  const ms = notification.created_at?.toMillis?.() ?? notification.created_at_ms;
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(ms).toLocaleDateString('pt-BR');
}

/** Uma notificação é um convite de membro respondível inline? */
function isActionableClubInvite(notification) {
  return (
    notification?.action_kind === NOTIFICATION_ACTION_KIND.CLUB_INVITE
    && notification?.action_state === NOTIFICATION_ACTION_STATE.PENDING
    && Boolean(notification?.action_ref?.clubId)
  );
}

/**
 * Item de notificação com convite acionável (Fase 0): mostra a mesma linha da
 * lista + botões "Aceitar"/"Recusar". Renderizado como container simples (não
 * DropdownMenuItem) para o menu NÃO fechar/navegar ao responder — o usuário vê
 * o feedback na hora. Ao concluir, o listener em tempo real atualiza
 * `action_state` e este item volta a ser uma notificação comum.
 */
function NotificationInviteItem({ notification, meta }) {
  const Icon = meta.icon;
  const respond = useRespondClubInviteFromNotification();
  const [submitting, setSubmitting] = useState(null); // 'accept' | 'decline' | null

  const handle = async (decision) => {
    if (submitting) return;
    setSubmitting(decision);
    try {
      const res = await respond.mutateAsync({
        clubId: notification.action_ref.clubId,
        decision,
      });
      const notFound = res?.resolved === false;
      const finalState = notFound
        ? NOTIFICATION_ACTION_STATE.EXPIRED
        : (decision === 'accept'
          ? NOTIFICATION_ACTION_STATE.ACCEPTED
          : NOTIFICATION_ACTION_STATE.DECLINED);
      await updateNotificationActionState(notification.id, finalState).catch(() => {});
      if (notFound) {
        toast.info('Este convite não está mais disponível.');
      } else if (decision === 'accept') {
        toast.success('Convite aceito! Você agora faz parte.');
      } else {
        toast.success('Convite recusado.');
      }
    } catch {
      toast.error('Não foi possível responder ao convite. Tente novamente.');
      setSubmitting(null);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left last:border-0',
        !notification.read && 'bg-primary/5',
      )}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{notification.title}</span>
        {notification.message && (
          <span className="block text-xs text-muted-foreground">{notification.message}</span>
        )}
        <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{timeAgo(notification)}</span>
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1 px-3"
            disabled={!!submitting}
            onClick={() => handle('accept')}
          >
            {submitting === 'accept' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Aceitar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-3"
            disabled={!!submitting}
            onClick={() => handle('decline')}
          >
            {submitting === 'decline' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Sino de notificações do header: painel dropdown com a lista real (antes só contava, não mostrava). */
export default function NotificationsMenu() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { settings } = usePlatformSettings();
  const actionableEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_ACTIONABLE_NOTIFICATIONS_V1);
  const dropdownLimit = settings.operational_limits.notifications_dropdown_limit;

  const handleClick = async (notification) => {
    if (!notification.read) markAsRead(notification.id).catch(() => {});
    const target = resolveNotificationTarget(notification);
    if (target) navigate(target);
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    notifications.filter((n) => !n.read).forEach((n) => markAsRead(n.id).catch(() => {}));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={Bell}
                title="Nenhuma notificação"
                description="Suas notificações aparecerão aqui."
              />
            </div>
          ) : (
            notifications.slice(0, dropdownLimit).map((notification) => {
              const meta = TYPE_META[notification.type] || { icon: Bell, tone: 'bg-secondary text-secondary-foreground' };
              const Icon = meta.icon;
              if (actionableEnabled && isActionableClubInvite(notification)) {
                return (
                  <NotificationInviteItem
                    key={notification.id}
                    notification={notification}
                    meta={meta}
                  />
                );
              }
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-none border-b border-border/60 px-4 py-3 text-left last:border-0',
                    !notification.read && 'bg-primary/5',
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{notification.title}</span>
                    {notification.message && (
                      <span className="block truncate text-xs text-muted-foreground">{notification.message}</span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{timeAgo(notification)}</span>
                  </span>
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
