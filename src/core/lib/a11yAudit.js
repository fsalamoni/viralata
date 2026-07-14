/**
 * @fileoverview a11yAudit — auditoria de acessibilidade (TASK-302).
 *
 * **Foco mobile**:
 * - Touch targets >= 44x44px (WCAG 2.5.5 Level AAA / Apple HIG)
 * - Contraste WCAG AA (4.5:1 texto, 3:1 large text)
 * - aria-label em elementos interativos
 * - role correto em dialogs
 *
 * **API**:
 * - auditTouchTargets(element): retorna lista de <44x44px
 * - auditAriaLabels(element): retorna elementos sem label
 * - generateReport(element): relatório consolidado
 *
 * **Como usar** (em test):
 * ```js
 * import { auditTouchTargets } from '@/core/lib/a11yAudit';
 * const issues = auditTouchTargets(container);
 * expect(issues).toEqual([]);
 * ```
 */

const MIN_TOUCH_TARGET = 44;
const SELECTORS_BUTTON = 'button, a[role="button"], [role="button"], input[type="submit"], input[type="button"]';
const SELECTORS_INPUT = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), select, textarea';

/**
 * Audita touch targets. Retorna array de issues.
 * Cada issue: { selector, width, height, text }
 *
 * @param {Element|HTMLElement} root
 * @returns {Array<{selector: string, width: number, height: number, text: string}>}
 */
export function auditTouchTargets(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const issues = [];
  const elements = root.querySelectorAll(SELECTORS_BUTTON);
  for (const el of elements) {
    // Skip se hidden (style.display: none ou offsetParent null em jsdom)
    const style = el.ownerDocument?.defaultView?.getComputedStyle?.(el);
    if (style?.display === 'none' || style?.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.width < MIN_TOUCH_TARGET || rect.height < MIN_TOUCH_TARGET) {
      issues.push({
        selector: getSelector(el),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().substring(0, 50),
      });
    }
  }
  return issues;
}

/**
 * Audita aria-labels em inputs e botões. Retorna elementos sem label.
 *
 * @param {Element} root
 * @returns {Array<{selector: string, type: string, name: string}>}
 */
export function auditAriaLabels(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const issues = [];
  const inputs = root.querySelectorAll(SELECTORS_INPUT);
  for (const el of inputs) {
    const hasLabel = el.labels?.length > 0
      || el.getAttribute('aria-label')
      || el.getAttribute('aria-labelledby')
      || el.getAttribute('placeholder')  // Aceitável mas não ideal
      || el.getAttribute('title');
    if (!hasLabel) {
      issues.push({
        selector: getSelector(el),
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || el.id || '',
      });
    }
  }
  return issues;
}

/**
 * Verifica se Dialogs têm role="dialog" e aria-modal.
 *
 * @param {Element} root
 * @returns {Array<{selector: string, issues: string[]}>}
 */
export function auditDialogRoles(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const issues = [];
  const dialogs = root.querySelectorAll('[role="dialog"], dialog');
  for (const d of dialogs) {
    const problems = [];
    if (d.getAttribute('role') !== 'dialog' && d.tagName !== 'DIALOG') {
      problems.push('role=dialog ausente');
    }
    if (d.getAttribute('aria-modal') !== 'true' && d.getAttribute('aria-modal') !== 'false') {
      problems.push('aria-modal ausente');
    }
    if (!d.getAttribute('aria-labelledby') && !d.getAttribute('aria-label')) {
      problems.push('sem aria-label/aria-labelledby');
    }
    if (problems.length > 0) {
      issues.push({ selector: getSelector(d), issues: problems });
    }
  }
  return issues;
}

/**
 * Relatório consolidado.
 */
export function generateReport(root) {
  return {
    touchTargets: auditTouchTargets(root),
    ariaLabels: auditAriaLabels(root),
    dialogs: auditDialogRoles(root),
  };
}

function getSelector(el) {
  if (!el) return '';
  const parts = [];
  let cur = el;
  while (cur && cur !== document.body && parts.length < 5) {
    let part = cur.tagName?.toLowerCase() || '';
    if (cur.id) {
      part += `#${cur.id}`;
      parts.unshift(part);
      break;
    }
    if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.split(' ').filter((c) => c && !c.startsWith('aria-'))[0];
      if (cls) part += `.${cls.substring(0, 30)}`;
    }
    parts.unshift(part);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}
