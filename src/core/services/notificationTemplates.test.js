/**
 * @fileoverview Testes do notificationTemplates (TASK-175).
 */
import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  extractVariables,
  validateVariables,
  previewTemplate,
  DEFAULT_TEMPLATES,
  TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_KEYS,
  notificationTemplateSchema,
} from './notificationTemplates.js';

describe('notificationTemplates — renderTemplate (TASK-175)', () => {
  it('substitui {{var}} por valor', () => {
    expect(renderTemplate('Olá {{name}}', { name: 'Maria' })).toBe('Olá Maria');
  });

  it('substitui múltiplas variáveis', () => {
    expect(renderTemplate('{{a}} + {{b}} = 2', { a: '1', b: '1' })).toBe('1 + 1 = 2');
  });

  it('deixa variáveis desconhecidas como {{var}}', () => {
    expect(renderTemplate('{{conhecida}} e {{desconhecida}}', { conhecida: 'X' }))
      .toBe('X e {{desconhecida}}');
  });

  it('escapa HTML no valor', () => {
    expect(renderTemplate('Nome: {{name}}', { name: '<script>x</script>' }))
      .toBe('Nome: &lt;script&gt;x&lt;/script&gt;');
  });

  it('aceita valores numéricos', () => {
    expect(renderTemplate('Faltam {{n}} dias', { n: 3 })).toBe('Faltam 3 dias');
  });

  it('retorna string vazia se texto vazio', () => {
    expect(renderTemplate('', { x: 1 })).toBe('');
    expect(renderTemplate(null, { x: 1 })).toBe('');
  });

  it('tolera vars undefined', () => {
    expect(renderTemplate('{{x}}', {})).toBe('{{x}}');
  });
});

describe('notificationTemplates — extractVariables', () => {
  it('extrai variáveis únicas na ordem', () => {
    const vars = extractVariables('{{a}} {{b}} {{a}} {{c}}');
    expect(vars).toEqual(['a', 'b', 'c']);
  });

  it('retorna array vazio para texto sem vars', () => {
    expect(extractVariables('Sem vars')).toEqual([]);
  });

  it('tolera whitespace dentro das chaves', () => {
    expect(extractVariables('{{ name }} e {{age}}')).toEqual(['name', 'age']);
  });

  it('ignora chaves malformadas', () => {
    expect(extractVariables('{x} {{1abc}} {{ok}}')).toEqual(['ok']);
  });
});

describe('notificationTemplates — validateVariables', () => {
  it('aceita variáveis conhecidas', () => {
    const r = validateVariables(['pet_name', 'shelter_name']);
    expect(r.valid).toBe(true);
    expect(r.unknown).toEqual([]);
  });

  it('detecta variáveis desconhecidas', () => {
    const r = validateVariables(['pet_name', 'fake_variable', 'shelter_name', 'outro']);
    expect(r.valid).toBe(false);
    expect(r.unknown).toEqual(['fake_variable', 'outro']);
  });
});

describe('notificationTemplates — TEMPLATE_VARIABLES', () => {
  it('tem 12 variáveis disponíveis', () => {
    expect(TEMPLATE_VARIABLES).toHaveLength(12);
  });

  it('TEMPLATE_VARIABLE_KEYS bate com TEMPLATE_VARIABLES', () => {
    expect(TEMPLATE_VARIABLE_KEYS).toHaveLength(TEMPLATE_VARIABLES.length);
    expect(TEMPLATE_VARIABLE_KEYS).toContain('pet_name');
    expect(TEMPLATE_VARIABLE_KEYS).toContain('shelter_name');
  });
});

describe('notificationTemplates — previewTemplate', () => {
  it('renderiza com valores de exemplo', () => {
    const p = previewTemplate({ subject: '{{pet_name}}', body: 'em {{shelter_name}}' });
    expect(p.subject).toBe('Rex');
    expect(p.body).toBe('em Abrigo Esperança');
  });
});

describe('notificationTemplates — DEFAULT_TEMPLATES', () => {
  it('tem 5 templates default', () => {
    expect(DEFAULT_TEMPLATES.length).toBe(5);
  });

  it('todos os defaults usam variáveis válidas', () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      const usedInSubject = extractVariables(t.subject);
      const usedInBody = extractVariables(t.body);
      const all = [...usedInSubject, ...usedInBody];
      const r = validateVariables(all);
      expect(r.valid).toBe(true);
    });
  });

  it('todos têm name, subject, body, category', () => {
    DEFAULT_TEMPLATES.forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(['adoption', 'foster', 'medication', 'event', 'general']).toContain(t.category);
    });
  });
});

describe('notificationTemplates — schema Zod', () => {
  it('valida template correto', () => {
    const valid = {
      id: 'tmpl-1',
      name: 'Teste',
      subject: 'Olá {{pet_name}}',
      body: 'Corpo do template',
      category: 'adoption',
      shelter_club_id: null,
      variables: ['pet_name'],
      is_active: true,
    };
    expect(() => notificationTemplateSchema.parse(valid)).not.toThrow();
  });

  it('rejeita category inválida', () => {
    const invalid = {
      id: 'tmpl-1',
      name: 'Teste',
      subject: 'x',
      body: 'x',
      category: 'invalida',
      shelter_club_id: null,
    };
    expect(() => notificationTemplateSchema.parse(invalid)).toThrow();
  });

  it('rejeita subject muito longo', () => {
    const invalid = {
      id: 'tmpl-1',
      name: 'x',
      subject: 'x'.repeat(201),
      body: 'x',
      category: 'adoption',
      shelter_club_id: null,
    };
    expect(() => notificationTemplateSchema.parse(invalid)).toThrow();
  });
});
