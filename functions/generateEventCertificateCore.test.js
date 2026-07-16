/**
 * @fileoverview TASK-343: Unit tests for generateEventCertificateCore.
 */

import { describe, it, expect } from 'vitest';
import { generateCertificateBuffer, validateInput } from './generateEventCertificateCore.cjs';

describe('validateInput', () => {
  it('returns empty array for valid input', () => {
    const errors = validateInput({
      participantName: 'João Silva',
      eventTitle: 'Mutirão de Adoção',
      eventDate: '2026-07-20T14:00:00.000Z',
      eventType: 'ADOPTION_DRIVE',
    });
    expect(errors).toHaveLength(0);
  });

  it('returns error if participantName is missing', () => {
    const errors = validateInput({
      eventTitle: 'Mutirão',
    });
    expect(errors).toContain('participantName is required and must be a non-empty string');
  });

  it('returns error if participantName is whitespace only', () => {
    const errors = validateInput({ participantName: '   ', eventTitle: 'Mutirão' });
    expect(errors.some((e) => e.includes('participantName'))).toBe(true);
  });

  it('returns error if eventTitle is missing', () => {
    const errors = validateInput({ participantName: 'João' });
    expect(errors).toContain('eventTitle is required and must be a non-empty string');
  });

  it('returns error if eventType is invalid', () => {
    const errors = validateInput({
      participantName: 'João',
      eventTitle: 'Mutirão',
      eventType: 'INVALID_TYPE',
    });
    expect(errors.some((e) => e.includes('eventType'))).toBe(true);
  });

  it('accepts all valid event types', () => {
    const validTypes = [
      'SOCIAL', 'ADOPTION_DRIVE', 'MEETING', 'TRAINING',
      'VACCINATION', 'LECTURE', 'FUNDRAISING', 'PET_DAY',
    ];
    for (const type of validTypes) {
      const errors = validateInput({
        participantName: 'João',
        eventTitle: 'Mutirão',
        eventType: type,
      });
      expect(errors).toHaveLength(0);
    }
  });

  it('returns error if eventDate is invalid', () => {
    const errors = validateInput({
      participantName: 'João',
      eventTitle: 'Mutirão',
      eventDate: 'not-a-date',
    });
    expect(errors.some((e) => e.includes('eventDate'))).toBe(true);
  });

  it('returns error if opts is null', () => {
    const errors = validateInput(null);
    expect(errors).toContain('opts must be a non-null object');
  });

  it('returns error if opts is not an object', () => {
    const errors = validateInput('string');
    expect(errors).toContain('opts must be a non-null object');
  });
});

describe('generateCertificateBuffer', () => {
  it('generates a Buffer for valid input', async () => {
    const buf = await generateCertificateBuffer({
      participantName: 'João Silva',
      eventTitle: 'Mutirão de Adoção — Parque Villa-Lobos',
      eventDate: '2026-07-20T14:00:00.000Z',
      eventLocation: 'Parque Villa-Lobos, São Paulo - SP',
      eventType: 'ADOPTION_DRIVE',
      orgName: 'Abrigo Esperança',
      issuedAt: '2026-07-21T10:00:00.000Z',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('generates a Buffer with minimal input', async () => {
    const buf = await generateCertificateBuffer({
      participantName: 'Maria',
      eventTitle: 'Evento',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('handles empty optional fields gracefully', async () => {
    const buf = await generateCertificateBuffer({
      participantName: 'Ana',
      eventTitle: 'Reunião',
      eventLocation: '',
      eventType: '',
      orgName: '',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('handles Date object as eventDate', async () => {
    const buf = await generateCertificateBuffer({
      participantName: 'Carlos',
      eventTitle: 'Palestra',
      eventDate: new Date('2026-08-01T10:00:00Z'),
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
