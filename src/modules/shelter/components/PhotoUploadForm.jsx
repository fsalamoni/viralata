/**
 * @fileoverview Componente: PhotoUploadForm (Fase 10).
 *
 * Formulário para upload de foto. Subcomponente do PhotoGallery.
 * Recebe URL + thumb_url (upload real depende do Storage helper que
 * virá em refactor futuro). Aqui o foco é o registro metadata.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
} from '@/modules/shelter/domain/operational/gallery';

export function PhotoUploadForm({
  petId, shelterClubId,
  onSubmit, onCancel, isSubmitting = false,
}) {
  const [category, setCategory] = useState('profile');
  const [url, setUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [caption, setCaption] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      pet_id: petId,
      shelter_club_id: shelterClubId,
      category,
      url,
      thumb_url: thumbUrl || undefined,
      storage_path: storagePath,
      caption: caption || undefined,
      original_metadata: {
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-4 bg-zinc-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c} value={c}>{PHOTO_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Storage path</label>
          <Input
            value={storagePath}
            onChange={(e) => setStoragePath(e.target.value)}
            placeholder="pets/p1/photos/ph-1/original.jpg"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">URL da foto</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://firebasestorage..."
            type="url"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">URL da miniatura (opcional)</label>
          <Input
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            placeholder="https://firebasestorage.../thumb.jpg"
            type="url"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Largura (px)</label>
          <Input
            type="number" min="1"
            value={width} onChange={(e) => setWidth(e.target.value)}
            placeholder="ex: 1200"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Altura (px)</label>
          <Input
            type="number" min="1"
            value={height} onChange={(e) => setHeight(e.target.value)}
            placeholder="ex: 800"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-foreground block mb-1">Legenda</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Descrição da foto (opcional)"
            maxLength={500}
            rows={2}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Adicionar foto'}
        </Button>
      </div>
    </form>
  );
}
