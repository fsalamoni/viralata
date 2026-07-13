/**
 * @fileoverview Testes do PasswordConfirmDialog (TASK-295).
 *
 * Cobre a lógica de display e validação. Não testa o
 * `reauthenticateWithCredential` do Firebase (precisa de auth mockado
 * + estado de erro). Foca nos aspectos de renderização + a11y.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';

vi.mock('@/core/config/firebase', () => ({
  auth: { currentUser: { email: 'test@example.com' } },
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

// Mock shadcn Dialog para renderização server-side (sem portal)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => (open ? React.createElement('div', { 'data-testid': 'dialog', 'data-open': String(open) }, children) : null),
  DialogContent: ({ children }) => React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }) => React.createElement('div', null, children),
  DialogTitle: ({ children }) => React.createElement('h2', null, children),
  DialogDescription: ({ children }) => React.createElement('p', null, children),
  DialogFooter: ({ children }) => React.createElement('div', null, children),
}));

import { PasswordConfirmDialog } from './password-confirm-dialog.jsx';

describe('PasswordConfirmDialog — renderização (mock shadcn Dialog)', () => {
  it('não renderiza Dialog quando open=false', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, { open: false, onOpenChange: vi.fn() }),
    );
    expect(html).not.toContain('data-open="true"');
  });

  it('renderiza label e campo de senha quando open=true', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
        title: 'Excluir conta',
        email: 'user@example.com',
      }),
    );
    expect(html).toContain('Confirme sua senha');
    expect(html).toContain('type="password"');
  });

  it('renderiza confirmLabel customizado no botão', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
        destructive: true,
        confirmLabel: 'Excluir definitivamente',
      }),
    );
    expect(html).toContain('Excluir definitivamente');
  });

  it('renderiza título passado via prop', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
        title: 'Título customizado aqui',
      }),
    );
    expect(html).toContain('Título customizado aqui');
  });
});

describe('PasswordConfirmDialog — acessibilidade', () => {
  it('campo de senha tem autoComplete=current-password', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }),
    );
    // React SSR serializa o atributo em lowercase
    expect(html).toMatch(/autocomplete="current-password"/i);
  });

  it('campo de senha tem id "password-confirm" para o label', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }),
    );
    expect(html).toContain('id="password-confirm"');
  });

  it('campo de senha tem aria-label ou label associado', () => {
    const html = renderToString(
      React.createElement(PasswordConfirmDialog, {
        open: true,
        onOpenChange: vi.fn(),
      }),
    );
    // Label htmlFor + id input
    expect(html).toMatch(/for="password-confirm"/);
  });
});
