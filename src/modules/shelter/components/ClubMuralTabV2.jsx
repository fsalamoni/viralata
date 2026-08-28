/**
 * @fileoverview Componente: ClubMuralTabV2 (Fase 4 — SHELTER_MURAL_V2).
 *
 * Superset retrocompatível do mural (`ClubFeedTab`, V1). Só é renderizado quando
 * a flag `SHELTER_MURAL_V2` está ligada (o painel V3 faz o swap; com a flag OFF,
 * o `ClubFeedTab` é renderizado intacto).
 *
 * Aprimoramentos (aditivos, gravados nos MESMOS documentos `club_posts`):
 *  - Composer avançado: título/mensagem/imagens/interação (como no V1) + tags,
 *    menções a membros, agendamento (data/hora) e salvar como rascunho.
 *  - Gestão: busca, filtro por status, filtro por tag, ordenação (fixados no
 *    topo), fixar/desafixar, arquivar/publicar, editar e excluir.
 *  - Analytics: publicados/rascunhos/agendados/arquivados, curtidas, comentários,
 *    engajamento médio e top posts.
 *  - Moderação de comentários: ocultar/reexibir por comentário (armazenado em
 *    `moderation.hidden_comment_ids` no próprio post).
 *
 * O caminho de leitura/listagem reaproveita `useClubPosts`; o corpo de cada post
 * reaproveita `ClubPostCard`. Nada aqui altera a segurança/escrita do mural V1.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  PlusCircle, Send, X, ImagePlus, Loader2, MessageSquare, Pencil, Pin, PinOff,
  Archive, ArchiveRestore, Search, Tag, Calendar, FileEdit, Eye, EyeOff, Megaphone,
  BarChart3, Filter, AtSign, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  useClubPosts, useDeleteClubPost, useClubPostComments,
} from '@/modules/organizations/hooks/useClubFeed';
import { useClubMembers } from '@/modules/organizations/hooks/useClubs';
import {
  uploadImage, maxImageMb, ACCEPTED_IMAGE_ATTR,
} from '@/core/services/storageService';
import {
  POST_INTERACTION, POST_INTERACTION_LABELS, ORG_MURAL_LIMITS,
} from '@/modules/organizations/domain/constants';
import { canManageClubFeed } from '@/modules/organizations/domain/permissions';
import ClubPostCard from '@/modules/organizations/components/ClubPostCard';
import { cn } from '@/core/lib/utils';
import {
  POST_STATUS, POST_STATUS_LABELS, MURAL_LIMITS, normalizeTagList,
} from '@/modules/shelter/domain/engagement/mural';
import {
  derivePostStatus, isPinned, postTags, filterMuralPosts, sortMuralPosts,
  collectTags, computeMuralAnalytics, hiddenCommentIds, isCommentHidden,
} from '@/modules/shelter/domain/engagement/muralView';
import {
  useCreateMuralPost, useUpdateMuralPost, useSetPostPinned,
  useArchivePost, usePublishPost, useHideComment, useUnhideComment,
} from '@/modules/shelter/hooks/useShelterMural';

const MAX_IMAGES = ORG_MURAL_LIMITS.ATTACHMENT_MAX;

const STATUS_BADGE = {
  [POST_STATUS.PUBLISHED]: 'border-green-200 bg-green-50 text-green-800',
  [POST_STATUS.SCHEDULED]: 'border-blue-200 bg-blue-50 text-blue-800',
  [POST_STATUS.DRAFT]: 'border-amber-200 bg-amber-50 text-amber-800',
  [POST_STATUS.ARCHIVED]: 'border-border bg-secondary/40 text-muted-foreground',
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: POST_STATUS.PUBLISHED, label: POST_STATUS_LABELS[POST_STATUS.PUBLISHED] },
  { key: POST_STATUS.SCHEDULED, label: POST_STATUS_LABELS[POST_STATUS.SCHEDULED] },
  { key: POST_STATUS.DRAFT, label: POST_STATUS_LABELS[POST_STATUS.DRAFT] },
  { key: POST_STATUS.ARCHIVED, label: POST_STATUS_LABELS[POST_STATUS.ARCHIVED] },
];

/**
 * Mural V2 do abrigo. `canManageFeed` é resolvido pelo chamador (painel admin).
 */
