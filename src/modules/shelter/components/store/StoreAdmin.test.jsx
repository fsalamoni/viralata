import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockSettings = null;
let mockProducts = [];

vi.mock('@/modules/shelter/hooks/useShelterStore', () => ({
  useStoreSettings: () => ({ data: mockSettings, isLoading: false }),
  useStoreProducts: () => ({ data: mockProducts, isLoading: false }),
  useStoreOrders: () => ({ data: [], isLoading: false }),
  useStoreMutations: () => ({
    saveSettings: { mutateAsync: vi.fn(), isPending: false },
    createProduct: { mutateAsync: vi.fn(), isPending: false },
    updateProduct: { mutateAsync: vi.fn(), isPending: false },
    setProductStatus: { mutateAsync: vi.fn(), isPending: false },
    deleteProduct: { mutateAsync: vi.fn(), isPending: false },
    setOrderStatus: { mutateAsync: vi.fn(), isPending: false },
  }),
  useProductForEdit: () => ({ data: null }),
}));

import StoreAdmin from './StoreAdmin.jsx';

describe('StoreAdmin', () => {
  it('convida a ativar a loja quando desativada', () => {
    mockSettings = { enabled: false };
    mockProducts = [];
    render(<StoreAdmin clubId="c1" actor={{ uid: 'u1', name: 'Ana' }} />);
    expect(screen.getByText(/ainda não foi ativada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('mostra o painel com KPIs quando a loja está ativa', () => {
    mockSettings = { enabled: true, public_visible: true };
    mockProducts = [
      { id: 'p1', status: 'active', track_stock: true, stock_quantity: 3, price_cents: 2000, cost_cents: 1200 },
    ];
    render(<StoreAdmin clubId="c1" actor={{ uid: 'u1', name: 'Ana' }} />);
    expect(screen.getAllByText('Produtos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/marketplace da plataforma/i)).toBeInTheDocument();
  });
});
