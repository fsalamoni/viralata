import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

let flagOn = true;
let mockData = { products: [], shelters: {} };

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => flagOn,
}));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1', displayName: 'Ana' } }),
}));
vi.mock('@/modules/shelter/hooks/useShelterStore', () => ({
  useMarketplaceEnriched: () => ({ data: mockData, isLoading: false }),
  useProductReviews: () => ({ data: [] }),
  useProductQuestions: () => ({ data: [] }),
  useProductInteractions: () => ({ addReview: {}, askQuestion: {} }),
}));

import MarketplacePage from './MarketplacePage.jsx';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MarketplacePage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MarketplacePage', () => {
  it('não renderiza nada com a flag desligada', () => {
    flagOn = false;
    const { container } = renderPage();
    expect(container.firstChild).toBeNull();
    flagOn = true;
  });

  it('mostra o título e o estado vazio quando não há produtos', () => {
    mockData = { products: [], shelters: {} };
    renderPage();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText(/ainda não há produtos/i)).toBeInTheDocument();
  });

  it('lista produtos agregados de abrigos', () => {
    mockData = {
      products: [
        { id: 'p1', club_id: 'c1', name: 'Coleira', price_cents: 2500, status: 'active', track_stock: false, images: [], shelter_name: 'Abrigo A', shelter_city: 'São Paulo', shelter_state: 'SP', category: 'accessories', tags: [] },
      ],
      shelters: { c1: { id: 'c1', name: 'Abrigo A', city: 'São Paulo', state: 'SP', settings: {} } },
    };
    renderPage();
    expect(screen.getByText('Coleira')).toBeInTheDocument();
    expect(screen.getByText(/Abrigo A/)).toBeInTheDocument();
  });
});
