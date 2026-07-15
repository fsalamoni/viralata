import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CrossRosterSection } from './CrossRosterSection';

const wrap = (ui) => <MemoryRouter>{ui}</MemoryRouter>;

describe('CrossRosterSection (TASK-247)', () => {
  it('não renderiza quando user não é voluntário nem LT', () => {
    const { container } = render(
      wrap(<CrossRosterSection volunteerData={null} fosterData={{ activeFosters: [] }} />)
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza com badge Voluntário quando tem shelterId', () => {
    const { container } = render(
      wrap(
        <CrossRosterSection
          volunteerData={{ shelterId: 'shelter-1' }}
          fosterData={{ activeFosters: [] }}
        />
      )
    );
    // Procura texto Voluntário dentro de span (badge)
    const html = container.innerHTML;
    expect(html).toContain('Voluntário');
    expect(html).toContain('1 abrigo');
  });

  it('renderiza com badge Lar Temporário quando tem fosters ativos', () => {
    const { container } = render(
      wrap(
        <CrossRosterSection
          volunteerData={null}
          fosterData={{ activeFosters: [{ id: 'f1', shelterId: 'shelter-1' }] }}
        />
      )
    );
    const html = container.innerHTML;
    expect(html).toContain('Lar Temporário');
    expect(html).toContain('1 animal');
  });

  it('mostra cross-sell quando é LT mas não voluntário', () => {
    const { container } = render(
      wrap(
        <CrossRosterSection
          volunteerData={null}
          fosterData={{ activeFosters: [{ id: 'f1' }] }}
          onJoinVolunteer={() => {}}
        />
      )
    );
    expect(container.innerHTML).toContain('Quer se voluntariar');
  });

  it('agrega contadores de abrigos distintos (voluntário + LT)', () => {
    const { container } = render(
      wrap(
        <CrossRosterSection
          volunteerData={{ shelterId: 'shelter-1' }}
          fosterData={{ activeFosters: [{ id: 'f1', shelterId: 'shelter-2' }] }}
        />
      )
    );
    expect(container.innerHTML).toContain('2 abrigos');
  });
});
