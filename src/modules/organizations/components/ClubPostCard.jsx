import React, { useState, useCallback } from 'react';
import {
  Heart, MessageCircle, Trash2, Send, Edit2, X, FileText, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useClubPostComments,
  useAddClubPostComment,
  useDeleteClubPostComment,
  useToggleClubPostLike,
  useMyLikedPostIds,
} from '../hooks/useClubFeed';
import { canLikeClubPost, canCommentOnClubPost, canDeleteClubPost } from '../domain/permissions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ImageZoomDialog from './ImageZoomDialog';

/**
 * Card de post do mural da ONG. Mostra:
 *  - Cabeçalho com autor e timestamp
 *  - Título (se houver)
 *  - Conteúdo (texto)
 *  - Galeria de imagens (clicáveis → modal de zoom)
 *  - Outros anexos (lista)
 *  - Botões de interação (like, comentário)
 *  - Lista de comentários (carregamento sob demanda ao abrir)
 *  - Ações de gestão (excluir, se o usuário puder)
 */
export default function ClubPostCard({ post, club, membership, currentUserUid }) {
  const { user, userProfile } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const myLikesQ = useMyLikedPostIds(club?.id);
  const liked = myLikesQ.data?.includes(post.id);

  const commentsQ = useClubPostComments(commentsOpen ? post.id : null);
  const addComment = useAddClubPostComment(post.id);
  const deleteComment = useDeleteClubPostComment(post.id);
  const toggleLike = useToggleClubPostLike(club?.id);

  const canDelete = canDeleteClubPost(post, club, membership, currentUserUid);
  const canLike = canLikeClubPost(post, user);
  const canComment = canCommentOnClubPost(post, user);

  const handleToggleLike = async () => {
    if (!user?.uid) {
      toast.error('Faça login para curtir.');
      return;
    }
    try {
      await toggleLike.mutateAsync(post);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível registrar a curtida.');
    }
  };

  const handleDelete = async () => {
    window.dispatchEvent(new CustomEvent('club-post-confirm-delete', { detail: { postId: post.id } }));
  };

  const authorName = post.author_name || 'Membro';
  const authorPhoto = post.author_photo || null;
  const createdAt = post.created_at_ms ? new Date(post.created_at_ms) : new Date();
  const title = String(post.title || '').trim();
  const hasTitle = title.length > 0;
  const attachments = Array.isArray(post.attachments) ? post.attachments : [];
  const images = attachments.filter((a) => isImageAttachment(a));
  const files = attachments.filter((a) => !isImageAttachment(a));

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {authorPhoto ? (
            <img src={authorPhoto} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(authorName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{authorName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                  {post.edited && <span className="ml-1 italic">(editado)</span>}
                </p>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Excluir post"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {hasTitle && (
              <h3 className="mt-2 text-base font-bold leading-snug text-foreground sm:text-lg">
                {title}
              </h3>
            )}

            {post.content && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                {post.content}
              </p>
            )}

            {/* Galeria de imagens — grid 2 ou 3 colunas, clicável para zoom */}
            {images.length > 0 && (
              <div
                className={`mt-3 grid gap-1.5 ${
                  images.length === 1
                    ? 'grid-cols-1'
                    : images.length === 2
                      ? 'grid-cols-2'
                      : images.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {images.map((img, idx) => (
                  <button
                    key={`${img.path || img.url}-${idx}`}
                    type="button"
                    onClick={() => setZoomImage({ src: img.url, alt: img.name || 'Imagem da publicação', name: img.name })}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/40 transition-opacity hover:opacity-95"
                    aria-label={`Ampliar ${img.name || 'imagem'}`}
                  >
                    <img
                      src={img.url}
                      alt={img.name || ''}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Outros anexos (não-imagem) */}
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((att, idx) => (
                  <li key={`${att.path || att.url}-${idx}`}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs hover:bg-secondary/60"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{att.name || 'Anexo'}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3">
              {canLike && (
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    liked ? 'text-red-500' : 'text-muted-foreground hover:text-primary'
                  }`}
                  aria-pressed={liked}
                  aria-label={liked ? 'Descurtir' : 'Curtir'}
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {post.likes_count || 0}
                </button>
              )}
              {canComment && (
                <button
                  type="button"
                  onClick={() => setCommentsOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Comentar"
                >
                  <MessageCircle className="h-4 w-4" /> {post.comments_count || 0}
                </button>
              )}
            </div>

            {commentsOpen && canComment && (
              <CommentsSection
                post={post}
                commentsQ={commentsQ}
                addComment={addComment}
                deleteComment={deleteComment}
                currentUser={user}
                userProfile={userProfile}
              />
            )}
          </div>
        </div>
      </CardContent>
      {confirmDelete && (
        <ConfirmDeleteWrapper post={post} onClose={() => setConfirmDelete(false)} />
      )}
      {zoomImage && (
        <ImageZoomDialog
          src={zoomImage.src}
          alt={zoomImage.alt}
          name={zoomImage.name}
          open
          onOpenChange={(o) => !o && setZoomImage(null)}
        />
      )}
    </Card>
  );
}

function isImageAttachment(att) {
  if (!att) return false;
  if (att.type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(att.url || '');
}

function ConfirmDeleteWrapper({ post, onClose }) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Excluir post"
      description="Tem certeza que deseja excluir este post? As curtidas e comentários serão removidos juntos."
      confirmLabel="Excluir"
      destructive
      onConfirm={async () => {
        try {
          window.dispatchEvent(new CustomEvent('club-post-confirm-delete', { detail: { postId: post.id } }));
        } catch (err) {
          toast.error(err?.message || 'Não foi possível excluir.');
        } finally {
          onClose();
        }
      }}
    />
  );
}

function CommentsSection({ post, commentsQ, addComment, deleteComment, currentUser, userProfile }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    try {
      await addComment.mutateAsync({ post, text: value });
      setText('');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o comentário.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment.mutateAsync(commentId);
      setConfirmDel(null);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir o comentário.');
    }
  };

  const list = commentsQ.data || [];

  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      {commentsQ.isLoading ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">Carregando comentários…</p>
      ) : list.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">Sem comentários. Seja o primeiro!</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const isMine = c.author_id === currentUser?.uid;
            return (
              <li key={c.id} className="flex items-start gap-2">
                {c.author_photo ? (
                  <img src={c.author_photo} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                    {initials(c.author_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1 rounded-lg bg-secondary/30 px-3 py-2">
                  <p className="text-[11px] font-semibold">
                    {c.author_name}
                    {c.edited && <span className="ml-1 italic text-muted-foreground">(editado)</span>}
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] text-foreground/90">{c.text}</p>
                </div>
                {isMine && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setConfirmDel(c)}
                    aria-label="Excluir comentário"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-end gap-2 pt-1">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário…"
          className="min-h-[40px] resize-none text-sm"
          rows={1}
        />
        <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {confirmDel && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDel(null)}
          title="Excluir comentário"
          description="Deseja excluir este comentário?"
          confirmLabel="Excluir"
          destructive
          onConfirm={() => handleDelete(confirmDel.id)}
        />
      )}
    </div>
  );
}

function initials(name) {
  return String(name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}
