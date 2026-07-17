/**
 * @fileoverview Testes do FilterChipsRow (V3).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterChipsRow } from '@/components/ui/filter-chips-row';

describe('FilterChipsRow', () => {
  const options = [
    { value: 'all', label: 'Todos' },
    { value: 'dog', label: 'Cães' },
    { value: 'cat', label: 'Gatos' },
  ];

  it('renderiza todas as opções', () => {
    render(<FilterChipsRow field="species" value="all" onChange={() => {}} options={options} />);
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Cães')).toBeInTheDocument();
    expect(screen.getByText('Gatos')).toBeInTheDocument();
  });

  it('marca o chip ativo via aria-pressed', () => {
    render(<FilterChipsRow field="species" value="dog" onChange={() => {}} options={options} />);
    const dogsChip = screen.getByRole('button', { name: 'Cães' });
    expect(dogsChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('chama onChange ao clicar', () => {
    const handleChange = vi.fn();
    render(<FilterChipsRow field="species" value="all" onChange={handleChange} options={options} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cães' }));
    expect(handleChange).toHaveBeenCalledWith('dog');
  });

  it('suporta múltipla seleção', () => {
    const handleChange = vi.fn();
    render(
      <FilterChipsRow
        field="species"
        value={['dog']}
        onChange={handleChange}
        options={options}
        multiple
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }));
    expect(handleChange).toHaveBeenCalledWith(['dog', 'cat']);
  });
});
