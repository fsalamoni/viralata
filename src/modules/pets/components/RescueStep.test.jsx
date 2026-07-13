/**
 * @fileoverview Tests do RescueStep (TASK-296).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// Mock dos componentes UI
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => React.createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children }) => React.createElement('div', null, children),
  CardHeader: ({ children }) => React.createElement('div', null, children),
  CardTitle: ({ children }) => React.createElement('div', null, children),
  CardDescription: ({ children }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props) => React.createElement('input', { ...props, value: props.value ?? '' }),
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }) => React.createElement('label', { htmlFor }, children),
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props) => React.createElement('textarea', { ...props, value: props.value ?? '' }),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }) => React.createElement('div', { 'data-mock-select': true, onClick: () => onValueChange && onValueChange('healthy') }, children),
  SelectContent: ({ children }) => React.createElement('div', null, children),
  SelectItem: ({ children, value }) => React.createElement('div', { 'data-value': value }, children),
  SelectTrigger: ({ children }) => React.createElement('div', null, children),
  SelectValue: ({ placeholder }) => React.createElement('div', null, placeholder),
}));

import { RescueStep, INTAKE_TYPES, ASILOMAR_STATUS } from './RescueStep';

let container;
let root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

const render = (element) => {
  act(() => {
    root.render(element);
  });
  return { container };
};

describe('RescueStep — constantes', () => {
  it('INTAKE_TYPES tem 5 valores', () => {
    expect(INTAKE_TYPES.length).toBe(5);
  });

  it('INTAKE_TYPES inclui os 5 valores esperados', () => {
    const values = INTAKE_TYPES.map((t) => t.value);
    expect(values).toEqual(['stray', 'surrender', 'transfer', 'return', 'born']);
  });

  it('ASILOMAR_STATUS tem 5 valores (convenção internacional)', () => {
    expect(ASILOMAR_STATUS.length).toBe(5);
  });

  it('ASILOMAR_STATUS inclui os 5 valores canônicos', () => {
    const values = ASILOMAR_STATUS.map((s) => s.value);
    expect(values).toEqual([
      'healthy',
      'treatable_rehabilitatable',
      'treatable_manageable',
      'unhealthy_untreatable',
      'unknown',
    ]);
  });

  it('cada Asilomar status tem label + tone + color', () => {
    ASILOMAR_STATUS.forEach((s) => {
      expect(s.label).toBeTruthy();
      expect(s.tone).toBeTruthy();
      expect(['green', 'blue', 'amber', 'red', 'gray']).toContain(s.color);
    });
  });
});

describe('RescueStep — render', () => {
  it('renderiza sem erro com form vazio', () => {
    const setValue = vi.fn();
    const { container } = render(<RescueStep form={{}} setValue={setValue} />);
    expect(container).toBeTruthy();
  });

  it('contém seção Identificação do resgate', () => {
    const setValue = vi.fn();
    const { container } = render(<RescueStep form={{}} setValue={setValue} />);
    expect(container.textContent).toContain('Identificação');
  });

  it('contém seção Local do resgate', () => {
    const setValue = vi.fn();
    const { container } = render(<RescueStep form={{}} setValue={setValue} />);
    expect(container.textContent).toContain('Local do resgate');
  });

  it('contém seção Classificação', () => {
    const setValue = vi.fn();
    const { container } = render(<RescueStep form={{}} setValue={setValue} />);
    expect(container.textContent).toContain('Classificação');
  });

  it('contém microcopy sobre Asilomar', () => {
    const setValue = vi.fn();
    const { container } = render(<RescueStep form={{}} setValue={setValue} />);
    expect(container.textContent).toContain('Status Asilomar');
    expect(container.textContent).toContain('convenção internacional');
  });
});
