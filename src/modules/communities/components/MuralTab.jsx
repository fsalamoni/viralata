import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/core/lib/utils';
import {
  getCommunityPosts,
  createPost,
  deletePost,
  togglePostLike,
  getMyLikedPostIds,
  getPostComments,
  addPostComment,
  deletePostComment,
} from '../services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function timeAgo(createdAt) {
  if (!createdAt?.toDate) return 'Agora mesmo';
  return formatDistanceToNow(createdAt.toDate(), { addSuffix: true, locale: ptBR });
}

export default function MuralTab({ communityId, isMember }) {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setPosts(await getCommunityPosts(communityId));
    } catch (e) {
      console.error(e);
    }
  }, [communityId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!user?.uid) return;
    getMyLikedPostIds(user.uid)
      .then((ids) => setLikedIds(new Set(ids)))
      .catch(() => {});
  }, [user?.uid]);

  const handlePost = async () => {
    if (!newPostText.trim()) return;
    setSubmitting(true);
    try {
      await createPost(communityId, newPostText.trim(), user, userProfile);
      setNewPostText('');
      fetchPosts();
      toast.success('Publicado!');
    } catch {
      toast.error('Erro ao publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePost(confirmDelete.id, user.uid);
      setConfirmDelete(null);
      fetchPosts();
      toast.success('Post excluído');
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleLike = async (post) => {
    if (!user) {
      toast.error('Faça login para curtir');
      return;
    }
    const wasLiked = likedIds.has(post.id);
    // Atualização otimista — reverte se a transação falhar.
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) => (
      p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? -1 : 1)) } : p
    )));
    try {
      await togglePostLike(post.id, user.uid);
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setPosts((prev) => prev.map((p) => (
        p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (wasLiked ? 1 : -1)) } : p
      )));
      toast.error('Não foi possível registrar a curtida.');
    }
  };

  return (
    <div className="space-y-6">
      {isMember && (
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
          <Textarea
            placeholder="O que você quer compartilhar com a comunidade?"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            className="border-none focus-visible:ring-0 resize-none min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button onClick={handlePost} disabled={submitting || !newPostText.trim()} size="sm">
              <Send className="w-4 h-4 mr-2" /> Publicar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            Nenhum post no mural ainda.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedIds.has(post.id)}
              onToggleLike={() => handleToggleLike(post)}
              onDelete={() => setConfirmDelete(post)}
              canDelete={user?.uid === post.author_id}
              canComment={Boolean(user)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir post"
        description="Tem certeza que deseja excluir este post do mural?"
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function PostCard({ post, liked, onToggleLike, onDelete, canDelete, canComment }) {
  const { user, userProfile } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = ainda não carregado
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const loadComments = async () => {
    try {
      const data = await getPostComments(post.id);
      setComments(data);
      setCommentsCount(data.length);
    } catch {
      toast.error('Não foi possível carregar os comentários.');
    }
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) loadComments();
  };

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    try {
      await addPostComment(post.id, text, user, userProfile);
      setNewComment('');
      await loadComments();
    } catch {
      toast.error('Não foi possível comentar.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    try {
      await deletePostComment(comment.id, post.id);
      await loadComments();
    } catch {
      toast.error('Não foi possível excluir o comentário.');
    }
  };

  const authorName = post.author_name || 'Membro da comunidade';

  return (
    <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2.5">
          <UserAvatar name={authorName} photoUrl={post.author_photo} size="md" />
          <div>
            <p className="font-bold text-sm">{authorName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {canDelete && (
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {post.text}
      </p>
      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <button
          type="button"
          onClick={onToggleLike}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            liked ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          )}
        >
          <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} /> {post.likes_count || 0}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            commentsOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          )}
        >
          <MessageCircle className="w-4 h-4" /> {commentsCount}
        </button>
      </div>

      {commentsOpen && (
        <div className="space-y-3 border-t border-border/50 pt-3">
          {comments === null ? (
            <p className="text-xs text-muted-foreground">Carregando comentários…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5">
                <UserAvatar name={comment.author_name || 'Membro'} photoUrl={comment.author_photo} size="xs" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-xl bg-secondary/50 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{comment.author_name || 'Membro'}</span>
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{comment.text}</p>
                </div>
                {user?.uid === comment.author_id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment)}
                    className="mt-1 text-muted-foreground transition-colors hover:text-destructive"
                    title="Excluir comentário"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}

          {canComment && (
            <div className="flex items-center gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                placeholder="Escreva um comentário…"
                className="h-9 rounded-full text-xs"
                disabled={sending}
              />
              <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={handleAddComment} disabled={sending || !newComment.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
