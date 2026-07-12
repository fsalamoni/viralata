import { describe, it, expect } from 'vitest';
import {
  postInputSchema,
  commentInputSchema,
  threadInputSchema,
  threadMessageInputSchema,
  parseOrThrow,
} from './contentSchemas';

describe('contentSchemas (TASK-198)', () => {
  describe('postInputSchema', () => {
    it('aceita post válido e faz trim do texto', () => {
      const out = parseOrThrow(postInputSchema, { text: '  olá  ', attachments: [] });
      expect(out.text).toBe('olá');
      expect(out.attachments).toEqual([]);
    });

    it('rejeita texto vazio ou só espaços', () => {
      expect(() => parseOrThrow(postInputSchema, { text: '   ', attachments: [] }))
        .toThrow('Escreva um texto.');
    });

    it('rejeita texto acima de 10.000 caracteres', () => {
      expect(() => parseOrThrow(postInputSchema, { text: 'a'.repeat(10001), attachments: [] }))
        .toThrow(/muito longo/);
    });

    it('rejeita anexo com URL javascript: (XSS)', () => {
      expect(() => parseOrThrow(postInputSchema, {
        text: 'oi',
        attachments: [{ url: 'javascript:alert(1)' }],
      })).toThrow(/inválida|http/);
    });

    it('aceita anexo https e rejeita mais de 10 anexos', () => {
      const ok = parseOrThrow(postInputSchema, {
        text: 'oi',
        attachments: [{ url: 'https://example.com/foto.jpg', type: 'image/jpeg' }],
      });
      expect(ok.attachments).toHaveLength(1);
      const many = Array.from({ length: 11 }, () => ({ url: 'https://x.com/a.jpg' }));
      expect(() => parseOrThrow(postInputSchema, { text: 'oi', attachments: many }))
        .toThrow(/10 anexos/);
    });
  });

  describe('commentInputSchema', () => {
    it('aceita comentário válido', () => {
      expect(parseOrThrow(commentInputSchema, { text: 'legal!' }).text).toBe('legal!');
    });
    it('rejeita comentário vazio', () => {
      expect(() => parseOrThrow(commentInputSchema, { text: '' })).toThrow('Escreva um texto.');
    });
  });

  describe('threadInputSchema', () => {
    it('aceita thread válida com poll null por default', () => {
      const out = parseOrThrow(threadInputSchema, {
        title: 'Dúvida sobre adoção',
        text: 'Como funciona?',
        attachments: [],
        poll: null,
      });
      expect(out.poll).toBeNull();
    });

    it('rejeita título curto demais', () => {
      expect(() => parseOrThrow(threadInputSchema, {
        title: 'ab', text: 'x', attachments: [], poll: null,
      })).toThrow(/Título muito curto/);
    });

    it('valida poll: exige pelo menos 2 opções', () => {
      expect(() => parseOrThrow(threadInputSchema, {
        title: 'Enquete', text: 'votem', attachments: [],
        poll: { question: 'Qual?', options: ['só uma'] },
      })).toThrow(/2 opções/);
      const ok = parseOrThrow(threadInputSchema, {
        title: 'Enquete', text: 'votem', attachments: [],
        poll: { question: 'Qual?', options: ['a', 'b'] },
      });
      expect(ok.poll.options).toEqual(['a', 'b']);
    });
  });

  describe('threadMessageInputSchema', () => {
    it('aceita mensagem válida', () => {
      const out = parseOrThrow(threadMessageInputSchema, {
        text: 'resposta', attachments: [], poll: null,
      });
      expect(out.text).toBe('resposta');
    });
    it('rejeita mensagem vazia', () => {
      expect(() => parseOrThrow(threadMessageInputSchema, {
        text: '  ', attachments: [], poll: null,
      })).toThrow('Escreva um texto.');
    });
  });
});
