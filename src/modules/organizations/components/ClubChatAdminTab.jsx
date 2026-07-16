import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MessageCircle, X, Users, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClubChatThreads,
  useClubChatMessages,
  useSendClubChatMessage,
  useSetClubChatThreadStatus,
  useChatPolling,
} from '../hooks/useClubChat';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { CHAT_THREAD_STATUS, ORG_CHAT_LIMITS } from '../domain/constants';

/**
 * Aba "Chat" do painel admin da ONG — permite que a equipe com permissão
 * `feed` ou `team` (ou o owner) visualize as conversas abertas pelo
 * público e responda em nome da ONG.
 *
 * Mostra:
 *  - Lista lateral de threads (esquerda) com usuário, último trecho e
 *    status (aberta, fechada).
 *  - Janela de conversa (direita) com mensagens em ordem cronológica.
 *  - Input para enviar mensagem (com `sender_role: 'ong_member'`).
 *  - Botões para fechar/reabrir a thread.
 */
export default function ClubChatAdminTab({ club }) {
  const { user, userProfile } = useAuth();
  const { data: threads = [], isLoading } = useClubChatThreads(club.id);
  const [selectedId, setSelectedId] = useState(null);

  // Seleciona a primeira thread automaticamente quando a lista carrega.
  useEffect(() => {
    if (!selectedId && threads.length > 0) {
      setSelectedId(threads[0].id);
    }
  }, [threads, selectedId]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px,1fr]">
      <section className="arena-section-card rounded-2xl">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Conversas
          </h3>
          <p className="arena-section-card-description">Threads abertas pelo público com esta ONG.</p>
        </div>
        <div className="arena-section-card-body p-3 sm:p-4">
          {isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : threads.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nenhuma conversa ainda.
            </div>
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === t.id
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-secondary/60'
                    }`}
                  >
                    {t.user_photo ? (
                      <img src={t.user_photo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {(t.user_name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{t.user_name}</p>
                        {t.status === CHAT_THREAD_STATUS.CLOSED && (
                          <Badge variant="outline" className="rounded-full text-[10px]">fechada</Badge>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {t.last_message || <em>sem mensagens</em>}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="arena-section-card rounded-2xl">
        {!selectedId ? (
          <div className="arena-section-card-body flex h-80 items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="Selecione uma conversa"
              description="Escolha uma thread na lista à esquerda para visualizar e responder."
            />
          </div>
        ) : (
          <AdminThreadView threadId={selectedId} club={club} key={selectedId} />
        )}
      </section>
    </div>
  );
}

function AdminThreadView({ threadId, club }) {
  const { user } = useAuth();
  const { data: threads = [] } = useClubChatThreads(club.id);
  const thread = threads.find((t) => t.id === threadId) || null;
  const { data: messages = [], isLoading } = useClubChatMessages(threadId);
  useChatPolling(threadId);
  const send = useSendClubChatMessage(threadId);
  const setStatus = useSetClubChatThreadStatus(threadId);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, threadId]);

  useEffect(() => {
    if (threadId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [threadId]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await send.mutateAsync({ text: value, role: 'ong_member' });
      setText('');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar a mensagem.');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!thread) {
    return (
      <div className="arena-section-card-body flex h-80 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{thread.user_name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {thread.user_email}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {thread.status === CHAT_THREAD_STATUS.CLOSED ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus.mutate(CHAT_THREAD_STATUS.OPEN)}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Reabrir
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus.mutate(CHAT_THREAD_STATUS.CLOSED)}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Fechar conversa
            </Button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-secondary/20 p-4">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-2/3 rounded-xl" />)}</div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Sem mensagens ainda.</p>
        ) : (
          messages.map((m) => {
            const isOng = m.sender_role === 'ong_member' || m.sender_id !== thread.user_id;
            return (
              <div key={m.id} className={`flex ${isOng ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isOng ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
                  }`}
                >
                  {m.deleted ? (
                    <p className="italic opacity-70">mensagem removida</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border bg-background p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ORG_CHAT_LIMITS.MESSAGE_MAX))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={`Responder a ${thread.user_name}…`}
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Resposta"
          />
          <Button onClick={handleSend} disabled={!text.trim() || send.isPending} size="icon" className="h-10 w-10" aria-label="Enviar mensagem">
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/{ORG_CHAT_LIMITS.MESSAGE_MAX}</p>
      </div>
    </div>
  );
}
