/**
 * @fileoverview Testes do LegalLayoutV3 + LegalMeta + LegalToc.
 *
 * V3 (TASK-V3-LEGAL-8).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

vi.mock('@/core/hooks/useUiPreferences', () => ({
  useUiPreferences: () => [{ compactMode: false, reduceMotion: false }, () => {}],
}));
vi.mock('@/core/hooks/useReducedMotionSafe', () => ({
  useReducedMotionSafe: () => false,
}));

import { LegalLayoutV3 } from '@/components/legal/LegalLayoutV3';
import { LegalMeta, readingTime } from '@/components/legal/LegalMeta';
import { LegalToc, extractHeadings, slugifyHeading } from '@/components/legal/LegalToc';

function renderLegalLayout(props) {
  return render(
    <MemoryRouter>
      <LegalLayoutV3 title="Doc teste" description="Descrição" {...props} />
    </MemoryRouter>,
  );
}

describe('LegalLayoutV3', () => {
  it('renderiza título no h1', () => {
    renderLegalLayout({ markdown: '## Seção 1\n\nConteúdo.' });
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Doc teste');
  });

  it('renderiza conteúdo markdown dentro do article', () => {
    renderLegalLayout({ markdown: '## Seção 1\n\nTexto da seção.' });
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('renderiza fallback quando markdown vazio', () => {
    renderLegalLayout({
      markdown: '',
      fallback: <div data-testid="fallback">FALLBACK</div>,
    });
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renderiza JSON-LD no <script>', () => {
    const { container } = renderLegalLayout({ markdown: '## Seção\n\nTexto.' });
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBeGreaterThan(0);
    const hasWebPage = Array.from(scripts).some((s) => s.textContent.includes('"@type":"WebPage"'));
    expect(hasWebPage).toBe(true);
  });

  it('renderiza cross-links quando relatedLinks não-vazio', () => {
    renderLegalLayout({
      markdown: '## A\n\nx',
      relatedLinks: [{ to: '/foo', label: 'Foo' }],
    });
    expect(screen.getByText('Foo')).toBeInTheDocument();
  });

  it('omite cross-links quando relatedLinks vazio', () => {
    renderLegalLayout({ markdown: '## A\n\nx', relatedLinks: [] });
    expect(screen.queryByText('Documentos relacionados')).not.toBeInTheDocument();
  });
});

describe('LegalMeta', () => {
  it('renderiza versão + autor + data efetiva', () => {
    render(<LegalMeta version="2.1.0" author="DPO" effectiveAt="2026-07-10" />);
    expect(screen.getByText('v2.1.0')).toBeInTheDocument();
    expect(screen.getByText('DPO')).toBeInTheDocument();
  });

  it('formata data efetiva em pt-BR', () => {
    render(<LegalMeta version="1.0" effectiveAt="2026-07-10" />);
    expect(screen.getByText(/julho de 2026/i)).toBeInTheDocument();
  });

  it('mostra "—" para data inválida', () => {
    render(<LegalMeta version="1.0" effectiveAt="invalid" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('readingTime', () => {
  it('retorna 1 para texto vazio', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime(null)).toBe(1);
  });

  it('calcula para 200 palavras = 1 min', () => {
    const text = 'palavra '.repeat(200);
    expect(readingTime(text)).toBe(1);
  });

  it('calcula para 400 palavras = 2 min', () => {
    const text = 'palavra '.repeat(400);
    expect(readingTime(text)).toBe(2);
  });
});

describe('LegalToc', () => {
  const headings = [
    { level: 2, title: 'Seção 1', id: 'secao-1' },
    { level: 2, title: 'Seção 2', id: 'secao-2' },
    { level: 3, title: 'Subseção 2.1', id: 'subsecao-21' },
  ];

  it('renderiza mobile TOC colapsável', () => {
    const { container } = render(<LegalToc headings={headings} />);
    expect(container.querySelector('details')).toBeInTheDocument();
  });

  it('renderiza links para cada heading', () => {
    render(<LegalToc headings={headings} />);
    // Mobile + desktop, então 2 de cada
    expect(screen.getAllByText('Seção 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Subseção 2.1').length).toBeGreaterThan(0);
  });

  it('retorna null quando headings vazio', () => {
    const { container } = render(<LegalToc headings={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('extractHeadings', () => {
  it('extrai h2 e h3 do markdown', () => {
    const md = '# Título\n\n## Seção A\n\ntexto\n\n### Subseção A.1\n\nmais texto\n\n## Seção B\n\nfinal';
    const result = extractHeadings(md);
    expect(result).toEqual([
      { level: 2, title: 'Seção A', id: 'secao-a' },
      { level: 3, title: 'Subseção A.1', id: 'subsecao-a1' },
      { level: 2, title: 'Seção B', id: 'secao-b' },
    ]);
  });

  it('retorna [] para markdown vazio', () => {
    expect(extractHeadings('')).toEqual([]);
    expect(extractHeadings(null)).toEqual([]);
  });

  it('ignora h4/h5/h6', () => {
    const md = '## A\n\n#### H4\n\n##### H5';
    const result = extractHeadings(md);
    expect(result).toHaveLength(1);
  });
});

describe('slugifyHeading', () => {
  it('remove acentos', () => {
    expect(slugifyHeading('Posse Responsável')).toBe('posse-responsavel');
  });

  it('lowercase + espaços viram hífens', () => {
    expect(slugifyHeading('Quem Somos')).toBe('quem-somos');
  });

  it('remove caracteres especiais', () => {
    expect(slugifyHeading('Capítulo 1: Introdução!')).toBe('capitulo-1-introducao');
  });
});
