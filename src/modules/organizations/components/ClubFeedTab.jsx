import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  PlusCircle, Send, Trash2, X, ImagePlus, Loader2, MessageSquare, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useClubPosts, useCreateClubPost, useUpdateClubPost, useDeleteClubPost,
} from '../hooks/useClubFeed';
import {
  uploadImage, maxImageMb, ACCEPTED_IMAGE_ATTR,
} from '@/core/services/storageService';
import { POST_INTERACTION, POST_INTERACTION_LABELS, ORG_MURAL_LIMITS } from '../domain/constants';
import { canManageClubFeed } from '../domain/permissions';
import ClubPostCard from './ClubPostCard';
import { cn } from '@/core/lib/utils';

const MAX_IMAGES = ORG_MURAL_LIMITS.ATTACHMENT_MAX;

/**
 * Mural da ONG (aba Mural).
 *
 * Funcionalidades:
 *  - Membros da ONG com permissão `feed` (ou owner) podem:
 *      * Criar posts com título, texto e imagem
 *      * Escolher, no momento de criar, qual o nível de interação
 *        permitido (curtidas, comentários, ambos, ou nenhum)
 *      * Editar seus próprios posts enquanto não houver curtidas/comentários
 *      * Excluir seus próprios posts (e qualquer membro com `feed` pode
 *        excluir QUALQUER post, para moderação)
 *  - O público em geral pode:
 *      * Visualizar todos os posts
 *      * Curtir e/ou comentar, conforme o que o criador do post permitiu
 *      * Excluir seus próprios comentários
 *
 * A permissão `feed` é resolvida pelo chamador (perfil admin) e passada em
 * `canManageFeed`. Manter um único caminho de permissão garante coerência
 * entre a aba visível e os botões exibidos.
 */
export default function ClubFeedTab({ clubId, club, membership, canManageFeed }) {
  const { user, userProfile } = useAuth();
  const { data: posts = [], isLoading } = useClubPosts(clubId);
  const createPost = useCreateClubPost(clubId);
  const updatePost = useUpdateClubPost(clubId);
  const deletePost = useDeleteClubPost(clubId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const post = posts.find((p) => p.id === e.detail?.postId);
      if (post) setConfirmDelete(post);
    };
    window.addEventListener('club-post-confirm-delete', handler);
    return () => window.removeEventListener('club-post-confirm-delete', handler);
  }, [posts]);

  const canPost = canManageFeed || canManageClubFeed(club, membership, user?.uid);
  // `isAdminView` = mural está sendo exibido dentro do painel admin ou pra
  // alguém que pode gerenciar. Se for só a visualização pública, escondemos
  // as ações de gestão (criar / editar / excluir post). Os likes e
  // comentários continuam liberados — são interação social legítima do
  // público, não "gestão da ONG" (essa fica exclusiva no painel admin).
  const isAdminView = canPost;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePost.mutateAsync(confirmDelete.id);
      toast.success('Post excluído.');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir o post.');
    }
  };

  const handleEdit = (post) => {
    setEditing(post);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <form onSubmit={handlePost} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Compartilhe um aviso, avise sobre um mutirão, comemore uma adoção…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            {pendingImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {pendingImages.map((image) => (
                  <div key={image.path} className="group relative aspect-square overflow-hidden rounded-lg border border-primary/10">
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending(image)}
                      aria-label="Remover imagem"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_ATTR}
              multiple
              onChange={handlePickImages}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || pendingImages.length >= MAX_IMAGES_PER_POST}
              >
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
                {uploading ? 'Enviando…' : 'Adicionar imagens'}
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit}>
                <Send className="mr-1.5 h-4 w-4" /> {createPost.isPending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Até {MAX_IMAGES_PER_POST} imagens por publicação, {maxImageMb()} MB cada. As imagens podem ser baixadas em alta qualidade pelos membros.
            </p>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Mural vazio"
          description={canPost ? 'Crie a primeira publicação para esta ONG.' : 'Esta ONG ainda não publicou nada.'}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const canEdit = isAdminView
              && post.author_id === user?.uid
              && (post.likes_count || 0) === 0
              && (post.comments_count || 0) === 0;
            return (
              <Card key={post.id} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {post.author_photo ? (
                      <img src={post.author_photo} alt="" className="h-9 w-9 shrink-0 rounded-full border border-primary/10 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {initials(post.author_name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-foreground">{post.author_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{timeAgo(post.created_at_ms)}</span>
                        </div>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(post)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {post.content && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{post.content}</p>
                      )}
                      <PostImages images={post.images} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PostEditorDialog
        open={editorOpen}
        onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditing(null); } }}
        post={editing}
        user={user}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updatePost.mutateAsync({ postId: editing.id, input: data });
              toast.success('Publicação atualizada.');
            } else {
              await createPost.mutateAsync(data);
              toast.success('Publicado!');
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

/* ============================== Editor (criar/editar) ============================== */
/* ============================== Editor (criar/editar) ============================== */

function PostEditorDialog({ open, onOpenChange, post, user, onSubmit, isPending }) {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pending, setPending] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [interaction, setInteraction] = useState(POST_INTERACTION.BOTH);

  useEffect(() => {
    if (open) {
      setTitle(post?.title || '');
      setContent(post?.content || '');
      setPending(post?.attachments || []);
      setInteraction(post?.allow_interaction || POST_INTERACTION.BOTH);
    } else {
      setTitle('');
      setContent('');
      setPending([]);
      setInteraction(POST_INTERACTION.BOTH);
    }
  }, [open, post]);

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
          // Importante: usar o `user.uid` do caller, não o `post?.author_id`
          // (que é undefined quando estamos criando um post novo).
          const meta = await uploadImage(file, { uid: user?.uid, folder: 'club_posts' });
          setPending((prev) => [...prev, {
            url: meta.url,
            path: meta.path,
            name: file.name,
            type: file.type,
            size: file.size,
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

  const canSubmit = (title.trim() || content.trim() || pending.length > 0) && !isPending && !uploading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      title,
      content,
      attachments: pending,
      allow_interaction: interaction,
    });
  };

  return (
    <div className={`mt-3 grid gap-2 ${list.length === 1 ? 'grid-cols-1 sm:max-w-md' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {list.map((image) => (
        <div key={image.path || image.url} className="group relative overflow-hidden rounded-lg border border-primary/10 bg-secondary">
          <a href={image.url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={image.url}
              alt={image.name || ''}
              loading="lazy"
              className={`w-full object-cover ${list.length === 1 ? 'max-h-96' : 'aspect-square'}`}
            />
          </a>
          <button
            type="button"
            onClick={() => handleDownload(image)}
            aria-label="Baixar imagem"
            title="Baixar em alta qualidade"
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/60 text-white opacity-0 transition-opacity hover:bg-foreground/80 group-hover:opacity-100"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
