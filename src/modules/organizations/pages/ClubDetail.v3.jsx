/**
 * @fileoverview CLUB_DETAIL V3 — redesign completo no padrão DS-V2.
 *
 * V3 (TASK-V3-CLUB_DETAIL): implementação do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_CLUB_DETAIL (default OFF, gated via React.lazy).
 *
 * @see docs/V3_CLUB_DETAIL_QUESTIONS.md
 * @see docs/REGENCY_CLUB_DETAIL_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React from 'react';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';

export default function ClubDetailV3() {
  // TODO: implementar V3 do zero (NÃO aproveitar V1)
  // Estrutura base — preencher com:
  // - banner/hero
  // - conteúdo principal (cards/listas)
  // - estados (loading/empty/error)
  // - actions (CTAs)
  // - SEO + a11y

  return (
    <div className="arena-page mx-auto max-w-7xl px-4 py-6" data-testid="club_detail-page">
      <Seo title="CLUB_DETAIL — Viralata" description="V3 redesign de CLUB_DETAIL no padrão DS-V2." />
      <h1 className="text-2xl font-extrabold text-foreground">CLUB_DETAIL (V3 — em construção)</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Esta página está sendo refeita do zero no padrão V3.
        Flag <code>V3_PAGE_CLUB_DETAIL</code> deve estar ON para visualizar.
      </p>
      <EmptyState
        title="Implementação V3 em andamento"
        description="O agente vai preencher esta página na próxima iteração do step-2 (análise + implementação feature por feature)."
      />
    </div>
  );
}
