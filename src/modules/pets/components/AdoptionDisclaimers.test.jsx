import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AdoptionDisclaimers, VICES_REDIBITORIOS } from './AdoptionDisclaimers';

describe('AdoptionDisclaimers (TASK-318)', () => {
  it('renderiza todos os vícios canônicos', () => {
    const { container } = render(<AdoptionDisclaimers value={{}} onChange={() => {}} />);
    for (const v of VICES_REDIBITORIOS) {
      expect(container.innerHTML).toContain(v.label);
    }
  });

  it('chama onChange ao clicar checkbox', () => {
    const onChange = vi.fn();
    const { container } = render(<AdoptionDisclaimers value={{}} onChange={onChange} />);
    const cb = container.querySelector('input[type="checkbox"]');
    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toHaveProperty('parvovirose', true);
  });

  it('mostra warning quando nem todos aceitos', () => {
    const { container } = render(<AdoptionDisclaimers value={{ parvovirose: true }} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="adoption-disclaimers-warning"]')).toBeTruthy();
  });

  it('remove warning quando todos aceitos', () => {
    const allAccepted = Object.fromEntries(VICES_REDIBITORIOS.map((v) => [v.key, true]));
    const { container } = render(<AdoptionDisclaimers value={allAccepted} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="adoption-disclaimers-warning"]')).toBeNull();
  });
});
