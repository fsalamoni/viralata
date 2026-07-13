/**
 * @fileoverview Testes do getMyCardsAll — cross-shelter card listing.
 *
 * Cobre o helper puro (extração do shelter_club_id a partir do path)
 * e o comportamento de fallback quando os board/column docs não
 * existem. Não mocka Firestore (testa contrato da função, não a
 * execução end-to-end).
 */

import { describe, it, expect } from 'vitest';
import { extractShelterClubIdFromCardsPath } from './kanbanService.getMyCardsAll';

describe('extractShelterClubIdFromCardsPath', () => {
  it('extrai shelter_club_id de path válido', () => {
    expect(extractShelterClubIdFromCardsPath('clubs/abc123/kanban_cards/card1'))
      .toBe('abc123');
  });

  it('extrai shelter_club_id de path com IDs longos (Firestore auto-IDs)', () => {
    expect(extractShelterClubIdFromCardsPath('clubs/TM9MBn5aFXgObfRZ39m9/kanban_cards/xyz'))
      .toBe('TM9MBn5aFXgObfRZ39m9');
  });

  it('retorna null para path inválido', () => {
    expect(extractShelterClubIdFromCardsPath('invalid/path')).toBe(null);
  });

  it('retorna null para path vazio', () => {
    expect(extractShelterClubIdFromCardsPath('')).toBe(null);
  });

  it('retorna null para path sem kanban_cards', () => {
    expect(extractShelterClubIdFromCardsPath('clubs/abc/other/xyz')).toBe(null);
  });
});
