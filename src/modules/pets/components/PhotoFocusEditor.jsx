/**
 * @fileoverview PhotoFocusEditor — ajuste do enquadramento das fotos do pet.
 *
 * Permite ao abrigo escolher QUAL parte de cada foto aparece no perfil
 * público (onde a imagem é exibida com `object-fit: cover`). O usuário
 * arrasta/clica no ponto mais importante da foto; esse ponto vira o
 * `object-position` e é salvo em `pet.photo_focus[url] = { x, y }`.
 *
 * Só o abrigo/responsável (canManage) abre este editor. A alteração é
 * registrada no log do pet (updatePet → appendPetLog).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crop, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/core/lib/utils';
import { useUpdatePet } from '../hooks/usePets';
import { logger } from '@/core/lib/logger';
import { DEFAULT_FOCUS, normalizeFocus, focusPosition } from '../domain/photoFocus';

/** Área interativa: clicar/arrastar define o ponto focal (x/y em %). */
function FocusPicker({ url, focus, onChange }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  const update = useCallback((clientX, clientY) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const x = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)));
    onChange({ x, y });
  }, [onChange]);

  return (
    <div
      ref={ref}
      className="relative w-full cursor-crosshair select-none overflow-hidden rounded-xl border border-border bg-muted"
      onPointerDown={(e) => {
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (dragging) update(e.clientX, e.clientY); }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      role="application"
      aria-label="Clique ou arraste para escolher a parte principal da foto"
    >
      <img src={url} alt="" draggable={false} className="block h-auto w-full" />
      {/* Marcador do ponto focal */}
      <div
        className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
        style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
      >
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>
    </div>
  );
}

/** Miniatura do resultado numa proporção-alvo (como aparece no público). */
function CropPreview({ url, focus, ratio, label }) {
  return (
    <div className="space-y-1">
      <div className={cn('w-full overflow-hidden rounded-lg border border-border bg-muted', ratio)}>
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: focusPosition(focus) }}
          draggable={false}
        />
      </div>
      <p className="text-center text-[10.5px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PhotoFocusEditor({ open, onOpenChange, pet }) {
  const { toast } = useToast();
  const updateMut = useUpdatePet();
  const loading = updateMut.isPending;

  const photos = Array.isArray(pet?.photos) ? pet.photos.filter(Boolean) : [];
  const [selected, setSelected] = useState(0);
  const [focusMap, setFocusMap] = useState({});

  useEffect(() => {
    if (open) {
      setSelected(0);
      setFocusMap({ ...(pet?.photo_focus || {}) });
    }
  }, [open, pet]);

  const url = photos[selected];
  const focus = normalizeFocus(url ? focusMap[url] : null);

  function setFocus(next) {
    if (!url) return;
    setFocusMap((m) => ({ ...m, [url]: normalizeFocus(next) }));
  }

  function resetFocus() {
    if (!url) return;
    setFocusMap((m) => ({ ...m, [url]: { ...DEFAULT_FOCUS } }));
  }

  async function handleSave() {
    // Mantém apenas os focos das fotos ainda existentes (limpa órfãos).
    const cleaned = {};
    photos.forEach((u) => { if (focusMap[u]) cleaned[u] = normalizeFocus(focusMap[u]); });
    try {
      await updateMut.mutateAsync({ petId: pet.id, updates: { photo_focus: cleaned } });
      toast.success('Enquadramento das fotos salvo');
      onOpenChange(false);
    } catch (err) {
      logger.error('[PhotoFocusEditor] save failed:', err);
      toast.error(err?.message || 'Erro ao salvar enquadramento');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" aria-hidden="true" />
            Ajustar enquadramento das fotos
          </DialogTitle>
          <DialogDescription>
            No perfil público a foto é cortada para preencher o espaço. Clique ou
            arraste sobre a parte mais importante da foto — ela ficará sempre
            visível. Veja a prévia de como aparece.
          </DialogDescription>
        </DialogHeader>

        {photos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Este pet ainda não tem fotos principais para ajustar.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Seletor de foto (quando há mais de uma) */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((u, i) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={cn(
                      'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                      i === selected ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                    aria-label={`Ajustar foto ${i + 1}`}
                    aria-pressed={i === selected}
                  >
                    <img
                      src={u}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: focusPosition(focusMap[u]) }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              {/* Editor */}
              <div className="space-y-2">
                <FocusPicker url={url} focus={focus} onChange={setFocus} />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Ponto focal: {focus.x}% / {focus.y}%
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={resetFocus} className="h-7">
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Centralizar
                  </Button>
                </div>
              </div>

              {/* Prévias em proporções usadas no app */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Como aparece
                </p>
                <CropPreview url={url} focus={focus} ratio="aspect-[4/5]" label="Perfil do pet" />
                <CropPreview url={url} focus={focus} ratio="aspect-[1.3]" label="Card / listagem" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || photos.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando…
              </>
            ) : (
              <>Salvar enquadramento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
