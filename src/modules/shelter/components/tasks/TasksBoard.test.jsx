import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/modules/shelter/hooks/useShelterTasks', () => ({
  useShelterTasks: () => ({
    data: [
      { id: 't1', phase: 'pending', title: 'Comprar ração', created_by_name: 'Ana', created_at: new Date().toISOString(), activity: [] },
      { id: 't2', phase: 'awaiting_third_party', title: 'Laudo veterinário', created_by_name: 'João', created_at: new Date().toISOString(), activity: [], third_parties: [{ id: 'tp1', name: 'VetX', expected_return_at: '2020-01-01' }] },
    ],
    isLoading: false,
  }),
  useTaskMutations: () => ({
    createTask: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    moveTask: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    addThirdParty: { mutateAsync: vi.fn(), isPending: false },
    editTask: { mutateAsync: vi.fn(), isPending: false },
    deleteTask: { mutateAsync: vi.fn(), isPending: false },
  }),
  useTaskLogs: () => ({ data: [], isLoading: false }),
}));

import TasksBoard from './TasksBoard.jsx';

describe('TasksBoard', () => {
  it('renderiza as 5 fases fixas e as tarefas nas colunas certas', () => {
    render(<TasksBoard clubId="c1" actor={{ uid: 'u1', name: 'Ana' }} canManage />);
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Em desenvolvimento')).toBeInTheDocument();
    expect(screen.getByText('Aguardando Terceiros')).toBeInTheDocument();
    expect(screen.getByText('Concluídas')).toBeInTheDocument();
    expect(screen.getByText('Arquivadas')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-t1')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-t2')).toBeInTheDocument();
  });

  it('sinaliza prazo de terceiro vencido no card', () => {
    render(<TasksBoard clubId="c1" actor={{ uid: 'u1', name: 'Ana' }} canManage />);
    // t2 tem terceiro com expected_return_at no passado → badge "vencido"
    const card = screen.getByTestId('task-card-t2');
    expect(card.textContent).toMatch(/vencido/i);
  });

  it('oferece criar nova tarefa (toolbar + coluna Pendentes)', () => {
    render(<TasksBoard clubId="c1" actor={{ uid: 'u1', name: 'Ana' }} canManage />);
    expect(screen.getAllByRole('button', { name: /Nova tarefa/i }).length).toBeGreaterThanOrEqual(1);
  });
});
