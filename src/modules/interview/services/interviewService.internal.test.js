/**
 * @fileoverview Tests para interviewService.internal + schema (TASK-290).
 */
import { describe, it, expect } from 'vitest';
import {
  buildInterviewDocId,
  isValidTransition,
  checklistProgress,
  defaultChecklist,
} from './interviewService.internal';

describe('interviewService.internal — buildInterviewDocId', () => {
  it('id é determinístico', () => {
    const a = buildInterviewDocId({ applicationId: 'app-1', applicantUid: 'uid-1' });
    const b = buildInterviewDocId({ applicationId: 'app-1', applicantUid: 'uid-1' });
    expect(a).toBe(b);
  });

  it('id inclui prefixo do applicationId', () => {
    const id = buildInterviewDocId({ applicationId: 'my-app-xyz', applicantUid: 'u' });
    expect(id).toContain('my-app-xyz'.slice(0, 32));
  });

  it('id inclui prefixo do applicantUid', () => {
    const id = buildInterviewDocId({ applicationId: 'a', applicantUid: 'unique-adopter-uid' });
    expect(id).toContain('unique-adopter-uid'.slice(0, 12));
  });

  it('lança se faltar campos', () => {
    expect(() => buildInterviewDocId({})).toThrow();
    expect(() => buildInterviewDocId({ applicationId: 'a' })).toThrow();
    expect(() => buildInterviewDocId({ applicantUid: 'u' })).toThrow();
  });
});

describe('interviewService.internal — isValidTransition', () => {
  it('proposed → scheduled é válido', () => {
    expect(isValidTransition('proposed', 'scheduled')).toBe(true);
  });

  it('proposed → completed NÃO é válido', () => {
    expect(isValidTransition('proposed', 'completed')).toBe(false);
  });

  it('scheduled → completed é válido', () => {
    expect(isValidTransition('scheduled', 'completed')).toBe(true);
  });

  it('completed → evaluated é válido', () => {
    expect(isValidTransition('completed', 'evaluated')).toBe(true);
  });

  it('evaluated é terminal (nenhuma transição sai)', () => {
    expect(isValidTransition('evaluated', 'proposed')).toBe(false);
    expect(isValidTransition('evaluated', 'scheduled')).toBe(false);
    expect(isValidTransition('evaluated', 'completed')).toBe(false);
  });

  it('cancelled é terminal', () => {
    expect(isValidTransition('cancelled', 'proposed')).toBe(false);
    expect(isValidTransition('cancelled', 'scheduled')).toBe(false);
  });

  it('status inválido retorna false', () => {
    expect(isValidTransition('unknown', 'scheduled')).toBe(false);
  });
});

describe('interviewService.internal — checklistProgress', () => {
  it('checklist vazio → 0%', () => {
    expect(checklistProgress([])).toBe(0);
    expect(checklistProgress()).toBe(0);
    expect(checklistProgress(null)).toBe(0);
  });

  it('2/4 done → 50%', () => {
    const c = [
      { topic: 'a', done: true },
      { topic: 'b', done: true },
      { topic: 'c', done: false },
      { topic: 'd', done: false },
    ];
    expect(checklistProgress(c)).toBe(50);
  });

  it('todos done → 100%', () => {
    const c = [
      { topic: 'a', done: true },
      { topic: 'b', done: true },
    ];
    expect(checklistProgress(c)).toBe(100);
  });

  it('nenhum done → 0%', () => {
    const c = [{ topic: 'a', done: false }];
    expect(checklistProgress(c)).toBe(0);
  });
});

describe('interviewService.internal — defaultChecklist', () => {
  it('tem 8 tópicos padrão', () => {
    const c = defaultChecklist();
    expect(c.length).toBe(8);
  });

  it('todos os tópicos começam como done=false', () => {
    const c = defaultChecklist();
    expect(c.every((item) => item.done === false)).toBe(true);
  });

  it('tópicos cobrem áreas-chave de entrevista de adoção', () => {
    const c = defaultChecklist();
    const topics = c.map((i) => i.topic.toLowerCase()).join(' ');
    expect(topics).toMatch(/resid|segur/); // residência/segurança
    expect(topics).toMatch(/veterin|orçamento/); // veterinário
    expect(topics).toMatch(/castra/); // castração
  });
});

describe('interviewService — schema', () => {
  it('INTERVIEW_STATUS exporta 5 valores', async () => {
    const { INTERVIEW_STATUS } = await import('../schemas/interviewSchema');
    expect(Object.values(INTERVIEW_STATUS)).toEqual([
      'proposed', 'scheduled', 'completed', 'evaluated', 'cancelled',
    ]);
  });

  it('INTERVIEW_MODE exporta 3 valores', async () => {
    const { INTERVIEW_MODE } = await import('../schemas/interviewSchema');
    expect(Object.values(INTERVIEW_MODE)).toEqual(['in_person', 'video', 'phone']);
  });

  it('createInterviewSchema.strict() rejeita shelter_signed_at (campo extra)', async () => {
    const { createInterviewSchema } = await import('../schemas/interviewSchema');
    const baseData = {
      application_id: 'app-1',
      applicant_uid: 'uid-1',
      applicant_name: 'Maria',
      shelter_club_id: 'c1',
      mode: 'in_person',
      status: 'proposed',
      checklist: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(() => createInterviewSchema.parse(baseData)).not.toThrow();
    const withExtra = { ...baseData, shelter_signed_at: 'oops' };
    expect(() => createInterviewSchema.parse(withExtra)).toThrow();
  });

  it('scheduleInterviewSchema requer scheduledAt válido', async () => {
    const { scheduleInterviewSchema } = await import('../schemas/interviewSchema');
    const valid = {
      scheduled_at: '2026-07-20T10:00:00Z',
      mode: 'video',
      status: 'scheduled',
      updated_at: '2026-07-13T09:00:00Z',
    };
    expect(() => scheduleInterviewSchema.parse(valid)).not.toThrow();
    // ISO inválido
    expect(() => scheduleInterviewSchema.parse({ ...valid, scheduled_at: 'amanhã' })).toThrow();
  });

  it('evaluateInterviewSchema restringe stars a 1-5', async () => {
    const { evaluateInterviewSchema } = await import('../schemas/interviewSchema');
    const valid = {
      evaluation_stars: 4,
      evaluation_notes: 'otimo adotante',
      status: 'evaluated',
      updated_at: '2026-07-13T09:00:00Z',
    };
    expect(() => evaluateInterviewSchema.parse(valid)).not.toThrow();
    expect(() => evaluateInterviewSchema.parse({ ...valid, evaluation_stars: 0 })).toThrow();
    expect(() => evaluateInterviewSchema.parse({ ...valid, evaluation_stars: 6 })).toThrow();
    expect(() => evaluateInterviewSchema.parse({ ...valid, evaluation_stars: 3.5 })).toThrow();
  });
});
