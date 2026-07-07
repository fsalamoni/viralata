import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Heart, Trash2, User } from 'lucide-react';
import MarkdownContent from '@/components/ui/markdown-content';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toggleThreadLike, getThreadLikes, deleteForumThread } from '../../services/communityService';
import PollComponent from './PollComponent';
import CommentSection from './CommentSection';
import AttachmentRenderer from './AttachmentRenderer';
import { toast } from 'sonner';

export default function ThreadDetail({ thread, communityId, onBack }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState([]);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    getThreadLikes(thread.id).then(likesIds => {
      setLikes(likesIds);
      if (user) setIsLiked(likesIds.includes(user.uid));
    });
  }, [thread.id, user]);

  const handleLike = async () => {
    if (!user) return toast.error('Faça login para curtir');
    const currentlyLiked = isLiked;
    setIsLiked(!currentlyLiked);
    setLikes(prev => currentlyLiked ? prev.filter(id => id !== user.uid) : [...prev, user.uid]);
    try {
      await toggleThreadLike(thread.id, user.uid);
    } catch (e) {
      toast.error('Erro ao curtir');
      setIsLiked(currentlyLiked);
      setLikes(prev => currentlyLiked ? [...prev, user.uid] : prev.filter(id => id !== user.uid));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este tópico?')) return;
    try {
      await deleteForumThread(thread.id);
      toast.success('Tópico excluído');
      onBack();
    } catch (e) {
      toast.error('Erro ao excluir tópico');
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos tópicos
      </Button>

      <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold">{thread.title}</h2>
          {user && (user.uid === thread.author_id) && (
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground border-b border-border/50 pb-4">
          {thread.author_photo ? (
            <img src={thread.author_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><User className="w-4 h-4" /></div>
          )}
          <div>
            <p className="font-medium text-foreground">{thread.author_name}</p>
            <p>{thread.created_at ? formatDistanceToNow(thread.created_at.toDate(), { addSuffix: true, locale: ptBR }) : ''}</p>
          </div>
        </div>

        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          <MarkdownContent>{thread.text}</MarkdownContent>
        </div>

        <AttachmentRenderer attachments={thread.attachments} />

        {thread.poll && (
          <div className="mt-4 border border-border/50 rounded-lg p-4 bg-secondary/10">
            <PollComponent entityType="thread" entityId={thread.id} poll={thread.poll} />
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={handleLike} className={isLiked ? "text-red-500 hover:text-red-600" : ""}>
            <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            {likes.length} curtidas
          </Button>
        </div>
      </div>

      <CommentSection threadId={thread.id} />
    </div>
  );
}
