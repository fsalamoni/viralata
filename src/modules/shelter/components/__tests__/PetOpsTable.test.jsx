/**
 * @fileoverview Testes de render de PetOpsTable (SHELTER_PET_OPS_TABLES_V1).
 * Verifica linhas por pet, badges de status (Realizada/Agendada/Atrasada)
 * e o banner de alertas de proximidade.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PetOpsTable } from '@/modules/shelter/components/PetOpsTable.jsx';

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const RECORDS = [
  { id: 'a', _petId: 'p1', _petName: 'Rex', visit_date: dayOffset(-30), reason: 'Rotina' },
  { id: 'b', _petId: 'p2', _petName: 'Mia', visit_date: dayOffset(-1), scheduled_for: dayOffset(2), reason: 'Retorno' },
  { id: 'c', _petId: 'p3', _petName: 'Bob', visit_date: dayOffset(-1), scheduled_for: dayOffset(-3), reason: 'Vacina' },
];

const COLUMNS = [{ key: 'reason', label: 'Motivo', render: (r) => r.reason || '—' }];

describe('PetOpsTable', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renderiza uma linha por pet com nome e status derivado', () => {
    act(() => {
      root.render(
        <PetOpsTable
          title="Consultas veterinárias"
          records={RECORDS}
          dateField="visit_date"
          dateLabel="Data"
          columns={COLUMNS}
          canManage={false}
        />,
      );
    });
    const txt = container.textContent;
    expect(txt).toContain('Rex');
    expect(txt).toContain('Mia');
    expect(txt).toContain('Bob');
    // Status derivados
    expect(txt).toContain('Realizada'); // Rex (visita passada, sem agendamento)
    expect(txt).toContain('Agendada');  // Mia (scheduled_for +2d)
    expect(txt).toContain('Atrasada');  // Bob (scheduled_for -3d)
  });

  it('mostra banner de alertas (próximas + atrasadas)', () => {
    act(() => {
      root.render(
        <PetOpsTable title="X" records={RECORDS} dateField="visit_date" columns={COLUMNS} />,
      );
    });
    const txt = container.textContent;
    expect(txt).toMatch(/1\s+próxima/);
    expect(txt).toMatch(/1\s+atrasada/);
  });

  it('estado vazio quando não há registros', () => {
    act(() => {
      root.render(
        <PetOpsTable title="X" records={[]} dateField="visit_date" columns={COLUMNS} emptyHint="Sem dados." />,
      );
    });
    expect(container.textContent).toContain('Nenhum registro');
  });
});