export function ClubMuralTabV2({ clubId, club, membership, canManageFeed }) {
  const isV2Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_MURAL_V2);
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useClubPosts(clubId);
  const { data: members = [] } = useClubMembers(clubId);

  const createPost = useCreateMuralPost(clubId);
  const updatePost = useUpdateMuralPost(clubId);
  const setPinned = useSetPostPinned(clubId);
  const archive = useArchivePost(clubId);
  const publish = usePublishPost(clubId);
  const deletePost = useDeleteClubPost(clubId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const post = posts.find((p) => p.id === e.detail?.postId);
      if (post) setConfirmDelete(post);
    };
    window.addEventListener('club-post-confirm-delete', handler);
    return () => window.removeEventListener('club-post-confirm-delete', handler);
  }, [posts]);

  const canPost = canManageFeed || canManageClubFeed(club, membership, user?.uid);

  const analytics = useMemo(() => computeMuralAnalytics(posts), [posts]);
  const allTags = useMemo(() => collectTags(posts), [posts]);
  const visible = useMemo(() => {
    const filtered = filterMuralPosts(posts, {
      status: statusFilter,
      search,
      tags: tagFilter ? [tagFilter] : [],
    });
    return sortMuralPosts(filtered);
  }, [posts, statusFilter, search, tagFilter]);

  if (!isV2Enabled) return null;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePost.mutateAsync(confirmDelete.id);
      toast.success('Publicação excluída.');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir a publicação.');
    }
  };

  const handlePin = async (post, pinned) => {
    try {
      await setPinned.mutateAsync({ postId: post.id, pinned });
      toast.success(pinned ? 'Publicação fixada.' : 'Publicação desafixada.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível atualizar.');
    }
  };

  const handleArchive = async (post, archived) => {
    try {
      if (archived) await archive.mutateAsync(post.id);
      else await publish.mutateAsync(post.id);
      toast.success(archived ? 'Publicação arquivada.' : 'Publicação restaurada.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível atualizar.');
    }
  };

  const handlePublishNow = async (post) => {
    try {
      await publish.mutateAsync(post.id);
      toast.success('Publicado!');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível publicar.');
    }
  };

  return (
    <div className="space-y-4">
      <ConceptHeader />

      {canPost && <AnalyticsCards analytics={analytics} />}

      {canPost && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => { setEditing(null); setEditorOpen(true); }}
            disabled={createPost.isPending}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" /> Nova publicação
          </Button>
        </div>
      )}

      {canPost && posts.length > 0 && (
        <MuralToolbar
          search={search}
          onSearch={setSearch}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          tagFilter={tagFilter}
          onTagFilter={setTagFilter}
          allTags={allTags}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="arena-section-card">
              <div className="arena-section-card-body space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-20 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Mural vazio"
          description={canPost ? 'Crie a primeira publicação para este abrigo.' : 'Este abrigo ainda não publicou nada.'}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Nenhuma publicação encontrada"
          description="Ajuste a busca ou os filtros para ver as publicações."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((post) => (
            <PostAdminRow
              key={post.id}
              post={post}
              club={club}
              membership={membership}
              currentUserUid={user?.uid}
              canManage={canPost}
              onEdit={() => { setEditing(post); setEditorOpen(true); }}
              onPin={handlePin}
              onArchive={handleArchive}
              onPublishNow={handlePublishNow}
              clubId={clubId}
            />
          ))}
        </div>
      )}

      <AdvancedComposerDialog
        open={editorOpen}
        onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditing(null); } }}
        post={editing}
        user={user}
        members={members}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updatePost.mutateAsync({ postId: editing.id, input: data });
              toast.success('Publicação atualizada.');
            } else {
              await createPost.mutateAsync(data);
              toast.success(data.status === POST_STATUS.DRAFT
                ? 'Rascunho salvo.'
                : data.status === POST_STATUS.SCHEDULED
                  ? 'Publicação agendada.'
                  : 'Publicado!');
            }
            setEditorOpen(false);
            setEditing(null);
          } catch (err) {
            toast.error(err?.message || 'Não foi possível salvar a publicação.');
          }
        }}
        isPending={createPost.isPending || updatePost.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Excluir publicação"
        description="Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deletePost.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default ClubMuralTabV2;

/* ============================== ConceptHeader ============================== */

function ConceptHeader() {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Mural do abrigo
          </h3>
          <p className="arena-section-card-description">
            O mural é o canal do abrigo para <strong>comunicar avisos, eventos e conquistas</strong> ao público.
            Aqui você pode <strong>agendar</strong> publicações, salvar <strong>rascunhos</strong>, organizar por
            <strong> tags</strong> e <strong>menções</strong>, <strong>fixar</strong> o que importa, <strong>arquivar</strong>
            o que saiu de pauta, <strong>buscar</strong> no histórico e <strong>moderar</strong> as interações do público.
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Calendar className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Agende e rascunhe.</strong> Publique agora, depois ou guarde para revisar.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Pin className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Fixe e organize.</strong> Destaque avisos e classifique por tags.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <EyeOff className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Modere.</strong> Oculte comentários impróprios sem apagar o histórico.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ============================== AnalyticsCards ============================== */

function AnalyticsCards({ analytics }) {
  const cards = [
    { label: 'Publicados', value: analytics.published, icon: Megaphone },
    { label: 'Agendados', value: analytics.scheduled, icon: Calendar },
    { label: 'Rascunhos', value: analytics.drafts, icon: FileEdit },
    { label: 'Arquivados', value: analytics.archived, icon: Archive },
    { label: 'Curtidas', value: analytics.likes, icon: BarChart3 },
    { label: 'Comentários', value: analytics.comments, icon: MessageSquare },
  ];
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Visão geral do mural
          </h3>
          <p className="arena-section-card-description">
            Engajamento médio por publicação: <strong>{analytics.avgEngagement}</strong>.
            {analytics.pinned > 0 && <> {analytics.pinned} fixada(s).</>}
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {label}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
            </div>
          ))}
        </div>
        {analytics.topPosts.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mais engajados
            </p>
            <ul className="space-y-1">
              {analytics.topPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs">
                  <span className="truncate text-foreground">{p.title || 'Sem título'}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">♥ {p.likes} · 💬 {p.comments}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================== MuralToolbar ============================== */

function MuralToolbar({ search, onSearch, statusFilter, onStatusFilter, tagFilter, onTagFilter, allTags }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar no mural (título, texto, tag)…"
            className="pl-8 text-sm"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={tagFilter}
              onChange={(e) => onTagFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="">Todas as tags</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onStatusFilter(s.key)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-bold transition-colors',
              statusFilter === s.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================== PostAdminRow ============================== */

function PostAdminRow({
  post, club, membership, currentUserUid, canManage, onEdit, onPin, onArchive, onPublishNow, clubId,
}) {
  const status = derivePostStatus(post);
  const pinned = isPinned(post);
  const tags = postTags(post);
  const archived = status === POST_STATUS.ARCHIVED;
  const isDraftOrScheduled = status === POST_STATUS.DRAFT || status === POST_STATUS.SCHEDULED;
  const [moderating, setModerating] = useState(false);
  const hiddenCount = hiddenCommentIds(post).length;

  return (
    <div className="space-y-1">
      {(status !== POST_STATUS.PUBLISHED || pinned || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Pin className="h-3 w-3" /> Fixado
            </span>
          )}
          {status !== POST_STATUS.PUBLISHED && (
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', STATUS_BADGE[status])}>
              {POST_STATUS_LABELS[status]}
              {status === POST_STATUS.SCHEDULED && post.scheduled_for
                ? ` · ${new Date(post.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
                : ''}
            </span>
          )}
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
          ))}
        </div>
      )}

      <ClubPostCard
        post={post}
        club={club}
        membership={membership}
        currentUserUid={currentUserUid}
        readonly={!canManage}
      />

      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {isDraftOrScheduled && (
            <Button size="sm" variant="ghost" onClick={() => onPublishNow(post)}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Publicar agora
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onPin(post, !pinned)}>
            {pinned ? <PinOff className="mr-1.5 h-3.5 w-3.5" /> : <Pin className="mr-1.5 h-3.5 w-3.5" />}
            {pinned ? 'Desafixar' : 'Fixar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onArchive(post, !archived)}>
            {archived ? <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> : <Archive className="mr-1.5 h-3.5 w-3.5" />}
            {archived ? 'Restaurar' : 'Arquivar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          {(post.comments_count || 0) > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setModerating((v) => !v)}>
              <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Moderar
              {hiddenCount > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({hiddenCount})</span>}
              {moderating ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}

      {canManage && moderating && (
        <ModerationPanel post={post} clubId={clubId} />
      )}
    </div>
  );
}

/* ============================== ModerationPanel ============================== */

function ModerationPanel({ post, clubId }) {
  const { data: comments = [], isLoading } = useClubPostComments(post.id);
  const hideComment = useHideComment(clubId, post.id);
  const unhideComment = useUnhideComment(clubId, post.id);

  const toggle = async (commentId, hidden) => {
    try {
      if (hidden) await unhideComment.mutateAsync(commentId);
      else await hideComment.mutateAsync(commentId);
      toast.success(hidden ? 'Comentário reexibido.' : 'Comentário ocultado.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível moderar.');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Moderação de comentários
      </p>
      {isLoading ? (
        <Skeleton className="h-8 w-full rounded" />
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum comentário.</p>
      ) : (
        <ul className="space-y-1.5">
          {comments.map((c) => {
            const hidden = isCommentHidden(post, c.id);
            return (
              <li
                key={c.id}
                className={cn(
                  'flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs',
                  hidden ? 'border-dashed border-border bg-background/60 opacity-70' : 'border-border bg-background',
                )}
              >
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">{c.author_name || 'Anônimo'}: </span>
                  <span className="text-muted-foreground">{c.text}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2"
                  onClick={() => toggle(c.id, hidden)}
                  disabled={hideComment.isPending || unhideComment.isPending}
                >
                  {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================== AdvancedComposerDialog ============================== */

function AdvancedComposerDialog({ open, onOpenChange, post, user, members, onSubmit, isPending }) {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pending, setPending] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [interaction, setInteraction] = useState(POST_INTERACTION.BOTH);
  const [tagsRaw, setTagsRaw] = useState('');
  const [mentions, setMentions] = useState([]);
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(post?.title || '');
      setContent(post?.content || '');
      setPending(post?.attachments || []);
      setInteraction(post?.allow_interaction || POST_INTERACTION.BOTH);
      setTagsRaw((post?.tags || []).join(', '));
      setMentions(Array.isArray(post?.mentions) ? post.mentions : []);
      setScheduledFor(post?.scheduled_for ? toLocalInput(post.scheduled_for) : '');
    } else {
      setTitle(''); setContent(''); setPending([]); setInteraction(POST_INTERACTION.BOTH);
      setTagsRaw(''); setMentions([]); setScheduledFor('');
    }
  }, [open, post]);

  const previewTags = useMemo(() => normalizeTagList(tagsRaw), [tagsRaw]);

  const handlePick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - pending.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por publicação.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files.slice(0, remaining)) {
        try {
          const meta = await uploadImage(file, { uid: user?.uid, folder: 'club_posts' });
          setPending((prev) => [...prev, {
            url: meta.url, path: meta.path, name: file.name, type: file.type, size: file.size,
          }]);
        } catch (err) {
          toast.error(err?.message || `Falha ao enviar ${file.name}.`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const removePending = (idx) => setPending((prev) => prev.filter((_, i) => i !== idx));

  const toggleMention = (m) => {
    setMentions((prev) => (prev.some((x) => x.uid === m.uid)
      ? prev.filter((x) => x.uid !== m.uid)
      : prev.length >= MURAL_LIMITS.MENTIONS_MAX ? prev : [...prev, m]));
  };

  const hasContent = title.trim() || content.trim() || pending.length > 0;
  const canSubmit = hasContent && !isPending && !uploading;

  const submit = async (status) => {
    if (!canSubmit) return;
    await onSubmit({
      title,
      content,
      attachments: pending,
      allow_interaction: interaction,
      tags: previewTags,
      mentions,
      status,
      scheduled_for: scheduledFor ? new Date(scheduledFor).getTime() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
          <DialogDescription>
            Compartilhe avisos, fotos ou eventos. Agende, use tags e mencione membros.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mural_title">Título</Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {title.length}/{ORG_MURAL_LIMITS.TITLE_MAX}
              </span>
            </div>
            <Input
              id="mural_title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, ORG_MURAL_LIMITS.TITLE_MAX))}
              maxLength={ORG_MURAL_LIMITS.TITLE_MAX}
              placeholder="Ex.: Mutirão de adoção neste sábado"
              className="text-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mural_content">Mensagem</Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {content.length}/{ORG_MURAL_LIMITS.CONTENT_MAX}
              </span>
            </div>
            <Textarea
              id="mural_content"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, ORG_MURAL_LIMITS.CONTENT_MAX))}
              rows={4}
              maxLength={ORG_MURAL_LIMITS.CONTENT_MAX}
              placeholder="Escreva sua mensagem…"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="mural_tags" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Tags
            </Label>
            <Input
              id="mural_tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="Ex.: adoção, evento, vacina (separadas por vírgula)"
            />
            {previewTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {previewTags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Até {MURAL_LIMITS.TAGS_MAX} tags, {MURAL_LIMITS.TAG_MAX_LEN} caracteres cada.
            </p>
          </div>

          {/* Menções */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><AtSign className="h-3.5 w-3.5" /> Mencionar membros</Label>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {members.map((m) => {
                  const selected = mentions.some((x) => x.uid === m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleMention({ uid: m.user_id, name: m.user_name })}
                      className={cn(
                        'inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      @{m.user_name || 'membro'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Imagens */}
          <div className="space-y-2">
            <Label>Imagem</Label>
            {pending.length > 0 && (
              <div className={`grid gap-1.5 ${pending.length === 1 ? 'grid-cols-1' : pending.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {pending.map((att, idx) => (
                  <div key={`${att.path || att.url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/30 shadow-sm">
                    <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending(idx)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-black/90"
                      aria-label={`Remover ${att.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_ATTR} multiple onChange={handlePick} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || pending.length >= MAX_IMAGES}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              {uploading ? 'Enviando…' : 'Adicionar imagem'}
            </Button>
            <p className="text-[10px] text-muted-foreground">Até {MAX_IMAGES} imagens, {maxImageMb()} MB cada.</p>
          </div>

          {/* Interação */}
          <div className="space-y-2">
            <Label>Interação permitida</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(POST_INTERACTION).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setInteraction(v)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-colors',
                    interaction === v ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {POST_INTERACTION_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Agendamento */}
          <div className="space-y-2">
            <Label htmlFor="mural_schedule" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Agendar publicação (opcional)
            </Label>
            <Input
              id="mural_schedule"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Se definir uma data futura e publicar, a publicação fica <strong>agendada</strong> até a data.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" variant="outline" onClick={() => submit(POST_STATUS.DRAFT)} disabled={!canSubmit}>
            <FileEdit className="mr-1.5 h-4 w-4" /> Salvar rascunho
          </Button>
          <Button type="button" onClick={() => submit(POST_STATUS.PUBLISHED)} disabled={!canSubmit}>
            <Send className="mr-1.5 h-4 w-4" />
            {isPending ? 'Salvando…' : scheduledFor ? 'Agendar' : (post ? 'Salvar' : 'Publicar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Converte epoch ms → string aceita pelo input datetime-local (horário local). */
function toLocalInput(ms) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
