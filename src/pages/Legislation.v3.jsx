/**
 * @fileoverview Legislation V3 — Legislação & Posse Responsável.
 *
 * V3 (TASK-V3-LEGAL-5): usa `LegalLayoutV3` + `useLegalDoc` (Firestore)
 * com fallback estático em `Legislation.static.jsx`.
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import React from 'react';
import { LegalLayoutV3 } from '@/components/legal/LegalLayoutV3';
import { useLegalDoc, LEGAL_DOCS } from '@/core/services/legalDocsService.jsx';
import StaticLegislation from './Legislation.static';

const RELATED = [
  { to: '/termos', label: 'Termos de Uso' },
  { to: '/politica-privacidade', label: 'Política de Privacidade' },
  { to: '/legal/codigo-de-conduta', label: 'Código de Conduta' },
];

export default function LegislationV3() {
  const { data, loading } = useLegalDoc(LEGAL_DOCS.LEGISLATION);
  const content = data?.content?.trim() ? data.content : null;
  const showFallback = !content && !loading;
  const description = 'Legislação animal brasileira e posse responsável — Lei 9.605/98, Lei 14.064/20, LGPD.';

  return (
    <LegalLayoutV3
      title="Legislação Animal & Posse Responsável"
      description={description}
      markdown={content}
      fallback={showFallback ? <StaticLegislation /> : null}
      version={data?.version || '2.0.0'}
      author={data?.author || 'Equipe jurídica Viralata'}
      effectiveAt={data?.effectiveAt || '2026-07-10'}
      source={data?.source}
      relatedLinks={RELATED}
      breadcrumbItems={[
        { label: 'Início', to: '/' },
        { label: 'Documentos legais', to: '/termos' },
        { label: 'Legislação Animal', current: true },
      ]}
    />
  );
}
