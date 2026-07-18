/**
 * @fileoverview Terms V3 — Termos de Uso do Viralata.
 *
 * V3 (TASK-V3-LEGAL-5): usa `LegalLayoutV3` + `useLegalDoc` (Firestore)
 * com fallback estático em `Terms.static.jsx`.
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import React from 'react';
import { LegalLayoutV3 } from '@/components/legal/LegalLayoutV3';
import { useLegalDoc, LEGAL_DOCS } from '@/core/services/legalDocsService.jsx';
import StaticTerms from './Terms.static';

const RELATED = [
  { to: '/politica-privacidade', label: 'Política de Privacidade' },
  { to: '/legislacao', label: 'Legislação Animal' },
  { to: '/legal/cookies', label: 'Política de Cookies' },
];

export default function TermsV3() {
  const { data, loading } = useLegalDoc(LEGAL_DOCS.TERMS);
  const content = data?.content?.trim() ? data.content : null;
  // Se Firestore retornar vazio (offline) e não está mais carregando, usa fallback estático
  const showFallback = !content && !loading;
  const description = 'Termos de uso da plataforma Viralata — adoção responsável de pets.';

  return (
    <LegalLayoutV3
      title="Termos de Uso"
      description={description}
      markdown={content}
      fallback={showFallback ? <StaticTerms /> : null}
      version={data?.version || '2.0.0'}
      author={data?.author || 'Equipe jurídica Viralata'}
      effectiveAt={data?.effectiveAt || '2026-07-10'}
      source={data?.source}
      relatedLinks={RELATED}
      breadcrumbItems={[
        { label: 'Início', to: '/' },
        { label: 'Documentos legais', to: '/termos' },
        { label: 'Termos de Uso', current: true },
      ]}
    />
  );
}
