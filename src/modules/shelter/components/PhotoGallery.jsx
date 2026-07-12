/**
 * @fileoverview Componente: PhotoGallery (Fase 10).
 *
 * Galeria de fotos com tabs por categoria, soft delete, lixeira com
 * restauração (até 30d).
 *
 * Feature flag: `shelter_gallery` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  daysUntilPurge,
} from '@/modules/shelter/domain/operational/gallery';
import {
  usePetPhotos,
  useDeletedPetPhotos,
  useCreatePetPhoto,
  useUpdatePetPhoto,
  useSoftDeletePetPhoto,
  useRestorePetPhoto,
} from '@/modules/shelter/hooks/useGallery';
import { PhotoUploadForm } from './PhotoUploadForm';
import { confirmDialog } from '@/components/ui/confirm-provider';

export function PhotoGallery({ petId, shelterClubId, canEdit = false, actor }) {
  const [tab, setTab] = useState('gallery');   // 'gallery' | 'trash'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: photos = [], isLoading: loadingPhotos } = usePetPhotos(
    petId, shelterClubId, { category: categoryFilter },
  );
  const { data: trash = [], isLoading: loadingTrash } = useDeletedPetPhotos(petId, shelterClubId);
  const createMutation = useCreatePetPhoto();
  const updateMutation = useUpdatePetPhoto();
  const deleteMutation = useSoftDeletePetPhoto();
  const restoreMutation = useRestorePetPhoto();
  const { toast } = useToast();

  if (!petId || !shelterClubId) {
    return <p className="text-sm text-muted-foreground">Pet/abrigo não definidos.</p>;
  }

  const handleUpload = async (input) => {
    try {
      await createMutation.mutateAsync({ input, actor });
      toast({ title: 'Foto adicionada à galeria.' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async (photoId) => {
    if (!(await confirmDialog({ title: 'Enviar foto para a lixeira? (pode restaurar em até 30 dias)' }))) return;
    try {
      await deleteMutation.mutateAsync({ photoId, shelterClubId, actor });
      toast({ title: 'Foto movida para a lixeira.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleRestore = async (photoId) => {
    try {
      const r = await restoreMutation.mutateAsync({ photoId, shelterClubId, actor });
      if (r.noop) {
        toast({ title: 'Foto já não estava deletada.' });
      } else {
        toast({ title: `Foto restaurada (${r.days_remaining} dias restantes).` });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Galeria de Fotos</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === 'gallery'
                ? `${photos.length} foto(s) ${categoryFilter ? `(${PHOTO_CATEGORY_LABELS[categoryFilter]})` : ''}`
                : `${trash.length} foto(s) na lixeira`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={tab === 'gallery' ? 'default' : 'outline'}
              onClick={() => setTab('gallery')}
            >
              Galeria
            </Button>
            <Button
              size="sm"
              variant={tab === 'trash' ? 'default' : 'outline'}
              onClick={() => setTab('trash')}
            >
              Lixeira{trash.length > 0 && ` (${trash.length})`}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tab === 'gallery' && (
          <>
            {canEdit && (
              <div className="mb-4">
                <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
                  {showForm ? 'Cancelar' : '+ Adicionar foto'}
                </Button>
                {showForm && (
                  <div className="mt-3">
                    <PhotoUploadForm
                      petId={petId}
                      shelterClubId={shelterClubId}
                      onSubmit={handleUpload}
                      onCancel={() => setShowForm(false)}
                      isSubmitting={createMutation.isPending}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1 mb-3">
              <Button
                size="sm" variant={categoryFilter === null ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(null)}
              >
                Todas
              </Button>
              {PHOTO_CATEGORIES.map((c) => (
                <Button
                  key={c} size="sm"
                  variant={categoryFilter === c ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter(c)}
                >
                  {PHOTO_CATEGORY_LABELS[c]}
                </Button>
              ))}
            </div>

            {loadingPhotos ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando fotos…</p>
            ) : photos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma foto {categoryFilter ? `(${PHOTO_CATEGORY_LABELS[categoryFilter]})` : 'ainda'}.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="rounded-md border border-border overflow-hidden">
                    <div className="aspect-square bg-zinc-100">
                      <img
                        src={p.thumb_url || p.url}
                        alt={p.caption || 'Foto'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <Badge variant="secondary" className="text-xs">
                        {PHOTO_CATEGORY_LABELS[p.category] || p.category}
                      </Badge>
                      {p.caption && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.caption}</p>
                      )}
                      {canEdit && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleDelete(p.id)}
                            className="text-xs h-7 px-2"
                          >
                            Lixeira
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'trash' && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Fotos deletadas. Após 30 dias são apagadas permanentemente.
            </p>
            {loadingTrash ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
            ) : trash.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Lixeira vazia.</p>
            ) : (
              <ol className="space-y-2">
                {trash.map((p) => {
                  const remaining = daysUntilPurge(p.deleted_at);
                  return (
                    <li key={p.id} className="rounded-md border border-border p-3 flex gap-3 items-center">
                      <div className="w-16 h-16 bg-zinc-100 rounded flex-shrink-0 overflow-hidden">
                        <img
                          src={p.thumb_url || p.url}
                          alt=""
                          className="w-full h-full object-cover opacity-60"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="text-xs">
                          {PHOTO_CATEGORY_LABELS[p.category] || p.category}
                        </Badge>
                        {p.caption && (
                          <p className="text-sm text-foreground mt-1 line-clamp-1">{p.caption}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Deletada: {p.deleted_at?.slice(0, 10)}
                          {remaining != null && ` • ${remaining} dia(s) para purge`}
                        </p>
                      </div>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => handleRestore(p.id)}>
                          Restaurar
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
