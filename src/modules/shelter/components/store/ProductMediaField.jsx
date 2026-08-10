/**
 * @fileoverview ProductMediaField — upload e reordenação de mídias (fotos e
 * vídeos) de um produto. Usa `uploadMedia` (image/video, até 25 MB).
 */
import React, { useRef, useState } from 'react';
import { ImagePlus, Video, X, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';
import { uploadMedia } from '@/core/services/storageService';
import { MEDIA_TYPE } from '@/modules/shelter/domain/store/products';

/** Grade somente-leitura de mídias (galeria). */
export function ProductMediaGallery({ images = [], videos = [], className }) {
  const all = [
    ...images.map((m) => ({ ...m, type: MEDIA_TYPE.IMAGE })),
    ...videos.map((m) => ({ ...m, type: MEDIA_TYPE.VIDEO })),
  ];
  if (all.length === 0) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {all.map((m, i) => (
        m.type === MEDIA_TYPE.VIDEO ? (
          <video key={m.url || i} src={m.url} controls className="aspect-square w-full rounded-xl object-cover" />
        ) : (
          <img key={m.url || i} src={m.url} alt={m.name || `Foto ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
        )
      ))}
    </div>
  );
}

export default function ProductMediaField({ images = [], videos = [], onChange, uid }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (!uid) { toast.error('Faça login para enviar mídias.'); return; }
    setBusy(true);
    setProgress(0);
    const nextImages = [...images];
    const nextVideos = [...videos];
    try {
      for (const f of files) {
        const r = await uploadMedia(f, { uid, folder: 'store', onProgress: setProgress });
        const item = { url: r.url, path: r.path, name: r.name, type: r.type };
        if (r.type === MEDIA_TYPE.VIDEO) {
          if (nextVideos.length >= 4) { toast.error('Máximo de 4 vídeos por produto.'); continue; }
          nextVideos.push(item);
        } else {
          if (nextImages.length >= 12) { toast.error('Máximo de 12 fotos por produto.'); continue; }
          nextImages.push(item);
        }
      }
      onChange({ images: nextImages, videos: nextVideos });
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar a mídia.');
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  function removeImage(idx) { onChange({ images: images.filter((_, i) => i !== idx), videos }); }
  function removeVideo(idx) { onChange({ images, videos: videos.filter((_, i) => i !== idx) }); }
  function makeCover(idx) {
    if (idx === 0) return;
    const next = [...images];
    const [pick] = next.splice(idx, 1);
    next.unshift(pick);
    onChange({ images: next, videos });
  }

  return (
    <div className="space-y-2">
      {(images.length > 0 || videos.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((m, i) => (
            <div key={m.url || i} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={m.url} alt={m.name || `Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              {i === 0 && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  <Star className="h-2.5 w-2.5" /> Capa
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button type="button" onClick={() => makeCover(i)} className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-foreground" title="Definir como capa">Capa</button>
                )}
                <button type="button" onClick={() => removeImage(i)} className="ml-auto rounded bg-white/90 p-0.5 text-destructive" aria-label="Remover foto">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {videos.map((m, i) => (
            <div key={m.url || i} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-black">
              <video src={m.url} className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <Video className="h-2.5 w-2.5" /> Vídeo
              </span>
              <button type="button" onClick={() => removeVideo(i)} className="absolute bottom-1 right-1 rounded bg-white/90 p-0.5 text-destructive opacity-0 transition-opacity group-hover:opacity-100" aria-label="Remover vídeo">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
        {busy ? `Enviando… ${progress}%` : 'Adicionar fotos ou vídeos'}
      </Button>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      <p className="text-[10.5px] text-muted-foreground">Fotos (até 12) e vídeos (até 4), máx. 25 MB cada. A primeira foto é a capa.</p>
    </div>
  );
}
