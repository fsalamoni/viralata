/**
 * @fileoverview Componente: ShelterMuralPublicBlock (Fase 4 — SHELTER_MURAL_V2).
 *
 * View pública do mural do abrigo. Só é renderizado quando a flag
 * `SHELTER_MURAL_V2` está ligada (a página pública faz a aba condicional).
 *
 * Mostra APENAS posts públicos (status efetivo `published` — rascunhos,
 * agendados e arquivados nunca aparecem), com fixados no topo, tags e as
 * interações do público (curtir/comentar). Respeita a moderação: comentários
 * ocultados (`moderation.hidden_comment_ids`) não são exibidos ao público.
 *
 * É auto-contido (não reusa `ClubPostCard`) justamente para poder filtrar os
 * comentários ocultados — o card do mural V1 não conhece a moderação.
 */

import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Pin, Send, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  useClubPosts, useClubPostComments, useAddClubPostComment,
  useToggleClubPostLike, useMyLikedPostIds,
} from '@/modules/organizations/hooks/useClubFeed';
import { canLikeClubPost, canCommentOnClubPost } from '@/modules/organizations/domain/permissions';
import { publicMuralPosts, isPinned, postTags, visiblePublicComments } from '@/modules/shelter/domain/engagement/muralView';

function initials(name) {
  return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

function timeAgo(post) {
  const ms = post?.created_at_ms || (post?.created_at?.seconds ? post.created_at.seconds * 1000 : null);
  if (!ms) return '';
  try {
    return formatDistanceToNow(new Date(ms), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

export function ShelterMuralPublicBlock({ clubId, club }) {
  const isV2Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_MURAL_V2);
  const { data: posts = [], isLoading } = useClubPosts(clubId);
  const publicPosts = useMemo(() => publicMuralPosts(posts), [posts]);

  if (!isV2Enabled) return null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="mt-2 h-20 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (publicPosts.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Mural do abrigo"
        description="Este abrigo ainda não publicou nada no mural."
      />
    );
  }

  return (
    <div className="space-y-3">
      {publicPosts.map((post) => (
        <PublicMuralPost key={post.id} post={post} club={club} clubId={clubId} />
      ))}
    </div>
  );
}

export default ShelterMuralPublicBlock;

function PublicMuralPost({ post, club, clubId }) {
  const { user } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const pinned = isPinned(post);
  const tags = postTags(post);
  const images = (post.attachments || []).filter((a) => isImageAttachment(a));

  const myLikesQ = useMyLikedPostIds(clubId);
  const liked = myLikesQ.data?.includes(post.id);
  const toggleLike = useToggleClubPostLike(clubId);

  const canLike = canLikeClubPost(post, user);
  const canComment = canCommentOnClubPost(post, user);

  const handleLike = async () => {
    if (!user?.uid) {
      toast.error('Faça login para curtir.');
      return;
    }
    try {
      await toggleLike.mutateAsync(post);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível curtir.');
    }
  };

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-3">
        {post.author_photo ? (
          <img src={post.author_photo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
            {initials(post.author_name || club?.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.author_name || club?.name || 'Abrigo'}</p>
          <p className="text-[11px] text-muted-foreground">{timeAgo(post)}</p>
        </div>
        {pinned && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Pin className="h-3 w-3" /> Fixado
          </span>
        )}
      </header>

      {post.title && <h4 className="mt-3 text-sm font-bold text-foreground">{post.title}</h4>}
      {post.content && <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground/90">{post.content}</p>}

      {images.length > 0 && (
        <div className={`mt-3 grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {images.map((att, idx) => (
            <a
              key={`${att.path || att.url}-${idx}`}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary/30"
            >
              <img src={att.url} alt={att.name || ''} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
        </div>
      )}

      {(canLike || canComment) && (
        <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3">
          {canLike && (
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-primary'}`}
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
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              aria-label="Comentar"
            >
              <MessageCircle className="h-4 w-4" /> {post.comments_count || 0}
            </button>
          )}
        </div>
      )}

      {commentsOpen && canComment && <PublicComments post={post} />}
    </article>
  );
}

function PublicComments({ post }) {
  const { user } = useAuth();
  const commentsQ = useClubPostComments(post.id);
  const addComment = useAddClubPostComment(post.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const visible = useMemo(
    () => visiblePublicComments(commentsQ.data || [], post),
    [commentsQ.data, post],
  );

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    if (!user?.uid) {
      toast.error('Faça login para comentar.');
      return;
    }
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

  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      {commentsQ.isLoading ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">Carregando comentários…</p>
      ) : visible.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">Sem comentários. Seja o primeiro!</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.author_photo ? (
                <img src={c.author_photo} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                  {initials(c.author_name)}
                </div>
              )}
              <div className="min-w-0 flex-1 rounded-lg bg-secondary/30 px-3 py-2">
                <p className="text-[11px] font-semibold">{c.author_name}</p>
                <p className="whitespace-pre-wrap text-[13px] text-foreground/90">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {user?.uid && (
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Escreva um comentário…"
            className="min-h-[38px] flex-1 text-sm"
          />
          <Button type="button" size="sm" onClick={handleSend} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function isImageAttachment(att) {
  if (!att) return false;
  if (att.type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(att.url || '');
}
