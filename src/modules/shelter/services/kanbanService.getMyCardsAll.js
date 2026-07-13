/**
 * @fileoverview Helper puro para extrair shelter_club_id de paths de
 * collectionGroup do Firestore. Exportado separado para ser testável
 * sem mockar o Firestore.
 */

/**
 * Extrai o shelter_club_id de um path de card do Kanban
 * (`clubs/{clubId}/kanban_cards/{cardId}`).
 *
 * @param {string} path - path completo do documento
 * @returns {string|null} shelter_club_id ou null se o path não casar
 */
export function extractShelterClubIdFromCardsPath(path) {
  if (typeof path !== 'string' || !path) return null;
  const match = path.match(/^clubs\/([^/]+)\/kanban_cards\//);
  return match ? match[1] : null;
}
