/**
 * @fileoverview Visualizador de páginas legais integrais
 * (Fase 19 / Bloco 3).
 *
 * Renderiza QUALQUER página legal (termos-de-uso, política-de-
 * privacidade, avisos-legais, codigo-de-conduta, cookies,
 * legislacao-animal) a partir do slug.
 *
 * O texto integral é carregado lazy a partir de
 * `src/modules/shelter/domain/legal/texts/*` e renderizado
 * num `<pre>` com `whitespace-pre-wrap` (preserva quebras de
 * linha sem precisar de parser markdown). Para textos
 * muito longos, oferece um botão "Copiar texto integral".
 *
 * Gated por feature flag `SHELTER_LEGAL_TERMS_V1` — quando
 * desligada, redireciona para `/legal/legado` (placeholder
 * mantido pelo comportamento histórico) ou renderiza
 * `PageNotFound` se o slug for desconhecido.
 *
 * IMPORTANTE: o `Route` em App.jsx aceita QUALQUER slug
 * `legal/:slug*` para que a UI seja extensível sem mexer em
 * rotas. Slugs válidos vêm de `LEGAL_PAGES` (constants no
 * módulo legal). Slugs inválidos caem no 404.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Seo from '@/components/Seo';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LegalPage, LegalSection } from '@/components/legal-page';
import PageNotFound from '@/pages/PageNotFound';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { getLegalPageBySlug, LEGAL_PAGES } from '@/modules/shelter/domain/legal';

// Slug → texto. Mantido aqui (em vez de constants do módulo
// legal) para fazer tree-shaking do bundle: cada página
// só puxa o texto que vai renderizar.
const TEXT_BY_SLUG = {
  'termos-de-uso': () => import('@/modules/shelter/domain/legal/texts/termosDeUso').then((m) => m.TERMS_OF_USE_TEXT),
  'politica-de-privacidade': () => import('@/modules/shelter/domain/legal/texts/politicaDePrivacidade').then((m) => m.PRIVACY_POLICY_TEXT),
  'avisos-legais': () => import('@/modules/shelter/domain/legal/texts/avisosLegais').then((m) => m.LEGAL_NOTICES_TEXT),
  'codigo-de-conduta': () => import('@/modules/shelter/domain/legal/texts/codigoDeConduta').then((m) => m.CODE_OF_CONDUCT_TEXT),
  'cookies': () => import('@/modules/shelter/domain/legal/texts/cookies').then((m) => m.COOKIE_POLICY_TEXT),
  'legislacao-animal': () => import('@/modules/shelter/domain/legal/texts/legislacaoAnimal').then((m) => m.ANIMAL_LEGISLATION_TEXT),
  // Pacote documental v2 (10/07/2026) — termos por papel
  'termo-de-adocao': () => import('@/modules/shelter/domain/legal/texts/adoptionTerms.v1').then((m) => m.ADOPTION_TERMS_TEXT_V1),
  'politica-de-doacoes': () => import('@/modules/shelter/domain/legal/donationTerms').then((m) => m.DONATION_TERMS_TEXT),
  'termo-voluntariado': () => import('@/modules/shelter/domain/legal/texts/volunteerTerms.v2').then((m) => m.VOLUNTEER_TERMS_TEXT_V2),
  'termo-lar-temporario': () => import('@/modules/shelter/domain/legal/fosterTerms').then((m) => m.FOSTER_TERMS_TEXT),
  'termo-adesao-abrigos': () => import('@/modules/shelter/domain/legal/texts/shelterOnboardingTerms.v1').then((m) => m.SHELTER_ONBOARDING_TERMS_TEXT_V1),
};

export default function LegalPageViewer() {
  const { '*': slugPath } = useParams();
  const slug = (slugPath || '').replace(/\/$/, '');
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1);

  // Valida o slug contra o catálogo conhecido
  const page = useMemo(() => getLegalPageBySlug(slug), [slug]);
  const textLoader = TEXT_BY_SLUG[slug];

  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const isMountedRef = useRef(true);
  const copyResetTimerRef = useRef(null);

  // Cleanup de timers no unmount (evita setState após unmount e leak)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    };
  }, []);

  // Lazy-load do texto integral
  useEffect(() => {
    if (!textLoader) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.resolve(textLoader())
      .then((t) => {
        if (cancelled || !isMountedRef.current) return;
        setText(t);
      })
      .catch((err) => {
        if (cancelled || !isMountedRef.current) return;
        // eslint-disable-next-line no-console
        console.error('LegalPageViewer: failed to load text', err);
        setText(null);
      })
      .finally(() => {
        if (cancelled || !isMountedRef.current) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [textLoader]);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        if (!isMountedRef.current) return;
        setCopied(true);
        if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = setTimeout(() => {
          copyResetTimerRef.current = null;
          if (isMountedRef.current) setCopied(false);
        }, 2000);
      }
    } catch {
      // ignore — clipboard unavailable
    }
  }, [text]);

  // Flag desligada: redireciona para a rota legada correspondente
  // (ou 404 se não houver equivalente). Mantém URL semanticamente
  // equivalente.
  if (!enabled) {
    const legacy = LEGACY_SLUG_MAP[slug];
    if (legacy) return <Navigate to={legacy} replace />;
    return <PageNotFound />;
  }

  if (!page || !textLoader) {
    return <PageNotFound />;
  }

  return (
    <LegalPage
      eyebrow="Documento legal"
      title={page.title}
      description={page.description}
      meta={`Versão ${page.version} · Texto integral`}
    >
      <Seo title={page.title} description={page.description} />
      <LegalSection
        title="Texto integral"
        description="Documento legal completo, na versão vigente. Você pode copiar e arquivar para consulta."
      >
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!text || loading}
            aria-label="Copiar texto integral"
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? 'Copiado!' : 'Copiar texto'}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando texto integral…</p>
        ) : text ? (
          <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-primary/10 bg-white/65 p-4 font-mono text-xs leading-6 text-foreground/85 sm:text-sm">
{text}
          </pre>
        ) : (
          <p className="text-sm text-red-600">Não foi possível carregar o texto. Tente novamente.</p>
        )}
      </LegalSection>

      <LegalSection
        title="Outros documentos legais"
        description="Veja também os demais textos da plataforma."
      >
        <ul className="space-y-1.5 text-sm">
          {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
            <li key={p.slug}>
              <Link
                to={`/legal/${p.slug}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {p.title}
              </Link>
              <span className="text-muted-foreground"> — {p.description}</span>
            </li>
          ))}
        </ul>
      </LegalSection>

      <Card className="overflow-hidden border-primary/20 bg-white/65">
        <CardHeader className="border-b border-primary/10 bg-white/45 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <CardTitle className="text-base text-foreground">Voltar</CardTitle>
              <CardDescription>
                Se você chegou aqui por um link em um e-mail ou notificação, retorne ao local
                de origem para concluir a ação desejada.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-sm text-muted-foreground sm:p-5">
          <p>
            Para dúvidas sobre este documento, escreva para <a className="text-primary underline" href="mailto:legal@viralata.org">legal@viralata.org</a>.
          </p>
        </CardContent>
      </Card>
    </LegalPage>
  );
}

// Mapeamento de slugs novos → rotas legadas. Usado quando a flag
// `SHELTER_LEGAL_TERMS_V1` está desligada, para que URLs compartilhadas
// antes do PR continuem funcionando.
const LEGACY_SLUG_MAP = Object.freeze({
  'termos-de-uso': '/termos',
  'politica-de-privacidade': '/politica-privacidade',
  'legislacao-animal': '/legislacao',
});
