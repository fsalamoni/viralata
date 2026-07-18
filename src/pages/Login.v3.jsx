/**
 * @fileoverview Login V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-LOGIN: implementação do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_LOGIN (default OFF, gated via React.lazy).
 *
 * @see docs/V3_LOGIN_QUESTIONS.md
 * @see docs/REGENCY_LOGIN_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React from 'react';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function LoginV3() {
  return (
    <div className="arena-page mx-auto max-w-7xl px-4 py-6" data-testid="login-v3-page">
      <Seo title="Login — Viralata" description="Acesse sua conta no Viralata." />
      <h1 className="text-2xl font-extrabold text-foreground">Login (V3 — em construção)</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Flag <code>V3_PAGE_LOGIN</code> OFF — V1 está ativo. O V3 será ativado quando implementado.
      </p>
      <EmptyState
        title="Implementação V3 em andamento"
        description="O agente vai preencher esta página na próxima iteração do loop V3."
      />
    </div>
  );
}
