/**
 * @fileoverview Tests do PublicHealthRecord (TASK-136) — read-only LGPD.
 *
 * Cobre:
 *  - filterPublicFields (whitelist LGPD)
 *  - render de vaccines / dewormings / ectoparasites
 *  - NÃO render de clinical_notes / prescription / internal_flags / vet_private_notes
 *  - empty state quando sem registros
 *  - skeleton durante load
 *  - formatação de datas em pt-BR
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ _path: path.join('/') })),
  getDocs: vi.fn(),
  query: vi.fn((ref, ..._rest) => ref),
  orderBy: vi.fn((field, dir) => ({ _field: field, _dir: dir })),
  limit: vi.fn((n) => ({ _limit: n })),
}));

vi.mock('@/core/config/firebase', () => ({
  db: {},
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock UI primitives
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...rest }) => <div data-testid="card" {...rest}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <h2 data-testid="card-title">{children}</h2>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ icon: _Icon, title, description }) => (
    <div data-testid="empty-state">
      {title && <div data-testid="empty-title">{title}</div>}
      {description && <div data-testid="empty-description">{description}</div>}
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
}));

// Importa DEPOIS dos mocks
import { getDocs } from 'firebase/firestore';
import { PublicHealthRecord, filterPublicFields, PUBLIC_FIELDS, SENSITIVE_FIELDS } from './PublicHealthRecord';

let container;
let root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function mockHealthRecords(records) {
  getDocs.mockResolvedValueOnce({
    docs: records.map((r) => ({
      id: r.id,
      data: () => r,
    })),
  });
}

// ─── Tests: filterPublicFields (LGPD whitelist) ─────────────────────

describe('filterPublicFields — whitelist LGPD', () => {
  it('remove clinical_notes (campo sensível)', () => {
    const out = filterPublicFields({
      id: 'r1',
      name: 'V10',
      clinical_notes: 'NOTA INTERNA SIGILOSA',
    });
    expect(out).toBeDefined();
    expect(out.clinical_notes).toBeUndefined();
    expect(out.name).toBe('V10');
  });

  it('remove prescription (campo sensível)', () => {
    const out = filterPublicFields({
      id: 'r2',
      name: 'Tramadol',
      prescription: '50mg 12/12h por 7 dias',
    });
    expect(out.prescription).toBeUndefined();
  });

  it('remove internal_flags (campo sensível)', () => {
    const out = filterPublicFields({
      id: 'r3',
      name: 'V10',
      internal_flags: ['quarentena', 'alta-prioridade'],
    });
    expect(out.internal_flags).toBeUndefined();
  });

  it('remove vet_private_notes (campo sensível)', () => {
    const out = filterPublicFields({
      id: 'r4',
      vet_private_notes: 'comentário privado do vet',
    });
    expect(out.vet_private_notes).toBeUndefined();
  });

  it('mantém apenas campos da whitelist', () => {
    const out = filterPublicFields({
      id: 'r5',
      name: 'V10',
      type: 'vaccine',
      date: '2026-05-01',
      vet_name: 'Dr. João',
      vet_clinic: 'Clínica Central',
      clinical_notes: 'PI: NÃO VAZAR',
      prescription: 'NÃO VAZAR',
      internal_flags: ['x'],
      vet_private_notes: 'NÃO VAZAR',
      custom_private: 'xyz',
    });
    expect(Object.keys(out).sort()).toEqual(
      expect.arrayContaining(['id', 'name', 'type', 'date', 'vet_name', 'vet_clinic']),
    );
    expect(out.clinical_notes).toBeUndefined();
    expect(out.prescription).toBeUndefined();
    expect(out.internal_flags).toBeUndefined();
    expect(out.vet_private_notes).toBeUndefined();
    expect(out.custom_private).toBeUndefined();
  });

  it('normaliza category a partir de type quando ausente', () => {
    const out = filterPublicFields({ id: 'r6', type: 'vaccine', date: '2026-01-01' });
    expect(out.category).toBe('vaccine');
  });

  it('retorna null se record não é objeto', () => {
    expect(filterPublicFields(null)).toBeNull();
    expect(filterPublicFields(undefined)).toBeNull();
    expect(filterPublicFields('string')).toBeNull();
  });

  it('preserva id sempre', () => {
    const out = filterPublicFields({ id: 'keep-me', name: 'X' });
    expect(out.id).toBe('keep-me');
  });

  it('whitelist contém apenas campos seguros (não tem campos sensíveis)', () => {
    for (const sensitive of SENSITIVE_FIELDS) {
      expect(PUBLIC_FIELDS).not.toContain(sensitive);
    }
  });
});

// ─── Tests: render do componente ─────────────────────────────────────

describe('PublicHealthRecord — render', () => {
  it('mostra skeleton durante o load', async () => {
    getDocs.mockReturnValue(new Promise(() => {})); // nunca resolve
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('mostra empty state quando sem health records', async () => {
    mockHealthRecords([]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p-empty" />);
    });
    await act(async () => { await flush(); });
    const empty = container.querySelector('[data-testid="empty-state"]');
    expect(empty).toBeTruthy();
    expect(container.textContent).toContain('construção');
  });

  it('renderiza vaccine com name, date, vet_name, vet_clinic', async () => {
    mockHealthRecords([
      {
        id: 'v1',
        category: 'vaccine',
        name: 'V10',
        date: '2026-05-15T00:00:00.000Z',
        vet_name: 'Dra. Maria Silva',
        vet_clinic: 'Pet Care',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('V10');
    expect(container.textContent).toContain('Dra. Maria Silva');
    expect(container.textContent).toContain('Pet Care');
  });

  it('renderiza deworming com product e date', async () => {
    mockHealthRecords([
      {
        id: 'd1',
        category: 'deworming',
        product: 'Vermivet Plus',
        date: '2026-04-10T00:00:00.000Z',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('Vermivet Plus');
    expect(container.textContent).toContain('Vermifugação');
  });

  it('renderiza ectoparasite com product e date', async () => {
    mockHealthRecords([
      {
        id: 'e1',
        category: 'ectoparasite',
        product: 'Bravecto',
        date: '2026-03-20T00:00:00.000Z',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('Bravecto');
    expect(container.textContent).toContain('Antipulgas e carrapatos');
  });

  it('NÃO renderiza conteúdo de clinical_notes', async () => {
    mockHealthRecords([
      {
        id: 'v1',
        category: 'vaccine',
        name: 'V10',
        date: '2026-05-15T00:00:00.000Z',
        clinical_notes: 'CONFIDENCIAL-NUNCA-VAZAR',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).not.toContain('CONFIDENCIAL-NUNCA-VAZAR');
  });

  it('NÃO renderiza conteúdo de prescription', async () => {
    mockHealthRecords([
      {
        id: 'v1',
        category: 'vaccine',
        name: 'V10',
        date: '2026-05-15T00:00:00.000Z',
        prescription: 'FÓRMULA-SIGILOSA-XYZ',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).not.toContain('FÓRMULA-SIGILOSA-XYZ');
  });

  it('NÃO renderiza conteúdo de vet_private_notes', async () => {
    mockHealthRecords([
      {
        id: 'v1',
        category: 'vaccine',
        name: 'V10',
        date: '2026-05-15T00:00:00.000Z',
        vet_private_notes: 'PRIVADO-NAO-PUBLICO',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).not.toContain('PRIVADO-NAO-PUBLICO');
  });

  it('formata datas em PT-BR (15 de maio de 2026)', async () => {
    mockHealthRecords([
      {
        id: 'v1',
        category: 'vaccine',
        name: 'V10',
        date: '2026-05-15T00:00:00.000Z',
      },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    // toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    // → "15 de maio de 2026"
    expect(container.textContent).toContain('15 de maio de 2026');
  });

  it('mostra erro amigável se getDocs falhar', async () => {
    getDocs.mockRejectedValueOnce(new Error('permission-denied'));
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('Não foi possível carregar');
  });

  it('renderiza múltiplas categorias juntas', async () => {
    mockHealthRecords([
      { id: 'v1', category: 'vaccine', name: 'V10', date: '2026-05-15T00:00:00.000Z' },
      { id: 'd1', category: 'deworming', product: 'Vermivet', date: '2026-04-10T00:00:00.000Z' },
      { id: 'e1', category: 'ectoparasite', product: 'Bravecto', date: '2026-03-20T00:00:00.000Z' },
    ]);
    await act(async () => {
      root.render(<PublicHealthRecord petId="p1" />);
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('V10');
    expect(container.textContent).toContain('Vermivet');
    expect(container.textContent).toContain('Bravecto');
    expect(container.textContent).toContain('Vacinas');
    expect(container.textContent).toContain('Vermifugação');
    expect(container.textContent).toContain('Antipulgas e carrapatos');
  });
});
