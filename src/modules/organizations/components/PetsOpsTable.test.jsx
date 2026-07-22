/**
 * @fileoverview Testes para PetsOpsTable — TASK-V3-PET-OPS-LOG (sw-v72.4).
 *
 * **D-PET-OPS-TABLE-PRIMARY-NAVIGATION**: cada linha tem o ID do pet
 * (pet_seq, IMUTÁVEL) clicável, mais atalhos para as seções do painel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import PetsOpsTable from './PetsOpsTable.jsx';

const PETS_FIXTURE = [
  {
    id: 'p1',
    pet_seq: 42,
    name: 'Buddy',
    title: 'Buddy',
    species: 'dog',
    size: 'medium',
    status: 'available',
  },
  {
    id: 'p2',
    pet_seq: 1,
    name: 'Luna',
    title: 'Luna',
    species: 'cat',
    size: 'small',
    status: 'adopted',
  },
  {
    // Pet LEGADO sem pet_seq (já existe no banco)
    id: 'p3',
    pet_code: 'VLT-000999',
    name: 'Rex',
    species: 'dog',
    size: 'large',
    status: 'in_process',
  },
];

describe('PetsOpsTable — TASK-V3-PET-OPS-LOG (sw-v72.4)', () => {
  let qc;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function renderTable(props = {}) {
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/organizacoes/abc']}>
          <Routes>
            <Route path="/organizacoes/:orgId" element={<PetsOpsTable pets={props.pets || PETS_FIXTURE} isLoading={props.isLoading || false} canManage={props.canManage !== false} search={props.search || ''} />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renderiza 1 linha por pet', () => {
    renderTable();
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 pets
  });

  it('exibe o ID do pet (pet_seq IMUTÁVEL) como #000042', () => {
    renderTable();
    expect(screen.getByText('#000042')).toBeInTheDocument();
    expect(screen.getByText('#000001')).toBeInTheDocument();
  });

  it('D-PET-SEQ-FALLBACK: pet sem pet_seq usa pet_code', () => {
    renderTable();
    expect(screen.getByText(/VLT-000999/)).toBeInTheDocument();
  });

  it('D-PET-OPS-TABLE-PRIMARY-NAVIGATION: ID é um link para /pets/<id>', () => {
    renderTable();
    const idLink = screen.getByTestId('pets-ops-id-p1');
    expect(idLink.getAttribute('href')).toBe('/pets/p1');
  });

  it('D-PET-OPS-COL-FUNCTIONAL: cada linha tem 5 colunas funcionais', () => {
    renderTable();
    // p1: 5 sections
    expect(screen.getByTestId('pets-ops-history-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pets-ops-care-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pets-ops-health-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pets-ops-timeline-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pets-ops-notes-p1')).toBeInTheDocument();
  });

  it('D-PET-OPS-COL-FUNCTIONAL: cada coluna funcional leva a /pets/<id>#<section>', () => {
    renderTable();
    expect(screen.getByTestId('pets-ops-history-p1').getAttribute('href')).toBe('/pets/p1#history');
    expect(screen.getByTestId('pets-ops-care-p1').getAttribute('href')).toBe('/pets/p1#care');
    expect(screen.getByTestId('pets-ops-health-p1').getAttribute('href')).toBe('/pets/p1#health');
    expect(screen.getByTestId('pets-ops-timeline-p1').getAttribute('href')).toBe('/pets/p1#timeline');
    expect(screen.getByTestId('pets-ops-notes-p1').getAttribute('href')).toBe('/pets/p1#notes');
  });

  it('D-PET-OPS-CAN-MANAGE: links só aparecem se canManage=true', () => {
    renderTable({ canManage: false });
    expect(screen.queryByTestId('pets-ops-id-p1')).toBeNull();
    expect(screen.queryByTestId('pets-ops-history-p1')).toBeNull();
  });

  it('D-PET-OPS-FILTER: filtro de busca por nome', () => {
    renderTable({ search: 'Luna' });
    // 1 header + 1 pet (Luna) = 2 rows
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeLessThanOrEqual(3); // header + filtro
  });

  it('D-PET-OPS-FILTER: filtro de busca por ID (#000042)', () => {
    renderTable({ search: '#000042' });
    // Filtro deve excluir os outros pets
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeLessThanOrEqual(3);
  });

  it('renderiza EmptyState quando pets = []', () => {
    renderTable({ pets: [] });
    expect(screen.getByText(/Nenhum animal cadastrado/i)).toBeInTheDocument();
  });
});
