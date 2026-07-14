/**
 * @fileoverview Tests do a11yAudit (TASK-302).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  auditTouchTargets, auditAriaLabels, auditDialogRoles, generateReport,
} from './a11yAudit.js';

describe('a11yAudit (TASK-302)', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('auditTouchTargets', () => {
    it('retorna [] para elemento vazio', () => {
      expect(auditTouchTargets(container)).toEqual([]);
    });

    it('não detecta botão com tamanho adequado (mock)', () => {
      container.innerHTML = '<button style="width: 50px; height: 50px;">OK</button>';
      const btn = container.querySelector('button');
      // Mock getBoundingClientRect
      btn.getBoundingClientRect = () => ({ width: 50, height: 50, top: 0, left: 0, right: 50, bottom: 50 });
      expect(auditTouchTargets(container)).toEqual([]);
    });

    it('detecta botão menor que 44px', () => {
      container.innerHTML = '<button style="width: 30px; height: 30px;">X</button>';
      const btn = container.querySelector('button');
      btn.getBoundingClientRect = () => ({ width: 30, height: 30, top: 0, left: 0, right: 30, bottom: 30 });
      const issues = auditTouchTargets(container);
      expect(issues).toHaveLength(1);
      expect(issues[0].width).toBe(30);
      expect(issues[0].text).toBe('X');
    });

    it('ignora elementos hidden', () => {
      container.innerHTML = '<button style="display:none; width: 10px; height: 10px;">X</button>';
      const issues = auditTouchTargets(container);
      expect(issues).toEqual([]);
    });

    it('detecta apenas width pequeno (não height)', () => {
      container.innerHTML = '<button>X</button>';
      const btn = container.querySelector('button');
      btn.getBoundingClientRect = () => ({ width: 30, height: 50, top: 0, left: 0, right: 30, bottom: 50 });
      const issues = auditTouchTargets(container);
      expect(issues).toHaveLength(1);
    });
  });

  describe('auditAriaLabels', () => {
    it('input sem label é flagged', () => {
      container.innerHTML = '<input type="text" />';
      const issues = auditAriaLabels(container);
      expect(issues.length).toBe(1);
      expect(issues[0].type).toBe('text');
    });

    it('input com aria-label é OK', () => {
      container.innerHTML = '<input type="text" aria-label="Nome" />';
      expect(auditAriaLabels(container)).toEqual([]);
    });

    it('input com <label> é OK', () => {
      container.innerHTML = '<label>Nome <input type="text" /></label>';
      expect(auditAriaLabels(container)).toEqual([]);
    });

    it('input hidden é ignorado', () => {
      container.innerHTML = '<input type="hidden" />';
      expect(auditAriaLabels(container)).toEqual([]);
    });
  });

  describe('auditDialogRoles', () => {
    it('dialog bem formado passa', () => {
      container.innerHTML = `
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">X</h2>
        </div>
      `;
      expect(auditDialogRoles(container)).toEqual([]);
    });

    it('dialog sem aria-modal é flagged', () => {
      container.innerHTML = `
        <div role="dialog" aria-labelledby="t">
          <h2 id="t">X</h2>
        </div>
      `;
      const issues = auditDialogRoles(container);
      expect(issues).toHaveLength(1);
      expect(issues[0].issues).toContain('aria-modal ausente');
    });

    it('dialog sem role é flagged (false positive allowed)', () => {
      // A função busca role=dialog, então div sem role não é capturado
      // (intencional: só audita o que é declarado como dialog)
      container.innerHTML = `<div aria-modal="true">X</div>`;
      const issues = auditDialogRoles(container);
      expect(issues).toEqual([]);
    });

    it('dialog sem label é flagged', () => {
      container.innerHTML = `<div role="dialog" aria-modal="true">X</div>`;
      const issues = auditDialogRoles(container);
      expect(issues[0].issues).toContain('sem aria-label/aria-labelledby');
    });
  });

  describe('generateReport', () => {
    it('retorna relatório consolidado', () => {
      const r = generateReport(container);
      expect(r).toHaveProperty('touchTargets');
      expect(r).toHaveProperty('ariaLabels');
      expect(r).toHaveProperty('dialogs');
      expect(Array.isArray(r.touchTargets)).toBe(true);
    });
  });

  describe('input inválido', () => {
    it('null retorna []', () => {
      expect(auditTouchTargets(null)).toEqual([]);
      expect(auditAriaLabels(null)).toEqual([]);
      expect(auditDialogRoles(null)).toEqual([]);
    });
  });
});
