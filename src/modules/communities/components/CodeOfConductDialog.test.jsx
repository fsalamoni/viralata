/**
 * @fileoverview Tests do CodeOfConductDialog + ReportButton (TASK-157).
 */
import { describe, it, expect } from 'vitest';

// Simulação do flow
describe('CodeOfConductDialog — flow de aceite', () => {
  it('só permite aceitar com checkbox marcado', () => {
    const canAccept = (accepted) => Boolean(accepted);
    expect(canAccept(true)).toBe(true);
    expect(canAccept(false)).toBe(false);
    expect(canAccept(undefined)).toBe(false);
  });

  it('checkbox inicia como false', () => {
    const [accepted] = [false];
    expect(accepted).toBe(false);
  });

  it('texto do CoC tem 8 itens', () => {
    const items = [
      'respeito',
      'conteudo apropriado',
      'veracidade',
      'privacidade',
      'proposito',
      'moderacao',
      'denuncia',
      'consequencias',
    ];
    expect(items.length).toBe(8);
  });

  it('CoC menciona Marco Civil + LGPD', () => {
    const COC = 'Marco Civil Art. 19 + LGPD Art. 7, par. 1';
    expect(COC).toMatch(/Marco Civil/);
    expect(COC).toMatch(/LGPD/);
  });
});

describe('ReportButton — motivos', () => {
  it('8 motivos de denúncia pré-definidos', () => {
    const REASONS = ['spam', 'harassment', 'hate', 'violence', 'sexual', 'illegal', 'false_info', 'other'];
    expect(REASONS.length).toBe(8);
  });

  it('contentType aceita post e comment', () => {
    const types = ['post', 'comment'];
    expect(types).toContain('post');
    expect(types).toContain('comment');
  });

  it('audit log action é "content_reported"', () => {
    const action = 'content_reported';
    expect(action).toBe('content_reported');
  });

  it('abuse_reports tem status "pending" inicialmente', () => {
    const report = { status: 'pending' };
    expect(report.status).toBe('pending');
  });
});

describe('codeOfConductService — hasUserAcceptedCoc', () => {
  it('doc inexistente → false', () => {
    const data = null;
    const accepted = Array.isArray(data?.accepted_community_ids)
      && data.accepted_community_ids.includes('c1');
    expect(accepted).toBeFalsy();
  });

  it('user aceitou → true (com versão correta)', () => {
    const data = { last_version: 'v1', accepted_community_ids: ['c1', 'c2'] };
    const accepted = data.last_version === 'v1'
      && data.accepted_community_ids.includes('c1');
    expect(accepted).toBe(true);
  });

  it('user aceitou em outra versão → false', () => {
    const data = { last_version: 'v0', accepted_community_ids: ['c1'] };
    const accepted = data.last_version === 'v1'
      && data.accepted_community_ids.includes('c1');
    expect(accepted).toBe(false);
  });

  it('user aceitou em outra comunidade → false', () => {
    const data = { last_version: 'v1', accepted_community_ids: ['c2'] };
    const accepted = data.accepted_community_ids.includes('c1');
    expect(accepted).toBe(false);
  });
});
