import { describe, it, expect } from 'vitest';
import {
  CLUB_PERMISSION_BLOCKS,
  CLUB_PERMISSION_DESCRIPTIONS,
  blockPermissionKeys,
  blocksCoverAllPermissions,
  accessLevelSummary,
} from './permissionBlocks.js';
import { CLUB_PERMISSION, CLUB_PERMISSION_KEYS } from './constants.js';

describe('permissionBlocks', () => {
  it('descreve TODAS as chaves de CLUB_PERMISSION (nenhum toggle órfão)', () => {
    CLUB_PERMISSION_KEYS.forEach((key) => {
      expect(typeof CLUB_PERMISSION_DESCRIPTIONS[key]).toBe('string');
      expect(CLUB_PERMISSION_DESCRIPTIONS[key].length).toBeGreaterThan(0);
    });
  });

  it('os blocos cobrem exatamente as permissões existentes, sem duplicar', () => {
    const keys = blockPermissionKeys();
    // sem duplicatas
    expect(new Set(keys).size).toBe(keys.length);
    // cobertura total
    expect(blocksCoverAllPermissions()).toBe(true);
    expect(new Set(keys)).toEqual(new Set(CLUB_PERMISSION_KEYS));
  });

  it('cada bloco tem label, descrição e ao menos uma permissão', () => {
    CLUB_PERMISSION_BLOCKS.forEach((b) => {
      expect(b.label).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(Array.isArray(b.permissions)).toBe(true);
      expect(b.permissions.length).toBeGreaterThan(0);
    });
  });

  it('o bloco de voluntários agrupa a raiz + as 5 sub-permissões', () => {
    const vol = CLUB_PERMISSION_BLOCKS.find((b) => b.key === 'volunteers');
    expect(vol.permissions).toContain(CLUB_PERMISSION.VOLUNTEERS);
    expect(vol.permissions).toContain(CLUB_PERMISSION.VOLUNTEERS_DELETE);
    expect(vol.permissions.length).toBe(6);
  });
});

describe('accessLevelSummary', () => {
  it('owner → acesso total', () => {
    const s = accessLevelSummary({ owner: true });
    expect(s.tone).toBe('owner');
    expect(s.label).toMatch(/total/i);
  });

  it('admin → administrador', () => {
    expect(accessLevelSummary({ isAdmin: true }).tone).toBe('admin');
  });

  it('membro sem atribuições → none', () => {
    const s = accessLevelSummary({ permissions: { animals: false } });
    expect(s.tone).toBe('none');
  });

  it('membro com escopos → lista os blocos principais concedidos', () => {
    const s = accessLevelSummary({ permissions: { animals: true, feed: true } });
    expect(s.tone).toBe('scoped');
    expect(s.label).toMatch(/animais/i);
    expect(s.label).toMatch(/mural/i);
  });
});
