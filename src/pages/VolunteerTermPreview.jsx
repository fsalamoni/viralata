/**
 * @fileoverview VolunteerTermPreview — página pública /voluntarios/termo
 * (TASK-235 / Regra A §A.3).
 *
 * Renderiza o TEXTO INTEGRAL do termo de voluntariado v2
 * (`volunteerTerms.v2.js`) com índice (jump links) e botão "Voltar".
 *
 * Diferente de `pages/VolunteerTerms.jsx` (que é a versão resumida
 * em seções com ícones), esta página é o documento integral exigido
 * pela Lei 14.063/2020 art. 4º §1º e pela LGPD art. 9º.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Copy, Check, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHero from '@/components/PageHero';
import { VOLUNTEER_TERMS_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/volunteerTerms.v2';
import { VOLUNTEER_TERMS_VERSION } from '@/modules/shelter/domain/legal/volunteerTerms';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

const SECTION_HEADING_RE = /^(\d{1,2})\.\s+([A-ZÇÃÕÉÊÍÚÀ ]+)$/;

function buildSections(text) {
  const lines = text.split('\n');
  const sections = [];
  lines.forEach((line) => {
    const m = line.match(SECTION_HEADING_RE);
    if (m) {
      sections.push({ number: m[1], title: m[2].trim(), anchor: `sec-${m[1]}` });
    }
  });
  return sections;
}

function renderWithAnchors(text) {
  // Adiciona um id a cada cabeçalho numerado para os jump links
  // funcionarem via âncora de URL.
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const m = line.match(SECTION_HEADING_RE);
    if (m) {
      return { id: `sec-${m[1]}`, text: line, idx: i };
    }
    return { id: null, text: line, idx: i };
  });
}

export default function VolunteerTermPreview() {
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-5xl px-5 py-6 pb-12 space-y-6');
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef(null);

  const sections = useMemo(() => buildSections(VOLUNTEER_TERMS_TEXT_V2), []);
  const lines = useMemo(() => renderWithAnchors(VOLUNTEER_TERMS_TEXT_V2), []);

  useEffect(() => () => {
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(VOLUNTEER_TERMS_TEXT_V2);
        setCopied(true);
        if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Documento legal · texto integral"
        title="Termo de Voluntariado"
        description="Texto completo do termo de adesão para voluntários da plataforma Viralata. A leitura integral é obrigatória antes do aceite eletrônico (Lei 14.063/2020 art. 4º §1º)."
      >
        <p className="text-xs text-muted-foreground">
          Versão {VOLUNTEER_TERMS_VERSION} · Plataforma Viralata
        </p>
      </PageHero>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/voluntarios">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Voltar para o programa
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label="Copiar texto integral"
        >
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied ? 'Copiado!' : 'Copiar texto'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Sumário (TOC) */}
        <aside aria-label="Sumário do termo" className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <List className="h-4 w-4 text-primary" aria-hidden="true" />
                Sumário
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav>
                <ol className="divide-y divide-border/60">
                  {sections.map((s) => (
                    <li key={s.anchor}>
                      <a
                        href={`#${s.anchor}`}
                        className="flex items-baseline gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted/40 hover:text-primary"
                      >
                        <span className="w-6 shrink-0 text-right text-xs font-mono text-muted-foreground">
                          {s.number}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Texto integral */}
        <article
          aria-label="Texto integral do termo de voluntariado"
          className="min-w-0 rounded-md border border-primary/10 bg-white/65 p-4 sm:p-6"
        >
          <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-6 text-foreground/85 sm:text-sm">
            {lines.map((line) => {
              if (line.id) {
                return (
                  <span key={line.idx} id={line.id} className="block font-bold text-foreground">
                    {line.text}
                  </span>
                );
              }
              return <span key={line.idx}>{`${line.text}\n`}</span>;
            })}
          </pre>
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/voluntarios">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Voltar
          </Link>
        </Button>
        <Button asChild>
          <Link to="/voluntarios/seja">Quero ser voluntário</Link>
        </Button>
      </div>
    </div>
  );
}
