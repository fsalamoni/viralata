import { describe, it, expect } from 'vitest';
import {
  shelterDocumentsForMember,
  shelterDocumentsCount,
} from './memberDocuments.js';
import { TERMS_TYPE } from '@/modules/shelter/domain/legal/terms';

describe('memberDocuments', () => {
  it('membro comum recebe os termos obrigatórios da plataforma', () => {
    const docs = shelterDocumentsForMember({});
    const types = docs.map((d) => d.type);
    expect(types).toContain(TERMS_TYPE.GENERAL);
    expect(types).toContain(TERMS_TYPE.PRIVACY);
    expect(types).toContain(TERMS_TYPE.CONDUCT);
    // Não inclui o termo de adesão do abrigo para membro comum.
    expect(types).not.toContain(TERMS_TYPE.SHELTER);
  });

  it('owner/admin também recebe o Termo de Adesão do Abrigo', () => {
    const ownerDocs = shelterDocumentsForMember({ owner: true }).map((d) => d.type);
    const adminDocs = shelterDocumentsForMember({ isAdmin: true }).map((d) => d.type);
    expect(ownerDocs).toContain(TERMS_TYPE.SHELTER);
    expect(adminDocs).toContain(TERMS_TYPE.SHELTER);
  });

  it('cada documento traz label, path e versão canônica', () => {
    const docs = shelterDocumentsForMember({ owner: true });
    docs.forEach((d) => {
      expect(d.label).toBeTruthy();
      expect(d.path).toMatch(/^\//);
      expect(d.version).toBeTruthy();
    });
  });

  it('não duplica tipos e a contagem é coerente', () => {
    const docs = shelterDocumentsForMember({ owner: true, isAdmin: true });
    const types = docs.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    expect(shelterDocumentsCount({ owner: true, isAdmin: true })).toBe(docs.length);
  });
});
