/**
 * @fileoverview LegalFloatingActions — botões flutuantes para documentos legais.
 *
 * V3 (TASK-V3-LEGAL-3):
 *  - Voltar ao topo (aparece quando scrollY > 400px)
 *  - Imprimir
 *  - Copiar link da página
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, Printer, Link2, Check } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';

export function LegalFloatingActions({ title }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: prompt
      window.prompt('Copie o link:', window.location.href);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-20 flex flex-col gap-2 print:hidden"
      role="toolbar"
      aria-label="Ações do documento"
      data-testid="legal-floating-actions"
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={handleCopy}
        className={cn(
          'h-10 w-10 rounded-full shadow-md transition-colors',
          copied && 'border-success bg-success/20 text-success',
        )}
        aria-label={copied ? 'Link copiado!' : 'Copiar link da página'}
        title={copied ? 'Copiado!' : 'Copiar link'}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={handlePrint}
        className="h-10 w-10 rounded-full shadow-md"
        aria-label="Imprimir"
        title="Imprimir"
      >
        <Printer className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleScrollTop}
        className="h-10 w-10 rounded-full shadow-md"
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
