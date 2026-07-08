import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, MessageCircle, MessagesSquare, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getForumThreads,
  createForumThread,
  deleteForumThread,
  getThreadMessages,
  addThreadMessage,
  deleteThreadMessage,
} from '../services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function timeAgo(createdAt) {
  if (!createdAt?.toDate) return 'Agora mesmo';
  return formatDistanceToNow(createdAt.toDate(), { addSuffix: true, locale: ptBR });
}

export default function ForumTab({ communityId, isMember }) {
  const { user, userProfile } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      setThreads(await getForumThreads(communityId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const threadId = await createForumThread(communityId, newTitle.trim(), newText.trim(), user, userProfile);
      setCreateOpen(false);
      setNewTitle('');
      setNewText('');
      await fetchThreads();
      setActiveThread(threadId);
      toast.success('Tópico criado!');
    } catch {
      toast.error('Não foi possível criar o tópico.');
    } finally {
      setCreating(false);
    }
  };

  if (activeThread) {
    const thread = threads.find((t) => t.id === activeThread);
    return (
      <ThreadView
        threadId={activeThread}
        thread={thread}
        isMember={isMember}
        onBack={() => { setActiveThread(null); fetchThreads(); }}
        onDeleted={() => { setActiveThread(null); fetchThreads(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tópicos do fórum</h2>
        {isMember && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo tópico
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando tópicos…</p>
      ) : threads.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <MessagesSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Nenhum tópico ainda. {isMember ? 'Comece a primeira conversa!' : 'Participe da comunidade para conversar.'}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <button key={thread.id} type="button" onClick={() => setActiveThread(thread.id)} className="block w-full text-left">
              <Card className="match-surface rounded-2xl">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-foreground">{thread.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Por {thread.author_name || 'Membro'} · atualizado {timeAgo(thread.updated_at)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> {thread.messages_count || 0}
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo tópico</DialogTitle>
            <DialogDescription>Abra uma conversa com os membros da comunidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título do tópico"
              maxLength={120}
            />
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Escreva a primeira mensagem (opcional)"
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? 'Criando…' : 'Criar tópico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ThreadView({ threadId, thread, isMember, onBack, onDeleted }) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      setMessages(await getThreadMessages(threadId));
    } catch {
      toast.error('Não foi possível carregar as mensagens.');
      setMessages([]);
    }
  }, [threadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setSending(true);
    try {
      await addThreadMessage(threadId, text, user, userProfile);
      setNewMessage('');
      await fetchMessages();
    } catch {
      toast.error('Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message) => {
    try {
      await deleteThreadMessage(message.id, threadId);
      await fetchMessages();
    } catch {
      toast.error('Não foi possível excluir a mensagem.');
    }
  };

  const handleDeleteThread = async () => {
    setDeletingThread(true);
    try {
      await deleteForumThread(threadId);
      toast.success('Tópico excluído.');
      onDeleted();
    } catch {
      toast.error('Não foi possível excluir o tópico.');
    } finally {
      setDeletingThread(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Todos os tópicos
        </Button>
        {user?.uid && thread?.author_id === user.uid && (
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteThread(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir tópico
          </Button>
        )}
      </div>

      {thread && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">{thread.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Por {thread.author_name || 'Membro'} · {timeAgo(thread.created_at)}
          </p>
          {thread.text && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{thread.text}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {messages === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma resposta ainda.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start gap-2.5">
              <UserAvatar name={message.author_name || 'Membro'} photoUrl={message.author_photo} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1 rounded-2xl bg-card border border-border px-4 py-3 shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{message.author_name || 'Membro'}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">{timeAgo(message.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.text}</p>
              </div>
              {user?.uid === message.author_id && (
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(message)}
                  className="mt-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  title="Excluir mensagem"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {isMember && (
        <div className="flex items-center gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escreva uma resposta…"
            className="min-h-[44px] resize-none"
            disabled={sending}
          />
          <Button size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteThread}
        onOpenChange={setConfirmDeleteThread}
        title="Excluir tópico"
        description="O tópico e o histórico de respostas deixarão de aparecer para os membros. Tem certeza?"
        confirmLabel="Excluir"
        destructive
        loading={deletingThread}
        onConfirm={handleDeleteThread}
      />
    </div>
  );
}
