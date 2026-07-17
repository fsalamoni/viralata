/**
 * @fileoverview LegalPageViewer V3 — viewer unificado para /legal/:slug.
 *
 * V3 (TASK-V3-LEGAL-6): substitui o viewer V1.
 * Renderiza QUALQUER página legal (5 públicas: cookies, avisos-legais,
 * legislacao-animal, codigo-de-conduta, politica-de-privacidade)
 * a partir do slug, usando `LegalLayoutV3`.
 *
 * Texto é carregado lazy de `src/modules/shelter/domain/legal/texts/*`
 * e renderizado como Markdown (com h2/h3 e IDs para o TOC).
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Scale, ChevronRight } from 'lucide-react';
import { LegalLayoutV3 } from '@/components/legal/LegalLayoutV3';
import PageNotFound from '@/pages/PageNotFound';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getLegalPageBySlug } from '@/modules/shelter/domain/legal';

const PUBLIC_SLUGS = new Set([
  'cookies',
  'avisos-legais',
  'legislacao-animal',
  'codigo-de-conduta',
  'politica-de-privacidade',
  'termos-de-uso',
]);

const RELATED = {
  'cookies': [
    { to: '/termos', label: 'Termos de Uso' },
    { to: '/politica-privacidade', label: 'Política de Privacidade' },
  ],
  'politica-de-privacidade': [
    { to: '/termos', label: 'Termos de Uso' },
    { to: '/legal/cookies', label: 'Política de Cookies' },
  ],
  'termos-de-uso': [
    { to: '/politica-privacidade', label: 'Política de Privacidade' },
    { to: '/legislacao', label: 'Legislação Animal' },
  ],
  'codigo-de-conduta': [
    { to: '/termos', label: 'Termos de Uso' },
    { to: '/legislacao', label: 'Legislação Animal' },
  ],
  'legislacao-animal': [
    { to: '/termos', label: 'Termos de Uso' },
  ],
  'avisos-legais': [
    { to: '/termos', label: 'Termos de Uso' },
    { to: '/politica-privacidade', label: 'Política de Privacidade' },
  ],
};

const SLUG_LABELS = {
  'cookies': 'Política de Cookies',
  'avisos-legais': 'Avisos Legais',
  'legislacao-animal': 'Legislação Animal',
  'codigo-de-conduta': 'Código de Conduta',
  'politica-de-privacidade': 'Política de Privacidade',
  'termos-de-uso': 'Termos de Uso',
};

export default function LegalPageViewerV3() {
  const { slug } = useParams();
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setText(null);
    setPage(null);

    (async () => {
      try {
        const p = getLegalPageBySlug(slug);
        if (!p) {
          setError('not-found');
          setLoading(false);
          return;
        }
        if (!PUBLIC_SLUGS.has(slug)) {
          setError('not-public');
          setLoading(false);
          return;
        }
        setPage(p);
        // Tenta carregar texto markdown
        try {
          const mod = await import(`@/modules/shelter/domain/legal/texts/${slugToFile(slug)}`);
          const textKey = Object.keys(mod).find((k) => k.endsWith('_TEXT') || k.endsWith('Text'));
          if (textKey && mod[textKey]) {
            if (!cancelled) setText(mod[textKey]);
          }
        } catch {
          // Sem texto — sem problema, mostra "em construção"
        }
      } catch (e) {
        setError(e?.message || 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  if (error === 'not-found' || error === 'not-public') {
    return <PageNotFound />;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-4 h-32 w-full" />
        <Skeleton className="mt-2 h-32 w-full" />
      </div>
    );
  }

  const title = SLUG_LABELS[slug] || (page && page.title) || 'Documento legal';
  const description = page?.description || title;

  return (
    <LegalLayoutV3
      title={title}
      description={description}
      markdown={text}
      fallback={
        !text && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <Scale className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-bold text-foreground">
              Conteúdo em construção
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              O texto integral desta página está sendo preparado pela equipe jurídica.
              Enquanto isso, consulte os documentos relacionados.
            </p>
            {RELATED[slug]?.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {RELATED[slug].map((l) => (
                  <Button
                    key={l.to}
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link to={l.to}>
                      <Scale className="h-3.5 w-3.5" />
                      {l.label}
                      <ChevronRight className="ml-auto h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )
      }
      version="2.0.0"
      author="Equipe jurídica Viralata"
      effectiveAt={new Date('2026-07-10')}
      source="Viralata · Equipe jurídica"
      relatedLinks={RELATED[slug] || []}
      breadcrumbItems={[
        { label: 'Início', to: '/' },
        { label: 'Documentos legais', to: '/termos' },
        { label: title, current: true },
      ]}
    />
  );
}

// Mapeia slug para filename do dynamic import
function slugToFile(slug) {
  const map = {
    'cookies': 'cookies',
    'avisos-legais': 'avisosLegais',
    'legislacao-animal': 'legislacaoAnimal',
    'codigo-de-conduta': 'codigoDeConduta',
    'politica-de-privacidade': 'politicaDePrivacidade',
    'termos-de-uso': 'termosDeUso',
  };
  return map[slug] || slug;
}
