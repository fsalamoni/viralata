/**
 * generateEventCertificateCore.test.js
 * Unit tests for generateEventCertificatePdf.
 */

import { describe, it, expect } from 'vitest';
import { generateEventCertificatePdf } from './generateEventCertificateCore.cjs';

describe('generateEventCertificatePdf', () => {
  const validParams = {
    userName:       'João Silva',
    eventTitle:     'Mutirão de Adoção — Parque Villa-Lobos',
    eventDate:      '15 de novembro de 2026',
    eventLocation:  'Parque Villa-Lobos, São Paulo',
    eventType:      'Mutirão de Adoção',
    issuedAt:       '2026-11-16T10:00:00.000Z',
    clubName:       'ONG Amigo Bicho',
    hours:          '4 horas',
  };

  it('returns a Uint8Array', async () => {
    const pdf = await generateEventCertificatePdf(validParams);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('returns non-empty bytes (is a valid PDF header)', async () => {
    const pdf = await generateEventCertificatePdf(validParams);
    // PDF magic bytes
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
  });

  it('throws if userName is missing', async () => {
    await expect(
      generateEventCertificatePdf({ ...validParams, userName: undefined })
    ).rejects.toThrow('userName is required');
  });

  it('throws if eventTitle is missing', async () => {
    await expect(
      generateEventCertificatePdf({ ...validParams, eventTitle: '' })
    ).rejects.toThrow('eventTitle is required');
  });

  it('throws if eventDate is missing', async () => {
    await expect(
      generateEventCertificatePdf({ ...validParams, eventDate: null })
    ).rejects.toThrow('eventDate is required');
  });

  it('handles missing optional fields gracefully', async () => {
    const minimal = {
      userName:   'Maria Santos',
      eventTitle: 'Reunião Mensal',
      eventDate:  '10 de janeiro de 2027',
    };
    const pdf = await generateEventCertificatePdf(minimal);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('handles null clubName', async () => {
    const pdf = await generateEventCertificatePdf({ ...validParams, clubName: null });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });

  it('handles null hours', async () => {
    const pdf = await generateEventCertificatePdf({ ...validParams, hours: null });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });

  it('handles empty strings for optional fields', async () => {
    const pdf = await generateEventCertificatePdf({
      ...validParams,
      eventLocation: '',
      clubName:      '',
      hours:         '',
    });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });

  it('handles long user and event names', async () => {
    const pdf = await generateEventCertificatePdf({
      ...validParams,
      userName:   'Maria da Conceição Oliveira dos Santos Silva',
      eventTitle: 'Grande Mutirão de Adoção de Animais Abandonados — Parque Central',
    });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });

  it('handles special characters in names', async () => {
    const pdf = await generateEventCertificatePdf({
      ...validParams,
      userName:   "João José d'Ávila-Neto",
      eventTitle: 'Confraternização de Natal 🎄★',
    });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });

  it('produces different output for different user names', async () => {
    const pdf1 = await generateEventCertificatePdf(validParams);
    const pdf2 = await generateEventCertificatePdf({
      ...validParams,
      userName: 'Maria Silva',
    });
    // Different names → different PDF bytes (not identical)
    expect(pdf1.join(',')).not.toBe(pdf2.join(','));
  });

  it('uses issuedAt when provided', async () => {
    // Just ensure it doesn't throw with ISO date
    const pdf = await generateEventCertificatePdf({
      ...validParams,
      issuedAt: '2026-07-15T00:00:00.000Z',
    });
    expect(pdf).toBeInstanceOf(Uint8Array);
  });
});
