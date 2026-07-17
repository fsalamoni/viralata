/**
 * @fileoverview Termos de Uso — wrapper de LegalDocView.
 *
 * TASK-021: CMS de conteúdo institucional via Markdown.
 * Ver PrivacyPolicy.jsx para a estratégia completa.
 */
import React from 'react';
import LegalDocView from '@/components/legal/LegalDocView';
import { LEGAL_DOCS } from '@/core/services/legalDocsService';
import StaticTerms from './Terms.static';

export default function Terms() {
  return <LegalDocView docKey={LEGAL_DOCS.TERMS} fallback={<StaticTerms />} />;
}
