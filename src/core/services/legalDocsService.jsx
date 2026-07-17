/**
 * legalDocsService — CMS de documentos legais/institucionais.
 *
 * TASK-021: CMS de conteúdo institucional via Markdown.
 *
 * Antes: páginas como PrivacyPolicy, Terms, Legislation eram JSX estático
 * com texto hardcoded. Cada mudança de texto/legislação exigia deploy.
 *
 * Agora: documentos vivem no Firestore (collection `legal_docs`) como Markdown
 * com frontmatter (versão, autor, vigência). Hook useLegalDoc busca o doc
 * ativo mais recente; se Firestore falhar, fallback para o texto estático
 * (mantém o app funcional durante outage).
 *
 * Schema do Firestore:
 *   legal_docs/{docKey}
 *     docKey: 'privacy_policy_v2' | 'terms_v2' | 'legislation_v2'
 *     title: string
 *     version: string (ex: "2026-07-10")
 *     author: string
 *     effectiveAt: timestamp
 *     content: string (Markdown com GFM)
 *     publishedAt: timestamp
 *     active: boolean
 */
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export const LEGAL_DOCS = Object.freeze({
  PRIVACY_POLICY: 'privacy_policy_v2',
  TERMS: 'terms_v2',
  LEGISLATION: 'legislation_v2',
});

export const LEGAL_DOC_META = Object.freeze({
  [LEGAL_DOCS.PRIVACY_POLICY]: { title: 'Política de Privacidade', fallbackPath: 'privacy' },
  [LEGAL_DOCS.TERMS]: { title: 'Termos de Uso', fallbackPath: 'terms' },
  [LEGAL_DOCS.LEGISLATION]: { title: 'Legislação Aplicável', fallbackPath: 'legislation' },
});

/**
 * Busca um documento legal ativo do Firestore.
 * @param {string} docKey
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<{ title: string, version: string, content: string, effectiveAt: Date, source: 'firestore' } | null>}
 */
export async function fetchLegalDoc(docKey, { signal } = {}) {
  if (!Object.values(LEGAL_DOCS).includes(docKey)) {
    throw new Error(`docKey inválido: ${docKey}`);
  }
  const db = getFirestore();
  const ref = doc(db, 'legal_docs', docKey);
  const snap = await getDoc(ref);
  if (signal?.aborted) return null;
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.active === false) return null;
  return {
    title: data.title || LEGAL_DOC_META[docKey]?.title || docKey,
    version: data.version || '—',
    author: data.author || 'Viralata',
    content: data.content || '',
    effectiveAt: data.effectiveAt?.toDate?.() ?? null,
    publishedAt: data.publishedAt?.toDate?.() ?? null,
    source: 'firestore',
  };
}

/**
 * Hook React: busca documento legal e gerencia loading/error.
 *
 * @param {string} docKey
 * @returns {{
 *   data: { title: string, version: string, content: string, effectiveAt: Date, source: string } | null,
 *   loading: boolean,
 *   error: Error | null,
 *   refetch: () => void,
 * }}
 */
export function useLegalDoc(docKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!docKey || !Object.values(LEGAL_DOCS).includes(docKey)) {
      setLoading(false);
      setError(new Error(`docKey inválido: ${docKey}`));
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLegalDoc(docKey)
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        // Não é fatal — componente deve usar fallback estático.
        // eslint-disable-next-line no-console
        console.warn('[legalDocsService] fetch failed, using fallback:', err?.message);
        setError(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [docKey, tick]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}

/**
 * Renderiza o frontmatter de um doc legal.
 * Mostra versão, autor, vigência, fonte (firestore vs fallback).
 */
export function LegalDocMeta({ version, author, effectiveAt, source }) {
  if (!version) return null;
  const fmtDate = (d) => {
    if (!d) return null;
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
    } catch {
      return null;
    }
  };
  const vigency = fmtDate(effectiveAt);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>
        <strong>Versão</strong> {version}
      </span>
      {author && <span>· {author}</span>}
      {vigency && <span>· Vigência {vigency}</span>}
      {source && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">{source}</span>}
    </div>
  );
}
