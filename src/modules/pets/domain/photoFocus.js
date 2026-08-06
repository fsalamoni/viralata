/**
 * @fileoverview photoFocus — ponto focal (enquadramento) das fotos do pet.
 *
 * O perfil público exibe as fotos com `object-fit: cover`, que corta a
 * imagem para preencher o espaço disponível. Como a foto nem sempre tem a
 * mesma proporção do espaço, o corte padrão (centralizado) pode esconder a
 * parte importante. Guardamos, por foto, um ponto focal em porcentagem
 * (`{ x, y }`, 0–100) que o abrigo ajusta; ele vira `object-position` e
 * define qual parte da foto permanece visível.
 *
 * Estrutura no pet: `pet.photo_focus = { [url]: { x, y } }`.
 */

/** Ponto focal padrão (centro). */
export const DEFAULT_FOCUS = { x: 50, y: 50 };

/** Normaliza um ponto focal para porcentagens válidas (0–100). */
export function normalizeFocus(focus) {
  const clamp = (n, fallback) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback);
  return {
    x: clamp(focus?.x, DEFAULT_FOCUS.x),
    y: clamp(focus?.y, DEFAULT_FOCUS.y),
  };
}

/** Converte um ponto focal em string de `object-position` (ex.: "50% 30%"). */
export function focusPosition(focus) {
  const { x, y } = normalizeFocus(focus);
  return `${x}% ${y}%`;
}

/** Retorna o `object-position` da foto `url` a partir do mapa de focos. */
export function photoFocusPosition(focusMap, url) {
  const entry = focusMap && url ? focusMap[url] : null;
  return focusPosition(entry);
}
