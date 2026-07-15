/**
 * @fileoverview Testes do trigger onVolunteerParticipationCreated (TASK-269).
 *
 * Covers pure helpers (no firebase deps) e exports do módulo.
 * Os testes de email/audit integration são cobertos pelo Firebase Emulator Suite,
 * não por testes unitários (vi.mock() não intercepta require() dentro de módulos CJS).
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

let mod;
let mockSendEmail;

const _mockSendEmail = vi.fn();
vi.mock('./volunteerEmails', () => ({
  sendShiftConfirmationEmail: _mockSendEmail,
}));

beforeAll(async () => {
  mod = await import('./volunteerTriggers.js');
  _mockSendEmail.mockResolvedValue({ ok: true });
});

// ─── buildParticipationTitle ─────────────────────────────────────────────────

describe('buildParticipationTitle', () => {
  it('usa event_label + role', () => {
    expect(mod.buildParticipationTitle({ event_label: 'Alimentação', role: 'Cuidador' }))
      .toBe('Turno confirmado: Alimentação (Cuidador)');
  });

  it('usa event_type quando não tem event_label', () => {
    expect(mod.buildParticipationTitle({ event_type: 'Limpeza', role: null }))
      .toBe('Turno confirmado: Limpeza');
  });

  it('fallback para turno quando nada disponível', () => {
    expect(mod.buildParticipationTitle({})).toBe('Turno confirmado: turno');
  });

  it('não duplica parênteses se role ausente', () => {
    expect(mod.buildParticipationTitle({ event_label: 'Passeio' }))
      .toBe('Turno confirmado: Passeio');
  });
});

// ─── buildParticipationLink ────────────────────────────────────────────────

describe('buildParticipationLink', () => {
  it('retorna URL com clubId e participationId', () => {
    expect(mod.buildParticipationLink('abrigo-42', 'part-99'))
      .toBe('/abrigo/abrigo-42/voluntarios/participacoes/part-99');
  });

  it('participationId vai no final da URL', () => {
    expect(mod.buildParticipationLink('c1', 'p1'))
      .toMatch(/^\/abrigo\/c1\/voluntarios\/participacoes\/p1$/);
  });
});

// ─── exports ──────────────────────────────────────────────────────────────

describe('exports', () => {
  it('CALENDAR_COLLECTION = "calendar"', () => {
    expect(mod.CALENDAR_COLLECTION).toBe('calendar');
  });

  it('AUDIT_COLLECTION = "audit_logs"', () => {
    expect(mod.AUDIT_COLLECTION).toBe('audit_logs');
  });

  it('runOnVolunteerParticipationCreated é função', () => {
    expect(typeof mod.runOnVolunteerParticipationCreated).toBe('function');
  });

  it('runOnVolunteerParticipationCreatedSafe é função', () => {
    expect(typeof mod.runOnVolunteerParticipationCreatedSafe).toBe('function');
  });

  it('sendFCMToVolunteer é função', () => {
    expect(typeof mod.sendFCMToVolunteer).toBe('function');
  });

  it('writeCalendarEntry é função', () => {
    expect(typeof mod.writeCalendarEntry).toBe('function');
  });

  it('writeAuditLog é função', () => {
    expect(typeof mod.writeAuditLog).toBe('function');
  });

  it('buildParticipationTitle é função', () => {
    expect(typeof mod.buildParticipationTitle).toBe('function');
  });

  it('setMessagingOverride é função', () => {
    expect(typeof mod.setMessagingOverride).toBe('function');
  });
});

// ─── runOnVolunteerParticipationCreated: guard conditions ───────────────────

describe('runOnVolunteerParticipationCreated — guard conditions', () => {
  let mockDb;

  beforeAll(() => {
    mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({ create: vi.fn() })),
          })),
        })),
      })),
    };
  });

  beforeEach(() => { mod.setLogger(null); });

  function makeEvent(data = {}, clubId = 'club-1', participationId = 'part-1') {
    return { params: { clubId, participationId }, data: { data: () => data } };
  }

  it('não chama Firestore se volunteer_uid ausente', async () => {
    await mod.runOnVolunteerParticipationCreated(makeEvent({ event_label: 'Alimentação' }), { db: mockDb });
    expect(mockDb.collection).not.toHaveBeenCalled();
  });

  it('não chama Firestore se data é undefined', async () => {
    await mod.runOnVolunteerParticipationCreated({ params: {}, data: { data: () => undefined } }, { db: mockDb });
    expect(mockDb.collection).not.toHaveBeenCalled();
  });
});
