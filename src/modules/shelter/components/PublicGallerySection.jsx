/**
 * @fileoverview PublicGallerySection — galeria pública do abrigo
 * (TASK-142 / Regra A §1.1). Renderizada na aba Geral do ClubDetail.
 *
 * Read-only para qualquer visitante: fotos não-deletadas das
 * categorias públicas (rescue, profile, adoption, exhibition —
 * health/foster ficam restritas ao time, sem clinical_notes aqui).
 * Upload continua exclusivo do painel do abrigo (PhotoGallery).
 * Some silenciosamente sem fotos ou em erro (bloco aditivo).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Images, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { listPublicShelterPhotos } from '@/modules/shelter/services/galleryService';

const CATEGORY_LABELS = {
  rescue: 'Resgate',
  profile: 'Perfil',
  adoption: 'Adoção',
  exhibition: 'Vitrine',
};

export function PublicGallerySection({ clubId }) {
  const [selected, setSelected] = useState(null);
  const { data: photos = [] } = useQuery({
    queryKey: ['shelter', 'public-gallery', clubId],
    queryFn: () => listPublicShelterPhotos(clubId),
    enabled: Boolean(clubId),
    staleTime: 5 * 60_000,
  });

  if (photos.length === 0) return null;

  return (
    <section className="arena-section-card rounded-[24px]">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
          <Images className="h-[19px] w-[19px] text-primary" /> Galeria
        </h3>
        <p className="arena-section-card-description">
          Momentos de resgates, adoções e eventos deste abrigo.
        </p>
      </div>
      <div className="arena-section-card-body">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                className="block w-full overflow-hidden rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setSelected(photo)}
                aria-label={`Ampliar foto${photo.caption ? `: ${photo.caption}` : ''}`}
              >
                <img
                  src={photo.thumb_url || photo.url}
                  alt={photo.caption || CATEGORY_LABELS[photo.category] || 'Foto do abrigo'}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">
            {selected?.caption || 'Foto ampliada'}
          </DialogTitle>
          {selected && (
            <figure>
              <img
                src={selected.url}
                alt={selected.caption || 'Foto do abrigo'}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
              <figcaption className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-muted-foreground">
                <span>{selected.caption || CATEGORY_LABELS[selected.category] || ''}</span>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  <X className="mr-1 h-3.5 w-3.5" /> Fechar
                </Button>
              </figcaption>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default PublicGallerySection;
