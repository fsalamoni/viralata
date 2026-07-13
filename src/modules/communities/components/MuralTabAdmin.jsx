import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Heart, MessageCircle, Trash2, Send, Paperclip, X, FileText, Image as ImageIcon,
} from 'lucide-react';
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
import { uploadImage } from '@/core/services/storageService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hasCommunityPermission } from '../domain/permissions';
import { COMMUNITY_PERMISSION } from '../domain/constants';
import { parseTimestamp } from '@/core/utils/timestamp';

/**
 * Versão admin do Mural: tudo do MuralTabEnhanced (likes, comentários,
 * ConfirmDialog, autor denormalizado) + criação de posts com anexos
 * (imagens, vídeos, documentos) — o administrador da comunidade tem
 * atribuição para incluir arquivos e informações que entender
 * pertinentes em cada post.
 *
 * Ativado pela flag `MURAL_RICH_POSTS` (default OFF). Enquanto desligada,
 * o wrapper em `MuralTab.jsx` continua renderizando MuralTabEnhanced ou
 * MuralTab.original conforme as outras flags.
 */
export default function MuralTabAdmin({ communityId, isAdmin, membership, community }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [newPostText, setNewPostText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canPost = hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.FEED, user?.uid);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getCommunityPosts(communityId);
      setPosts(data);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar o mural.');
    }
  }, [communityId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!user?.uid) {
      setLikedIds(new Set());
      return undefined;
    }
    let cancelled = false;
    getMyLikedPostIds(user.uid)
      .then((ids) => {
        if (!cancelled) setLikedIds(new Set(ids));
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map((file) => uploadImage(file, { uid: user?.uid, folder: 'community_posts' })),
      );
      const urls = uploaded
        .map((r) => (typeof r === 'string' ? r : r?.url))
        .filter(Boolean);
      const newAttachments = files.map((file, i) => ({
        name: file.name,
        type: file.type,
        url: urls[i],
        size: file.size,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      // uploadImage valida que é imagem — feedback claro ao usuário
      toast.error(err?.message || 'Falha no upload do anexo.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePost = async () => {
    const text = newPostText.trim();
    if (!text && attachments.length === 0) return;
    setSubmitting(true);
    try {
      const authorName = user?.displayName || user?.email?.split('@')[0] || 'Membro';
      const authorPhoto = user?.photoURL || null;
      await createPost(communityId, user.uid, text, attachments, {
        author_name: authorName,
        author_photo: authorPhoto,
      });
      setNewPostText('');
      setAttachments([]);
      await fetchPosts();
      toast.success('Publicado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePost(confirmDelete.id, user?.uid);
      setConfirmDelete(null);
      await fetchPosts();
      toast.success('Post excluído');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir')
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleLike = async (post) => {
    if (!user?.uid) {
      toast.error('Faça login para curtir');
      return;
    }
    const wasLiked = likedIds.has(post.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    try {
      await togglePostLike(post.id, user.uid);
    } catch (e) {
      console.error(e);
      // reverte
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(post.id); else next.delete(post.id);
        return next;
      });
      toast.error('Não foi possível registrar a curtida.');
    }
  };

  return (
    <div className="space-y-6">
      {canPost && (
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
          <Textarea
            placeholder="Compartilhe uma atualização com a comunidade. Você pode anexar fotos, vídeos ou documentos."
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            className="border-none focus-visible:ring-0 resize-none min-h-[80px]"
            aria-label="Texto do post"
          />

          {attachments.length > 0 && (
            <ul className="space-y-1.5" aria-label="Anexos do post">
              {attachments.map((att, idx) => (
                <li
                  key={`${att.url}-${idx}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  {att.type?.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{att.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeAttachment(idx)}
                    aria-label={`Remover anexo ${att.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 cursor-pointer">
              <Paperclip className="h-3.5 w-3.5" />
              {uploading ? 'Enviando...' : 'Anexar arquivo'}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileAttach}
                disabled={uploading}
                accept="image/*"
                aria-label="Selecionar imagens para anexar"
              />
            </label>
            <Button
              onClick={handlePost}
              disabled={submitting || uploading || (!newPostText.trim() && attachments.length === 0)}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" /> {submitting ? 'Publicando...' : 'Publicar'}
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
              currentUser={user}
              isAdmin={isAdmin}
              onToggleLike={() => handleToggleLike(post)}
              onDelete={() => setConfirmDelete(post)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir post"
        description="Tem certeza que deseja excluir este post do mural? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function PostCard({ post, liked, currentUser, isAdmin, onToggleLike, onDelete }) {
  const { userProfile } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const authorName = post.author_name || 'Membro';
  const authorPhoto = post.author_photo || null;
  const canDelete = currentUser?.uid === post.author_id || isAdmin;
  const canComment = Boolean(currentUser);

  const loadComments = useCallback(async () => {
    try {
      const data = await getPostComments(post.id);
      setComments(data);
      setCommentsCount(data.length);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível carregar os comentários.');
    }
  }, [post.id]);

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) loadComments();
  };

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text || !currentUser) return;
    setSending(true);
    try {
      await addPostComment(post.id, text, currentUser, userProfile);
      setNewComment('');
      await loadComments();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível enviar o comentário.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!confirmDeleteComment) return;
    setDeletingComment(true);
    try {
      await deletePostComment(confirmDeleteComment.id, post.id);
      setConfirmDeleteComment(null);
      await loadComments();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível excluir o comentário.');
    } finally {
      setDeletingComment(false);
    }
  };

  return (
    <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <UserAvatar uid={post.author_id} photoUrl={authorPhoto} name={authorName} className="h-10 w-10" />
          <div>
            <p className="font-bold text-sm">{authorName}</p>
            <p className="text-xs text-muted-foreground">
              {post.created_at ? formatDistanceToNow(parseTimestamp(post.created_at), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
            </p>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label="Excluir post"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {post.text && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
      )}

      {Array.isArray(post.attachments) && post.attachments.length > 0 && (
        <ul className="space-y-1.5">
          {post.attachments.map((att, idx) => (
            <li key={idx}>
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm hover:bg-secondary/60 transition-colors"
              >
                {att.type?.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                ) : att.type?.startsWith('video/') ? (
                  <span className="text-xs">▶</span>
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{att.name || 'Anexo'}</span>
                {att.size ? (
                  <span className="text-[11px] text-muted-foreground">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <button
          type="button"
          onClick={onToggleLike}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            liked ? 'text-red-500' : 'text-muted-foreground hover:text-primary',
          )}
          aria-pressed={liked}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-current')} /> {post.likes_count || 0}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          aria-label="Comentar"
        >
          <MessageCircle className="w-4 h-4" /> {commentsCount}
        </button>
      </div>

      {commentsOpen && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {comments === null ? (
            <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sem comentários. Seja o primeiro!</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => {
                const cAuthorName = c.author_name || c.author?.platform_name || 'Membro';
                const cAuthorPhoto = c.author_photo || c.author?.photo_url || null;
                const canDeleteC = currentUser?.uid === c.author_id;
                return (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <UserAvatar uid={c.author_id} photoUrl={cAuthorPhoto} name={cAuthorName} className="h-7 w-7" />
                    <div className="min-w-0 flex-1 rounded-lg bg-secondary/30 px-3 py-2">
                      <p className="text-xs font-semibold">{cAuthorName}</p>
                      <p className="text-[13px] text-foreground/90 whitespace-pre-wrap">{c.text}</p>
                    </div>
                    {canDeleteC && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setConfirmDeleteComment(c)}
                        aria-label="Excluir comentário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {canComment && (
            <div className="flex items-end gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="min-h-[60px] resize-none text-sm"
                aria-label="Texto do comentário"
              />
              <Button
                type="button"
                onClick={handleAddComment}
                disabled={sending || !newComment.trim()}
                size="sm"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteComment)}
        onOpenChange={(v) => !v && setConfirmDeleteComment(null)}
        title="Excluir comentário"
        description="Deseja excluir este comentário?"
        confirmLabel="Excluir"
        destructive
        loading={deletingComment}
        onConfirm={handleDeleteComment}
      />
    </div>
  );
}
