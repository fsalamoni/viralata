/**
 * @fileoverview PrivacyPolicy V3 — Política de Privacidade do Viralata.
 *
 * V3 (TASK-V3-LEGAL-5): usa `LegalLayoutV3` + `useLegalDoc` (Firestore)
 * com fallback estático em `PrivacyPolicy.static.jsx`.
 *
 * CORREÇÃO V3: o `PrivacyPolicy.static.jsx` antigo era um wrapper recursivo
 * (importava o próprio arquivo). Agora ele tem o CONTEÚDO estático
 * (gerado a partir do que estava em V1 Terms.static.jsx).
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import React from 'react';
import { LegalLayoutV3 } from '@/components/legal/LegalLayoutV3';
import { useLegalDoc, LEGAL_DOCS } from '@/core/services/legalDocsService.jsx';
import StaticPrivacyPolicy from './PrivacyPolicy.static';

const RELATED = [
  { to: '/termos', label: 'Termos de Uso' },
  { to: '/legislacao', label: 'Legislação Animal' },
  { to: '/legal/cookies', label: 'Política de Cookies' },
];

export default function PrivacyPolicyV3() {
  const { data, loading } = useLegalDoc(LEGAL_DOCS.PRIVACY_POLICY);
  const content = data?.content?.trim() ? data.content : null;
  const showFallback = !content && !loading;
  const description = 'Política de Privacidade do Viralata — LGPD Art. 50.';

  return (
    <LegalLayoutV3
      title="Política de Privacidade"
      description={description}
      markdown={content}
      fallback={showFallback ? <StaticPrivacyPolicy /> : null}
      version={data?.version || '2.0.0'}
      author={data?.author || 'Equipe jurídica Viralata'}
      effectiveAt={data?.effectiveAt || '2026-07-10'}
      source={data?.source}
      relatedLinks={RELATED}
      breadcrumbItems={[
        { label: 'Início', to: '/' },
        { label: 'Documentos legais', to: '/termos' },
        { label: 'Política de Privacidade', current: true },
      ]}
    />
  );
}
