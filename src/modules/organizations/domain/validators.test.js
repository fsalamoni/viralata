import { describe, it, expect } from 'vitest';
import {
  normalizeMemberInput,
  normalizePostInput,
  normalizeCommentInput,
  normalizeDonationInput,
  normalizeReceiptInput,
  normalizeLedgerEntryInput,
  normalizeLedgerCategoryInput,
  normalizeClubInput,
  normalizeChatMessageInput,
} from './validators.js';
import { POST_INTERACTION, LEDGER_TYPE, PRIVACY_LEVEL } from './constants.js';

describe('normalizeMemberInput', () => {
  it('exige nome', () => {
    expect(() => normalizeMemberInput({})).toThrow(/nome/i);
  });
  it('limita tamanho dos campos', () => {
    const m = normalizeMemberInput({
      user_id: 'u1',
      user_name: 'Maria'.padEnd(500, 'x'),
      bio: 'b'.repeat(5000),
    });
    expect(m.user_name.length).toBe(120);
    expect(m.bio.length).toBe(2000);
  });
  it('normaliza privacy_map', () => {
    const m = normalizeMemberInput({ user_name: 'A', privacy_map: { email: 'invalid' } });
    expect(m.privacy_map.email).toBe(PRIVACY_LEVEL.MEMBERS);
  });
});

describe('normalizePostInput', () => {
  it('marca hasContent se houver texto', () => {
    const p = normalizePostInput({ content: 'olá' });
    expect(p.hasContent).toBe(true);
  });
  it('marca hasContent se houver anexos', () => {
    const p = normalizePostInput({ attachments: [{ url: 'http://x' }] });
    expect(p.hasContent).toBe(true);
  });
  it('hasContent=false sem texto e sem anexos', () => {
    const p = normalizePostInput({});
    expect(p.hasContent).toBe(false);
  });
  it('mapeia allow_interaction em allow_likes/allow_comments', () => {
    const a = normalizePostInput({ content: 'x', allow_interaction: POST_INTERACTION.LIKES });
    expect(a.allow_likes).toBe(true);
    expect(a.allow_comments).toBe(false);
    const b = normalizePostInput({ content: 'x', allow_interaction: POST_INTERACTION.BOTH });
    expect(b.allow_likes).toBe(true);
    expect(b.allow_comments).toBe(true);
  });
  it('limita número de anexos', () => {
    const atts = Array.from({ length: 30 }, () => ({ url: 'http://x' }));
    const p = normalizePostInput({ content: 'x', attachments: atts });
    expect(p.attachments.length).toBeLessThanOrEqual(10);
  });
});

describe('normalizeCommentInput', () => {
  it('exige texto', () => {
    expect(() => normalizeCommentInput({})).toThrow(/coment/i);
  });
  it('limita tamanho', () => {
    const c = normalizeCommentInput({ text: 'a'.repeat(5000) });
    expect(c.text.length).toBeLessThanOrEqual(2000);
  });
});

describe('normalizeDonationInput', () => {
  it('exige título e meta > 0', () => {
    expect(() => normalizeDonationInput({ title: '', goal: 100 })).toThrow(/t[íi]tulo/i);
    expect(() => normalizeDonationInput({ title: 'X', goal: 0 })).toThrow(/meta/i);
  });
  it('cap campos longos', () => {
    const d = normalizeDonationInput({
      title: 'Ajuda',
      goal: 100,
      description: 'd'.repeat(8000),
      pix_key: 'k'.repeat(500),
    });
    expect(d.description.length).toBeLessThanOrEqual(4000);
    expect(d.pix_key.length).toBeLessThanOrEqual(200);
  });
});

describe('normalizeReceiptInput', () => {
  it('exige file_url', () => {
    expect(() => normalizeReceiptInput({})).toThrow(/comprovante/i);
  });
  it('preserva metadados do arquivo', () => {
    const r = normalizeReceiptInput({
      file_url: 'http://x',
      file_name: 'comprovante.png',
      file_type: 'image/png',
      file_size: 1234,
    });
    expect(r.file_name).toBe('comprovante.png');
    expect(r.file_size).toBe(1234);
  });
});

describe('normalizeLedgerEntryInput', () => {
  it('aceita receita e despesa', () => {
    expect(normalizeLedgerEntryInput({ type: LEDGER_TYPE.REVENUE, category: 'X', value: 1, date: '2025-01-01' }).type).toBe(LEDGER_TYPE.REVENUE);
    expect(normalizeLedgerEntryInput({ type: LEDGER_TYPE.EXPENSE, category: 'X', value: 1, date: '2025-01-01' }).type).toBe(LEDGER_TYPE.EXPENSE);
  });
  it('rejeita valor 0', () => {
    expect(() => normalizeLedgerEntryInput({ type: LEDGER_TYPE.REVENUE, category: 'X', value: 0, date: '2025-01-01' })).toThrow();
  });
  it('rejeita categoria vazia', () => {
    expect(() => normalizeLedgerEntryInput({ type: LEDGER_TYPE.REVENUE, category: '', value: 1, date: '2025-01-01' })).toThrow();
  });
});

describe('normalizeLedgerCategoryInput', () => {
  it('exige label', () => {
    expect(() => normalizeLedgerCategoryInput({ type: LEDGER_TYPE.REVENUE })).toThrow();
  });
});

describe('normalizeClubInput', () => {
  it('exige nome', () => {
    expect(() => normalizeClubInput({})).toThrow(/nome/i);
  });
  it('history é maior que description', () => {
    const c = normalizeClubInput({ name: 'ONG', history: 'a'.repeat(10000) });
    expect(c.history.length).toBeLessThanOrEqual(8000);
  });
});

describe('normalizeChatMessageInput', () => {
  it('exige texto', () => {
    expect(() => normalizeChatMessageInput({})).toThrow();
  });
  it('limita tamanho', () => {
    const m = normalizeChatMessageInput({ text: 'a'.repeat(10000) });
    expect(m.text.length).toBeLessThanOrEqual(4000);
  });
});
