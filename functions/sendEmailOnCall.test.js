/**
 * @fileoverview Tests para sendEmailOnCallCore.cjs (TASK-291).
 *
 * Testa a lógica pura de templates e rendering sem firebase-functions.
 * O wrapper onCall em sendEmailOnCall.js é testado indiretamente
 * pela cobertura das regras de permission + Firestore lookups.
 */

import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  validateTemplateType,
  buildContext,
  renderTemplate,
  renderEmail,
} from './sendEmailOnCallCore.cjs';

describe('TEMPLATES', () => {
  it('possui exatamente 7 templates', () => {
    expect(Object.keys(TEMPLATES)).toHaveLength(7);
  });

  it('application_received é shelter', () => {
    expect(TEMPLATES.application_received.recipientRole).toBe('shelter');
  });

  it('match_approved é adopter', () => {
    expect(TEMPLATES.match_approved.recipientRole).toBe('adopter');
  });

  it('contract_ready é adopter', () => {
    expect(TEMPLATES.contract_ready.recipientRole).toBe('adopter');
  });

  it('milestone_due é adopter', () => {
    expect(TEMPLATES.milestone_due.recipientRole).toBe('adopter');
  });

  it('milestone_overdue é adopter', () => {
    expect(TEMPLATES.milestone_overdue.recipientRole).toBe('adopter');
  });

  it('post_adoption_returned é shelter', () => {
    expect(TEMPLATES.post_adoption_returned.recipientRole).toBe('shelter');
  });

  it('interview_scheduled é adopter', () => {
    expect(TEMPLATES.interview_scheduled.recipientRole).toBe('adopter');
  });

  it('todos os templates têm subject, html, text', () => {
    for (const [name, t] of Object.entries(TEMPLATES)) {
      expect(typeof t.subject, `${name}: subject`).toBe('string');
      expect(typeof t.html, `${name}: html`).toBe('string');
      expect(typeof t.text, `${name}: text`).toBe('string');
      expect(t.subject.length > 0, `${name}: subject not empty`).toBe(true);
    }
  });

  it('subject contém placeholder {{petName}}', () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.subject).toContain('{{petName}}');
    }
  });

  it('shelter templates html contém shelterName; adopter templates contêm adopterName', () => {
    for (const [name, t] of Object.entries(TEMPLATES)) {
      if (t.recipientRole === 'shelter') {
        expect(t.html).toContain('{{shelterName}}', `${name} should have shelterName`);
      }
      if (t.recipientRole === 'adopter') {
        expect(t.html).toContain('{{adopterName}}', `${name} should have adopterName`);
      }
    }
  });

  it('email de adoption devolvido contém returnReason e returnDate', () => {
    const t = TEMPLATES.post_adoption_returned;
    expect(t.html).toContain('{{returnReason}}');
    expect(t.html).toContain('{{returnDate}}');
  });

  it('email de marco contém milestoneLabel e milestoneDueDate', () => {
    for (const key of ['milestone_due', 'milestone_overdue']) {
      const t = TEMPLATES[key];
      expect(t.html).toContain('{{milestoneLabel}}');
      expect(t.html).toContain('{{milestoneDueDate}}');
    }
  });

  it('email overdue contém daysOverdue no body', () => {
    const t = TEMPLATES.milestone_overdue;
    expect(t.html).toContain('{{daysOverdue}}');
    expect(t.html).toContain('{{petName}}');
  });

  it('email contract_ready contém contractUrl', () => {
    const t = TEMPLATES.contract_ready;
    expect(t.html).toContain('{{contractUrl}}');
    expect(t.text).toContain('{{contractUrl}}');
  });
});

