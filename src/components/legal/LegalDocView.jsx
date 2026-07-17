/**
 * LegalDocView — renderiza documento legal (Firestore + fallback estático).
 *
 * TASK-021: CMS de conteúdo institucional via Markdown.
 *
 * Lógica de render:
 *  1. Hook useLegalDoc busca do Firestore.
 *  2. Se Firestore retorna doc ativo → renderiza Markdown via MarkdownContent.
 *  3. Se Firestore vazio/erro → renderiza `fallback` (JSX estático passado como prop).
 *  4. Loading state: Skeleton.
 *
 * Esse padrão permite:
 *  - Edição sem deploy: equipe jurídica atualiza o Firestore direto
 *  - Resiliência: outage do Firestore não derruba o app (fallback sempre disponível)
 *  - Versionamento: cada doc tem `version` + `effectiveAt` no frontmatter
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { LegalDocMeta, useLegalDoc } from '@/core/services/legalDocsService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function LegalDocView({ docKey, fallback }) {
  const { data, loading, error, refetch } = useLegalDoc(docKey);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (data && data.content && data.content.trim()) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{data.title}</h1>
          <LegalDocMeta
            version={data.version}
            author={data.author}
            effectiveAt={data.effectiveAt}
            source={data.source}
          />
        </div>
        {error && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Modo offline</AlertTitle>
            <AlertDescription>
              Exibindo conteúdo em cache local. Tentaremos sincronizar de novo automaticamente.
            </AlertDescription>
          </Alert>
        )}
        <MarkdownContent>{data.content}</MarkdownContent>
        <p className="pt-4 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={refetch}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Tentar sincronizar novamente
          </button>
        </p>
      </div>
    );
  }

  // Fallback estático (sempre disponível)
  if (fallback) {
    return (
      <div>
        {error && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Conteúdo em cache</AlertTitle>
            <AlertDescription>
              Não foi possível buscar a versão mais recente. Exibindo o texto em vigor.
            </AlertDescription>
          </Alert>
        )}
        {fallback}
      </div>
    );
  }

  return null;
}
