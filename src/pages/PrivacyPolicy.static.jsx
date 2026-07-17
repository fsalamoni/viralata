/**
 * @fileoverview Política de Privacidade — wrapper de LegalDocView.
 *
 * TASK-021: CMS de conteúdo institucional via Markdown.
 *
 * Estratégia: mantém o JSX estático como FALLBACK (resiliente se Firestore
 * falhar). Quando o doc ativo está no Firestore, o LegalDocView renderiza
 * o Markdown do banco no lugar do JSX. Equipe jurídica pode editar o doc
 * direto no Firestore sem precisar de deploy.
 *
 * Schema do doc (legal_docs/privacy_policy_v2):
 *   title, version (string), author, effectiveAt (timestamp),
 *   content (markdown GFM), active (bool), publishedAt (timestamp)
 */
import React from 'react';
import LegalDocView from '@/components/legal/LegalDocView';
import { LEGAL_DOCS } from '@/core/services/legalDocsService';
import StaticPrivacyPolicy from './PrivacyPolicy.static';

export default function PrivacyPolicy() {
  return <LegalDocView docKey={LEGAL_DOCS.PRIVACY_POLICY} fallback={<StaticPrivacyPolicy />} />;
}
