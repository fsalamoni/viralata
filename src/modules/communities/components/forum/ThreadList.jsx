import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, PlusCircle, Heart, User } from 'lucide-react';
import { getForumThreads } from '../../services/communityService';
import { Skeleton } from '@/components/ui/skeleton';

export default function ThreadList({ communityId, onSelectThread, onCreateThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getForumThreads(communityId).then(data => {
      if (isMounted) {
        setThreads(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [communityId]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Fórum da Comunidade</h2>
          <p className="text-sm text-muted-foreground">Participe das discussões com outros membros</p>
        </div>
        <Button onClick={onCreateThread} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Tópico
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
          Nenhum tópico criado ainda. Seja o primeiro a iniciar uma discussão!
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <div
              key={thread.id}
              className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => onSelectThread(thread)}
            >
              <h3 className="font-semibold text-lg mb-2">{thread.title}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {thread.author_photo ? (
                    <img src={thread.author_photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center"><User className="w-3 h-3" /></div>
                  )}
                  <span>{thread.author_name}</span>
                  <span>•</span>
                  <span>{thread.created_at ? formatDistanceToNow(thread.created_at.toDate(), { addSuffix: true, locale: ptBR }) : ''}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {thread.likes_count || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {thread.messages_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
