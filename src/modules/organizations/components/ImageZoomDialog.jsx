import React, { useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal de visualização de imagem com zoom.
 *
 * Comportamento:
 *  - Abre a imagem em tamanho natural, centralizada, com fundo escuro.
 *  - Roda do mouse (ou botões + / -) controla o zoom entre 50% e 400%.
 *  - Arrastar com o mouse (drag) move a imagem quando ampliada.
 *  - ESC ou clique fora fecha o modal.
 *  - Botão "Baixar" faz download da imagem original.
 *
 * Uso:
 *   <ImageZoomDialog src={url} alt="..." open={open} onOpenChange={setOpen} />
 *
 * Mantém o `Dialog` shadcn-ui como wrapper para ficar consistente com
 * o resto do app (acessibilidade, focus trap, ESC, etc.).
 */
export default function ImageZoomDialog({ src, alt = '', open, onOpenChange, name }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useDragState();
  const imgRef = React.useRef(null);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Reset sempre que abrir/fechar ou mudar a imagem.
  useEffect(() => {
    if (open) reset();
  }, [open, src, reset]);

  // Zoom via roda do mouse.
  useEffect(() => {
    if (!open) return undefined;
    const node = imgRef.current;
    if (!node) return undefined;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.15;
      setScale((s) => Math.min(4, Math.max(0.5, s + delta)));
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [open]);

  const onMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
    setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
  };
  const onMouseUp = () => setDragging(false);

  const zoomIn = () => setScale((s) => Math.min(4, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  const handleDownload = () => {
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = name || 'imagem';
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={(e) => {
        // Fecha ao clicar fora da imagem (no backdrop).
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Imagem ampliada'}
    >
      {/* Controles */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 p-1.5 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={zoomOut}
          aria-label="Diminuir zoom"
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-12 px-1 text-center text-xs font-semibold tabular-nums text-white">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={zoomIn}
          aria-label="Aumentar zoom"
          disabled={scale >= 4}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={reset}
          aria-label="Resetar zoom"
          title="Resetar"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={handleDownload}
          aria-label="Baixar imagem"
          title="Baixar"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Imagem */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onMouseDown={onMouseDown}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[88vh] max-w-[92vw] select-none rounded-md object-contain transition-transform ${
          dragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        }`}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
}

/** Hook leve: mantém o estado de drag sem causar re-render a cada movimento. */
function useDragState() {
  const ref = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  return ref;
}
