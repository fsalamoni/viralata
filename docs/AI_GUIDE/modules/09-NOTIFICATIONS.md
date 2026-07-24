# Module 09 — Notifications (In-app + FCM)

> Notificações in-app (sino) + push notifications via FCM.

## §1. Visão Geral

**Path**: `src/modules/notifications/`
**Linhas**: ~2000
**Tests**: ~15

## §2. Funcionalidades

### §2.1. Sino (no TopBar)

- Badge com não lidas
- Dropdown com últimas 5
- Link "Ver todas"

### §2.2. Página completa (`/minhas-notificacoes`)

- Lista completa
- Marcar como lida
- Filtros

### §2.3. Push (FCM)

- Service Worker handler
- Permissão
- Token management

### §2.4. Broadcasts (admin)

- `/admin/notificacoes` — enviar para todos

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `Notifications.jsx` | Sino (no TopBar) |
| `NotificationsPage.jsx` | Página completa |
| `FCMHandler.jsx` | Service Worker handler |
| `AdminBroadcasts.jsx` | Admin |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `notificationService.js` | CRUD de notificações |
| `fcmService.js` | FCM token, push |
| `broadcastService.js` | Broadcasts |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useNotifications` | Notificações do user (realtime) |
| `useFCM` (core) | FCM |
| `useMarkAsRead` | Mutation |

## §6. Schema

```typescript
notifications/{notificationId} {
  user_id: string,
  type: 'admin_broadcast' | 'chat_message' | 'pet_status_changed' | ...,
  title: string,
  message: string,
  link: string?,
  actor_id: string?,
  read: boolean,
  read_at: timestamp?,
  created_at: timestamp,
}
```

---

**Próximo módulo**: `modules/10-REPORTS.md`
