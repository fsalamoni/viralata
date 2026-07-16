import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AdoptionDisclaimers, VICES_REDIBITORIOS } from './AdoptionDisclaimers';
describe('AdoptionDisclaimers (TASK-318)', () => {
  it('renderiza vícios', () => {
    const { container } = render(<AdoptionDisclaimers value={{}} onChange={() => {}} />);
    for (const v of VICES_REDIBITORIOS) expect(container.innerHTML).toContain(v.label);
  });
  it('mostra warning quando nem todos aceitos', () => {
    const { container } = render(<AdoptionDisclaimers value={{ parvovirose: true }} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="adoption-disclaimers-warning"]')).toBeTruthy();
  });
});
