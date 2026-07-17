/**
 * @fileoverview Legislação & Posse Responsável — wrapper de LegalDocView.
 *
 * TASK-021: CMS de conteúdo institucional via Markdown.
 */
import React from 'react';
import LegalDocView from '@/components/legal/LegalDocView';
import { LEGAL_DOCS } from '@/core/services/legalDocsService';
import StaticLegislation from './Legislation.static';

export default function Legislation() {
  return <LegalDocView docKey={LEGAL_DOCS.LEGISLATION} fallback={<StaticLegislation />} />;
}
