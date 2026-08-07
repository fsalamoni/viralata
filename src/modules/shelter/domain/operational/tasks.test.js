import { describe, it, expect } from 'vitest';
import {
  TASK_PHASE, TASK_PHASE_ORDER, TASK_PHASE_LABEL, isValidPhase,
  createTaskSchema, validateTransition,
  isThirdPartyOverdue, taskHasOverdueThirdParty, isTaskOverdue,
  buildActivity, TASK_ACTIVITY, genId,
} from './tasks.js';

const NOW = new Date('2026-08-07T12:00:00Z').getTime();
const iso = (ms) => new Date(ms).toISOString();

describe('shelter/domain/operational/tasks', () => {
  it('tem as 5 fases na ordem esperada com rótulos', () => {
    expect(TASK_PHASE_ORDER).toEqual([
      TASK_PHASE.PENDING, TASK_PHASE.IN_DEVELOPMENT, TASK_PHASE.AWAITING_THIRD_PARTY,
      TASK_PHASE.DONE, TASK_PHASE.ARCHIVED,
    ]);
    expect(TASK_PHASE_LABEL[TASK_PHASE.AWAITING_THIRD_PARTY]).toBe('Aguardando Terceiros');
    expect(isValidPhase('pending')).toBe(true);
    expect(isValidPhase('nope')).toBe(false);
  });

  describe('createTaskSchema', () => {
    it('exige título com ao menos 2 caracteres', () => {
      expect(() => createTaskSchema.parse({ title: 'a' })).toThrow();
      const t = createTaskSchema.parse({ title: 'Comprar ração' });
      expect(t.title).toBe('Comprar ração');
      expect(t.description).toBe('');
      expect(t.attachments).toEqual([]);
    });
  });

  describe('validateTransition', () => {
    it('Em desenvolvimento exige responsável', () => {
      expect(() => validateTransition(TASK_PHASE.IN_DEVELOPMENT, {})).toThrow();
      const r = validateTransition(TASK_PHASE.IN_DEVELOPMENT, { responsible_name: 'João' });
      expect(r).toMatchObject({ kind: 'in_development', data: { responsible_name: 'João' } });
    });

    it('Aguardando Terceiros exige nome, forma, expectativa e prazo', () => {
      expect(() => validateTransition(TASK_PHASE.AWAITING_THIRD_PARTY, { name: 'Vet' })).toThrow();
      const r = validateTransition(TASK_PHASE.AWAITING_THIRD_PARTY, {
        name: 'Clínica X', delivery_method: 'E-mail', expectation: 'Laudo', expected_return_at: iso(NOW + 86400000),
      });
      expect(r.kind).toBe('awaiting_third_party');
      expect(r.data.name).toBe('Clínica X');
    });

    it('Concluídas exige descrição do que foi realizado', () => {
      expect(() => validateTransition(TASK_PHASE.DONE, {})).toThrow();
      const r = validateTransition(TASK_PHASE.DONE, { completion_note: 'Feito' });
      expect(r.kind).toBe('done');
      expect(r.data.attachments).toEqual([]);
    });

    it('Arquivadas exige justificativa', () => {
      expect(() => validateTransition(TASK_PHASE.ARCHIVED, {})).toThrow();
      const r = validateTransition(TASK_PHASE.ARCHIVED, { archive_reason: 'Duplicada' });
      expect(r.kind).toBe('archived');
    });

    it('Pendentes não exige dados', () => {
      expect(validateTransition(TASK_PHASE.PENDING, {})).toEqual({ kind: 'pending', data: {} });
    });
  });

  describe('prazos', () => {
    it('isThirdPartyOverdue: vencido quando expected_return_at passou', () => {
      expect(isThirdPartyOverdue({ expected_return_at: iso(NOW - 1000) }, NOW)).toBe(true);
      expect(isThirdPartyOverdue({ expected_return_at: iso(NOW + 1000) }, NOW)).toBe(false);
      expect(isThirdPartyOverdue({}, NOW)).toBe(false);
    });

    it('taskHasOverdueThirdParty considera qualquer terceiro vencido', () => {
      const task = { third_parties: [
        { expected_return_at: iso(NOW + 1000) },
        { expected_return_at: iso(NOW - 1000) },
      ] };
      expect(taskHasOverdueThirdParty(task, NOW)).toBe(true);
    });

    it('isTaskOverdue ignora tarefas concluídas/arquivadas', () => {
      expect(isTaskOverdue({ due_at: iso(NOW - 1000), phase: 'pending' }, NOW)).toBe(true);
      expect(isTaskOverdue({ due_at: iso(NOW - 1000), phase: 'done' }, NOW)).toBe(false);
      expect(isTaskOverdue({ phase: 'pending' }, NOW)).toBe(false);
    });
  });

  it('buildActivity monta entrada com autor e timestamp', () => {
    const a = buildActivity(TASK_ACTIVITY.CREATED, { uid: 'u1', name: 'Ana' }, 'Criada');
    expect(a).toMatchObject({ type: 'created', by_uid: 'u1', by_name: 'Ana', message: 'Criada' });
    expect(typeof a.at).toBe('string');
    expect(a.id).toMatch(/^act_/);
  });

  it('genId gera ids únicos com prefixo', () => {
    const a = genId('tp'); const b = genId('tp');
    expect(a).toMatch(/^tp_/);
    expect(a).not.toBe(b);
  });
});
