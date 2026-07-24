# Module 08 — Chat (Mensageria)

> Mensageria interna entre usuários, ONGs e adotantes.

## §1. Visão Geral

**Path**: `src/modules/chat/`
**Linhas**: ~2500
**Tests**: ~20

## §2. Funcionalidades

### §2.1. Lista (`/chat`)

- Threads do user
- Última mensagem
- Não lidas

### §2.2. Thread (`/chat/:threadId`)

- Mensagens em tempo real (`onSnapshot`)
- Envio de texto + imagens
- Status: sent, delivered, read

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `ChatPage.v3.jsx` | Página principal (lista + thread) |
| `ThreadList.jsx` | Lista de threads |
| `ThreadView.jsx` | Visualização de thread |
| `MessageInput.jsx` | Input de mensagem |
| `MessageBubble.jsx` | Bolha de mensagem |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `chatService.js` | CRUD de threads + messages |
| `chatPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useChat` | Lista de threads |
| `useThread` | Query de thread (realtime) |
| `useSendMessage` | Mutation de envio |

## §6. Schema

```typescript
chat_threads/{threadId} {
  participants: string[],  // uids
  last_message: { text, sender, timestamp },
  unread_count: { [uid]: number },
  created_at: timestamp,
  updated_at: timestamp,
}

chat_messages/{messageId} {
  thread_id: string,
  sender_uid: string,
  text: string,
  media_urls: string[],
  status: 'sent' | 'delivered' | 'read',
  read_at: timestamp?,
  created_at: timestamp,
}
```

---

**Próximo módulo**: `modules/09-NOTIFICATIONS.md`
