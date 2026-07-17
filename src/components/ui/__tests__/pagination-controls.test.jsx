/**
 * @fileoverview Testes do PaginationControls (V3).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '@/components/ui/pagination-controls';

describe('PaginationControls', () => {
  it('não renderiza quando totalPages <= 1', () => {
    const { container } = render(
      <PaginationControls page={1} totalItems={5} perPage={12} onChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza "Página X de Y"', () => {
    render(<PaginationControls page={2} totalItems={50} perPage={12} onChange={() => {}} />);
    expect(screen.getByText(/Página/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('botão "Primeira" desabilitado na primeira página', () => {
    render(<PaginationControls page={1} totalItems={50} perPage={12} onChange={() => {}} />);
    expect(screen.getByLabelText('Primeira página')).toBeDisabled();
  });

  it('botão "Última" desabilitado na última página', () => {
    render(<PaginationControls page={5} totalItems={50} perPage={12} onChange={() => {}} />);
    expect(screen.getByLabelText('Última página')).toBeDisabled();
  });

  it('chama onPageChange ao clicar "Próxima"', () => {
    const handle = vi.fn();
    render(<PaginationControls page={2} totalItems={50} perPage={12} onPageChange={handle} />);
    fireEvent.click(screen.getByLabelText('Próxima página'));
    expect(handle).toHaveBeenCalledWith(3);
  });
});
