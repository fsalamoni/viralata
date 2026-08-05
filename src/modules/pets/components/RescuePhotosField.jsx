/**
 * @fileoverview RescuePhotosField — upload e gestão das fotos do resgate.
 *
 * - Upload de várias imagens, COMPRIMIDAS no cliente antes de subir.
 * - Cada foto tem visibilidade: "interno" (só equipe do abrigo, default) ou
 *   "público" (pode aparecer na página pública do pet). Editável por foto.
 * - Visualização em tamanho grande (lightbox) para a equipe.
 * - As fotos ficam no doc do pet (campo `rescue_photos`) e são persistidas
 *   pelo formulário que embute este campo.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md
 */
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Trash2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/core/lib/utils';
import { compressImageFile, uploadImage, deleteImage, formatBytes } from '@/core/services/storageService';

export default function RescuePhotosField({ value = [], onChange, uid, canManage = true }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const photos = Array.isArray(value) ? value : [];

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (!uid) { toast.error('Usuário não autenticado.'); return; }
    setUploading(true);
    try {
      const added = [];
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        const { file, width, height, size } = await compressImageFile(f);
        // eslint-disable-next-line no-await-in-loop
        const res = await uploadImage(file, { uid, folder: 'rescue-photos' });
        // Sem chaves `undefined` — Firestore as rejeita (mesmo aninhadas).
        const photo = {
          url: res.url,
          storage_path: res.path,
          visibility: 'internal',
          uploaded_by_uid: uid,
          uploaded_at: new Date().toISOString(),
        };
        if (width != null) photo.width = width;
        if (height != null) photo.height = height;
        const bytes = size ?? res.size;
        if (bytes != null) photo.size_bytes = bytes;
        added.push(photo);
      }
      onChange?.([...photos, ...added]);
      toast.success(`${added.length} foto(s) do resgate adicionada(s).`);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar as fotos.');
    } finally {
      setUploading(false);
    }
  }

  function toggleVisibility(idx) {
    onChange?.(photos.map((p, i) => (
      i === idx ? { ...p, visibility: p.visibility === 'public' ? 'internal' : 'public' } : p
    )));
  }

  function remove(idx) {
    const target = photos[idx];
    onChange?.(photos.filter((_, i) => i !== idx));
    if (target?.storage_path) deleteImage(target.storage_path);
  }

  const publicCount = photos.filter((p) => p.visibility === 'public').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {photos.length > 0
            ? `${photos.length} foto(s) · ${publicCount} pública(s), ${photos.length - publicCount} interna(s)`
            : 'Sem fotos do resgate ainda.'}
        </div>
        {canManage && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
            {uploading ? 'Enviando…' : 'Adicionar fotos'}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, idx) => (
            <div key={p.storage_path || p.url || idx} className="group relative overflow-hidden rounded-xl border border-border bg-muted">
              <button
                type="button"
                onClick={() => setLightbox(p)}
                className="block aspect-square w-full"
                title="Ver em tamanho grande"
              >
                <img src={p.thumb_url || p.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
              </button>
              {/* Etiqueta de visibilidade */}
              <span
                className={cn(
                  'pointer-events-none absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  p.visibility === 'public'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700/85 text-white',
                )}
              >
                {p.visibility === 'public' ? 'público' : 'interno'}
              </span>
              {canManage && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => toggleVisibility(idx)}
                    className="flex h-7 items-center gap-1 rounded-md bg-white/90 px-2 text-[10px] font-semibold text-foreground shadow-sm hover:bg-white"
                    title={p.visibility === 'public' ? 'Tornar interno' : 'Tornar público'}
                  >
                    {p.visibility === 'public' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {p.visibility === 'public' ? 'Interno' : 'Público'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-destructive shadow-sm hover:bg-white"
                    title="Remover foto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox — visualização em tamanho grande */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          {lightbox && (
            <div className="relative">
              <img src={lightbox.url} alt="" className="max-h-[80vh] w-full object-contain bg-black" />
              <div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
                <span>
                  {lightbox.visibility === 'public' ? 'Pública' : 'Interna'}
                  {lightbox.size_bytes ? ` · ${formatBytes(lightbox.size_bytes)}` : ''}
                  {lightbox.width && lightbox.height ? ` · ${lightbox.width}×${lightbox.height}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" /> Fechar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
