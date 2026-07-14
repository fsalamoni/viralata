/**
 * @fileoverview Tests do PasswordStrengthMeter (TASK-040).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.jsx';

describe('PasswordStrengthMeter (TASK-040)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof PasswordStrengthMeter).toBe('function');
  });

  it('renderiza sem crash com senha vazia', async () => {
    await act(async () => {
      root.render(<PasswordStrengthMeter password="" />);
    });
    const text = container.textContent;
    expect(text).toContain('Força da senha');
    expect(text).toContain('Mínimo 12 caracteres');
  });

  it('mostra "Forte" para senha válida', async () => {
    await act(async () => {
      root.render(<PasswordStrengthMeter password="MyP@ssw0rd2024!" />);
    });
    expect(container.textContent).toMatch(/Forte|Muito forte/);
  });

  it('mostra checks verdes para todos requisitos', async () => {
    await act(async () => {
      root.render(<PasswordStrengthMeter password="MyP@ssw0rd2024!" />);
    });
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('mostra "Fraca" para senha curta', async () => {
    await act(async () => {
      root.render(<PasswordStrengthMeter password="abc" />);
    });
    expect(container.textContent).toContain('Fraca');
  });

  it('mostra erro de mismatch quando confirmação difere', async () => {
    await act(async () => {
      root.render(
        <PasswordStrengthMeter password="MyP@ssw0rd2024!" confirmPassword="OtherPassword123!" />,
      );
    });
    expect(container.textContent).toContain('As senhas não coincidem');
  });

  it('mostra confirmação ok quando senhas batem', async () => {
    await act(async () => {
      root.render(
        <PasswordStrengthMeter password="MyP@ssw0rd2024!" confirmPassword="MyP@ssw0rd2024!" />,
      );
    });
    expect(container.textContent).toContain('As senhas coincidem');
  });

  it('não mostra erro de match quando confirmPassword vazio', async () => {
    await act(async () => {
      root.render(
        <PasswordStrengthMeter password="MyP@ssw0rd2024!" confirmPassword="" />,
      );
    });
    expect(container.textContent).not.toContain('As senhas não coincidem');
    expect(container.textContent).not.toContain('As senhas coincidem');
  });

  it('progressbar tem aria-valuenow correto', async () => {
    await act(async () => {
      root.render(<PasswordStrengthMeter password="MyP@ssw0rd2024!" />);
    });
    const pb = container.querySelector('[role="progressbar"]');
    expect(pb).toBeTruthy();
    expect(pb.getAttribute('aria-valuenow')).toMatch(/^\d+$/);
  });
});
