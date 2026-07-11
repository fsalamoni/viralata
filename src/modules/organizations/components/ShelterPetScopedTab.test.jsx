/**
 * @fileoverview Testes do ShelterPetScopedTab.
 *
 * NOTA: o projeto não tem @testing-library/react (apenas jsdom +
 * vitest). Validamos aqui a integração com `useMyPets` (mock) e
 * a renderização do empty state, sem inspeção detalhada de DOM.
 *
 * Validação visual do componente: feita manualmente em
 * `https://viralata.web.app/organizacoes/{id}/admin` com todas
 * as flags shelter ativas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ShelterPetScopedTab } from './ShelterPetScopedTab';

vi.mock('@/modules/pets/hooks/usePets', () => ({
  useMyPets: vi.fn(),
}));

vi.mock('@/modules/shelter/components/MedicalRecordsList', () => ({
  MedicalRecordsList: () => React.createElement('div', { 'data-testid': 'medical-records-mock' }, 'MedicalRecords'),
}));
vi.mock('@/modules/shelter/components/MedicationsList', () => ({
  MedicationsList: () => React.createElement('div', { 'data-testid': 'medications-mock' }, 'Medications'),
}));
vi.mock('@/modules/shelter/components/TimelineList', () => ({
  TimelineList: () => React.createElement('div', { 'data-testid': 'timeline-mock' }, 'Timeline'),
}));

import { useMyPets } from '@/modules/pets/hooks/usePets';

function renderToStringWithRouter(ui) {
  return renderToString(React.createElement(MemoryRouter, null, ui));
}

describe('ShelterPetScopedTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra empty state quando não há pets', () => {
    useMyPets.mockReturnValue({ data: [], isLoading: false });
    const html = renderToStringWithRouter(
      <ShelterPetScopedTab clubId="club1" kind="medical" />,
    );
    expect(html).toMatch(/Nenhum pet cadastrado/i);
  });

  it('mostra lista de pets quando há pets', () => {
    useMyPets.mockReturnValue({
      data: [
        { id: 'p1', name: 'Rex', species: 'Cachorro', breed: 'Vira-lata' },
        { id: 'p2', name: 'Mia', species: 'Gato', breed: 'Siamês' },
      ],
      isLoading: false,
    });
    const html = renderToStringWithRouter(
      <ShelterPetScopedTab clubId="club1" kind="medical" />,
    );
    expect(html).toContain('Rex');
    expect(html).toContain('Mia');
    expect(html).toContain('Prontuário');
  });

  it('mostra mensagem de abrigo não especificado se clubId vazio', () => {
    useMyPets.mockReturnValue({ data: [], isLoading: false });
    const html = renderToStringWithRouter(
      <ShelterPetScopedTab clubId={null} kind="medical" />,
    );
    expect(html).toMatch(/Abrigo não especificado/i);
  });

  it('aceita 3 kinds: medical, medications, timeline', () => {
    useMyPets.mockReturnValue({
      data: [{ id: 'p1', name: 'Rex', species: 'Cachorro' }],
      isLoading: false,
    });
    const titles = {
      medical: 'Prontuário',
      medications: 'Medicação',
      timeline: 'Linha do tempo',
    };
    for (const kind of ['medical', 'medications', 'timeline']) {
      const html = renderToStringWithRouter(
        <ShelterPetScopedTab clubId="club1" kind={kind} />,
      );
      expect(html).toContain(titles[kind]);
    }
  });
});
