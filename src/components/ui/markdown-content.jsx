import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/core/lib/utils';

/**
 * Renderizador seguro de Markdown (GitHub Flavored Markdown).
 *
 * Segurança: o react-markdown NÃO interpreta HTML embutido por padrão (não
 * usamos rehype-raw), portanto o conteúdo é imune a injeção de HTML/scripts.
 * Suporta títulos, listas, tabelas, citações, código, links e ênfase.
 *
 * Estilização manual via overrides de componentes (o projeto não usa o plugin
 * de typography do Tailwind).
 */

const COMPONENTS = {
  h1: ({ node, ...props }) => <h1 className="mt-4 mb-2 text-xl font-bold text-foreground first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mt-4 mb-2 text-lg font-bold text-foreground first:mt-0" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mt-3 mb-1.5 text-base font-semibold text-foreground first:mt-0" {...props} />,
  h4: ({ node, ...props }) => <h4 className="mt-3 mb-1.5 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  h5: ({ node, ...props }) => <h5 className="mt-2 mb-1 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  h6: ({ node, ...props }) => <h6 className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0" {...props} />,
  p: ({ node, ...props }) => <p className="my-2 leading-7 first:mt-0 last:mb-0" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer nofollow"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => <ul className="my-2 ml-5 list-disc space-y-1 marker:text-primary" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-2 ml-5 list-decimal space-y-1 marker:text-primary" {...props} />,
  li: ({ node, ...props }) => <li className="leading-7" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-3 border-l-4 border-primary/30 bg-primary/10 py-1 pl-4 pr-2 italic text-foreground" {...props} />
  ),
  hr: () => <hr className="my-4 border-primary/10" />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  // react-markdown v9 não fornece mais a prop `inline`; detectamos código de
  // bloco pela presença de quebra de linha no conteúdo.
  code: ({ node, className, children, ...props }) => {
    const text = String(children ?? '');
    const isBlock = text.includes('\n');
    if (isBlock) {
      return (
        <code className={cn('font-mono text-[0.85em]', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-primary" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ node, ...props }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-foreground p-3 text-muted-foreground" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-primary/10">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-secondary/50" {...props} />,
  th: ({ node, ...props }) => <th className="border border-primary/10 px-3 py-2 text-left font-semibold text-foreground" {...props} />,
  td: ({ node, ...props }) => <td className="border border-primary/10 px-3 py-2 align-top text-foreground" {...props} />,
  img: ({ node, ...props }) => <img className="my-2 max-h-80 rounded-lg border border-primary/10" loading="lazy" alt="" {...props} />,
};

export function MarkdownContent({ children, className }) {
  const content = String(children ?? '');
  if (!content.trim()) return null;
  return (
    <div className={cn('text-sm text-foreground break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownContent;
