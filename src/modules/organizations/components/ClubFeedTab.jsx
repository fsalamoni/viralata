import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  PlusCircle, Send, Trash2, X, ImagePlus, Loader2, MessageSquare, Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import ClubPostCard from './ClubPostCard';
import { cn } from '@/core/lib/utils';

const MAX_IMAGES = ORG_MURAL_LIMITS.ATTACHMENT_MAX;

/**
 * Mural da ONG (aba Mural).
 *
 * Funcionalidades:
 *  - Membros da ONG com permissão `feed` (ou superior) podem:
 *      * Criar posts com título, texto e imagem
 *      * Escolher, no momento de criar, qual o nível de interação
 *        permitido (curtidas, comentários, ambos, ou nenhum)
 *      * Editar seus próprios posts enquanto não houver curtidas/comentários
 *      * Excluir seus próprios posts (e qualquer admin pode excluir)
 *  - O público em geral pode:
 *      * Visualizar todos os posts
 *      * Curtir e/ou comentar, conforme o que o criador do post permitiu
 *      * Excluir seus próprios comentários
 */
export default function ClubFeedTab({ clubId, club, membership, isAdmin }) {
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

  const canPost = isAdmin || hasFeedPermission(club, membership, user?.uid);

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
      {canPost && (
        <Button
          type="button"
          onClick={() => { setEditing(null); setEditorOpen(true); }}
        >
          <PlusCircle className="mr-1.5 h-4 w-4" /> Nova publicação
        </Button>
      )}

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
            const canEdit = post.author_id === user?.uid
              && (post.likes_count || 0) === 0
              && (post.comments_count || 0) === 0;
            return (
              <div key={post.id} className="space-y-1">
                <ClubPostCard
                  post={post}
                  club={club}
                  membership={membership}
                  currentUserUid={user?.uid}
                />
                {canEdit && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(post)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar publicação
                    </Button>
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

function hasFeedPermission(club, membership, uid) {
  if (!club || !membership) return false;
  if (membership.role === 'admin') return true;
  return !!membership.permissions?.feed;
}

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
          <DialogDescription>
            Compartilhe um aviso, fotos ou eventos com a comunidade da ONG.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post_title">Título</Label>
            <Input
              id="post_title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, ORG_MURAL_LIMITS.TITLE_MAX))}
              maxLength={ORG_MURAL_LIMITS.TITLE_MAX}
              placeholder="Ex.: Mutirão de adoção neste sábado"
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {title.length}/{ORG_MURAL_LIMITS.TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_content">Mensagem</Label>
            <Textarea
              id="post_content"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, ORG_MURAL_LIMITS.CONTENT_MAX))}
              rows={4}
              maxLength={ORG_MURAL_LIMITS.CONTENT_MAX}
              placeholder="Escreva sua mensagem…"
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {content.length}/{ORG_MURAL_LIMITS.CONTENT_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Imagem</Label>
            {pending.length > 0 && (
              <div
                className={`grid gap-1.5 ${
                  pending.length === 1
                    ? 'grid-cols-1'
                    : pending.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {pending.map((att, idx) => (
                  <div
                    key={`${att.path || att.url}-${idx}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/30"
                  >
                    <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePending(idx)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remover ${att.name}`}
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
              onChange={handlePick}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || pending.length >= MAX_IMAGES}
            >
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              {uploading ? 'Enviando…' : 'Adicionar imagem'}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Até {MAX_IMAGES} imagens, {maxImageMb()} MB cada.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_interaction">Interação permitida</Label>
            <Select value={interaction} onValueChange={setInteraction}>
              <SelectTrigger id="post_interaction"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(POST_INTERACTION).map((v) => (
                  <SelectItem key={v} value={v}>{POST_INTERACTION_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Define se o público pode curtir e/ou comentar esta publicação. Após receber interações, a configuração fica travada (edição exige remover as interações).
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Send className="mr-1.5 h-4 w-4" /> {isPending ? 'Salvando…' : (post ? 'Salvar alterações' : 'Publicar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
