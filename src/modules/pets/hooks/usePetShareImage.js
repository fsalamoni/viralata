import { useState } from 'react';
import { toBlob } from 'html-to-image';
import { toast } from 'sonner';

/**
 * Gera a imagem de compartilhamento (PetShareCard) a partir de um nó DOM
 * oculto e compartilha via Web Share API (quando suportado) ou baixa o PNG.
 */
export function usePetShareImage() {
  const [generating, setGenerating] = useState(false);

  async function shareFromNode(node, { fileName = 'pet-viralata.png', title, text } = {}) {
    if (!node) return;
    setGenerating(true);
    try {
      const blob = await toBlob(node, { pixelRatio: 1 });
      if (!blob) throw new Error('Falha ao gerar imagem.');
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Imagem baixada! Compartilhe nas suas redes.');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Não foi possível gerar a imagem de compartilhamento.');
    } finally {
      setGenerating(false);
    }
  }

  return { shareFromNode, generating };
}
