import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Loader2, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useMyClubChatThread,
  useOpenClubChatThread,
  useClubChatMessages,
  useSendClubChatMessage,
  useChatPolling,
} from '../hooks/useClubChat';
import { ORG_CHAT_LIMITS } from '../domain/constants';

/**
 * Diálogo público de chat com a ONG.
 * - Se o usuário não estiver logado, mostra um aviso com link para login.
 * - Se a ONG tem `chat_enabled === false`, mostra um aviso amigável.
 * - Caso contrário, abre (ou cria) a thread e exibe as mensagens em ordem
 *   cronológica, com input para enviar.
 */
export default function ClubPublicChatDialog({ club, open, onOpenChange }) {
  const { isAuthenticated } = useAuth();
  const open_ = useOpenClubChatThread(club);
  const threadQ = useMyClubChatThread(club, { autoCreate: false });

  // Quando o diálogo abre, cria a thread se ainda não existir.
  useEffect(() => {
    if (open && isAuthenticated && club && !threadQ.data && !open_.isPending) {
      open_.mutate();
    }
  }, [open, isAuthenticated, club, threadQ.data, open_]);

  const thread = open_.data || threadQ.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Conversa com {club?.name || 'a ONG'}</p>
              <p className="text-[11px] text-muted-foreground">
                As mensagens são visíveis para a equipe autorizada da ONG.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isAuthenticated ? (
          <div className="p-6 text-sm">
            <EmptyState
              icon={MessageCircle}
              title="Entre para iniciar a conversa"
              description="Você precisa estar logado para enviar mensagens para a ONG."
              action={<Button asChild><Link to="/login">Entrar na plataforma</Link></Button>}
            />
          </div>
        ) : !club ? null : club.chat_enabled === false ? (
          <div className="p-6 text-sm">
            <EmptyState
              icon={MessageCircle}
              title="Chat indisponível no momento"
              description="Esta ONG desabilitou temporariamente o atendimento por chat."
            />
          </div>
        ) : (
          <ChatBody thread={thread} loadingThread={open_.isPending || threadQ.isLoading} role="user" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChatBody({ thread, loadingThread, role = 'user' }) {
  const { user, userProfile } = useAuth();
  const messagesQ = useClubChatMessages(thread?.id);
  useChatPolling(thread?.id);
  const send = useSendClubChatMessage(thread?.id);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll para o fim quando chega mensagem nova.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messagesQ.data?.length, thread?.id]);

  // Foco automático no input quando o chat abre.
  useEffect(() => {
    if (thread?.id) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [thread?.id]);

  if (loadingThread) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo conversa…
      </div>
    );
  }
  if (!thread) {
    return (
      <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Não foi possível abrir a conversa. Tente novamente.
      </div>
    );
  }

  const list = messagesQ.data || [];
  const meId = user?.uid;
  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await send.mutateAsync({ text: value, role });
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

  return (
    <div className="flex h-[60vh] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-secondary/20 p-4">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
            <MessageCircle className="mb-2 h-6 w-6" />
            Comece a conversa enviando uma mensagem. A equipe da ONG responderá assim que possível.
          </div>
        ) : (
          list.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
                  }`}
                >
                  {!mine && (
                    <p className={`text-[11px] font-semibold ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {m.sender_name}
                      {m.sender_role === 'ong_member' && (
                        <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-foreground">
                          equipe
                        </span>
                      )}
                    </p>
                  )}
                  {m.deleted ? (
                    <p className="italic opacity-70">mensagem removida</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  )}
                  {m.edited && !m.deleted && (
                    <p className={`mt-0.5 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      editada
                    </p>
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
            placeholder="Escreva sua mensagem…"
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Mensagem"
          />
          <Button onClick={handleSend} disabled={!text.trim() || send.isPending} size="icon" className="h-10 w-10">
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/{ORG_CHAT_LIMITS.MESSAGE_MAX}</p>
      </div>
    </div>
  );
}