describe('validateTemplateType', () => {
  it('aceita template válido', () => {
    const r = validateTemplateType('match_approved');
    expect(r.ok).toBe(true);
    expect(r.template).toBe(TEMPLATES.match_approved);
  });

  it('rejeita template inválido', () => {
    const r = validateTemplateType('invalid_template');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('templateType inválido');
  });

  it('rejeita template null/undefined', () => {
    expect(validateTemplateType(null).ok).toBe(false);
    expect(validateTemplateType(undefined).ok).toBe(false);
    expect(validateTemplateType('').ok).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('substitui placeholder existente', () => {
    const r = renderTemplate('Olá {{name}}!', { name: 'Maria' });
    expect(r).toBe('Olá Maria!');
  });

  it('substitui múltiplos placeholders', () => {
    const r = renderTemplate('{{pet}} — {{shelter}}', { pet: 'Rex', shelter: 'Abrigo Legal' });
    expect(r).toBe('Rex — Abrigo Legal');
  });

  it('preserva placeholder inexistente (sem substituição)', () => {
    const r = renderTemplate('Olá {{name}}!', {});
    expect(r).toBe('Olá {{name}}!');
  });

  it('converte número para string', () => {
    const r = renderTemplate('Dias: {{d}}', { d: 5 });
    expect(r).toBe('Dias: 5');
  });

  it('stringifica null como "null"', () => {
    const r = renderTemplate('X{{x}}Y', { x: null });
    expect(r).toBe('XnullY');
  });
});

describe('buildContext', () => {
  it('preenche contexto mínimo', () => {
    const ctx = buildContext({});
    expect(ctx.petName).toBe('');
    expect(ctx.adopterName).toBe('');
    expect(ctx.daysOverdue).toBe('0');
    expect(ctx.contractUrl).toBe('https://viralata.app/perfil#adocoes');
  });

  it('usa petDoc.name como petName', () => {
    const ctx = buildContext({ petDoc: { name: 'Rex', title: 'Rex Dog' } });
    expect(ctx.petName).toBe('Rex');
  });

  it('usa petDoc.title como fallback de petName', () => {
    const ctx = buildContext({ petDoc: { title: 'Rex Dog' } });
    expect(ctx.petName).toBe('Rex Dog');
  });

  it('usa appDoc.applicant_form.full_name como applicantName', () => {
    const ctx = buildContext({
      appDoc: { applicant_form: { full_name: 'Maria Silva' } },
    });
    expect(ctx.applicantName).toBe('Maria Silva');
  });

  it('diasOverdue vira string', () => {
    const ctx = buildContext({ daysOverdue: 7 });
    expect(ctx.daysOverdue).toBe('7');
  });

  it('prioriza petId passado vs appDoc', () => {
    const ctx = buildContext({
      petId: 'pet-explicit',
      appDoc: { pet_id: 'pet-from-app' },
      petDoc: { name: 'Rex' },
    });
    expect(ctx.petId).toBe('pet-explicit');
  });
});

describe('renderEmail', () => {
  it('renderiza application_received corretamente', () => {
    const ctx = {
      petName: 'Rex', petId: 'pet-1', applicantName: 'Maria',
      shelterName: 'Abrigo Legal', applicationId: 'app-123',
      adopterName: 'Maria', adopterUid: 'uid-1',
      interviewDate: '', interviewTime: '',
      milestoneLabel: '', milestoneDueDate: '',
      daysOverdue: '0', contractUrl: '', returnDate: '', returnReason: '',
      shelterClubId: 'club-1',
    };
    const r = renderEmail('application_received', ctx);
    expect(r.ok).toBe(true);
    expect(r.subject).toContain('Rex');
    expect(r.html).toContain('Maria');
    expect(r.html).toContain('Abrigo Legal');
    expect(r.text).toContain('Rex');
  });

  it('renderiza match_approved corretamente', () => {
    const ctx = {
      petName: 'Luna', petId: 'pet-2', applicantName: 'João',
      shelterName: 'Lar Pet', applicationId: 'app-456',
      adopterName: 'João', adopterUid: 'uid-2',
      interviewDate: '', interviewTime: '',
      milestoneLabel: '', milestoneDueDate: '',
      daysOverdue: '0', contractUrl: '', returnDate: '', returnReason: '',
      shelterClubId: 'club-2',
    };
    const r = renderEmail('match_approved', ctx);
    expect(r.ok).toBe(true);
    expect(r.subject).toContain('Luna');
    expect(r.subject).toContain('Parabéns');
    expect(r.html).toContain('Parabéns');
  });

  it('renderiza milestone_overdue com dias em vermelho', () => {
    const ctx = {
      petName: 'Bidu', petId: 'pet-3', applicantName: 'Ana',
      shelterName: 'Abrigo Central', applicationId: 'app-789',
      adopterName: 'Ana', adopterUid: 'uid-3',
      interviewDate: '', interviewTime: '',
      milestoneLabel: 'Primeira visita pós-adoção',
      milestoneDueDate: '2026-06-01',
      daysOverdue: '15', contractUrl: '', returnDate: '', returnReason: '',
      shelterClubId: 'club-3',
    };
    const r = renderEmail('milestone_overdue', ctx);
    expect(r.ok).toBe(true);
    expect(r.html).toContain('15 dias');
    expect(r.html).toContain('Primeira visita');
    expect(r.html).toContain('2026-06-01');
    expect(r.text).toContain('15 dias');
  });

  it('retorna erro para template inválido', () => {
    const r = renderEmail('nonexistent', {});
    expect(r.ok).toBe(false);
  });
});
