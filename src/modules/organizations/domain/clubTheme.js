/**
 * Tema visual por ONG.
 *
 * Cada organização pode customizar as cores de cards, botões e textos
 * (conjunto principal de variáveis CSS). O tema é armazenado como objeto
 * dentro do documento da ONG (`clubs.theme`) e aplicado na página via
 * CSS variables inline num wrapper, de modo que apenas o escopo da ONG
 * seja afetado — outras ONGs e o restante do app seguem com o tema
 * padrão do `index.css`.
 *
 * Os valores são `H S% L%` no formato aceito pelo Tailwind (`hsl(var(--x))`),
 * sem a função `hsl()` e sem vírgulas — ex.: `"17 72% 45%"`.
 *
 * Se um campo estiver ausente ou inválido, caímos no default (que vem do
 * `:root` em `index.css`). A função `effectiveClubTheme` aplica os
 * defaults para garantir que sempre tenhamos 7 chaves válidas.
 */

export const CLUB_THEME_FIELDS = Object.freeze([
  { key: 'primary', label: 'Cor principal', hint: 'Botões primários, ações destacadas, badges.', defaultHsl: '17 72% 45%' },
  { key: 'highlight', label: 'Cor de destaque', hint: 'Selos, gradientes e pontos de realce.', defaultHsl: '40 88% 54%' },
  { key: 'accent', label: 'Cor de apoio', hint: 'Suaviza contrastes e auxilia em estados secundários.', defaultHsl: '86 30% 32%' },
  { key: 'background', label: 'Fundo da página', hint: 'Cor de fundo principal da área da ONG.', defaultHsl: '38 45% 97%' },
  { key: 'card', label: 'Fundo dos cards', hint: 'Superfícies elevadas, caixas de conteúdo.', defaultHsl: '30 45% 99%' },
]);

/** Tema padrão derivado do `index.css :root`. */
export const DEFAULT_CLUB_THEME = Object.freeze(
  Object.fromEntries(CLUB_THEME_FIELDS.map((f) => [f.key, f.defaultHsl])),
);

/** Correlação de CSS variables expostas pelo Tailwind — usado para montar o `style` inline. */
const CSS_VAR_FOR_FIELD = Object.freeze({
  primary: '--primary',
  highlight: '--highlight',
  accent: '--accent',
  background: '--background',
  card: '--card',
});

/**
 * Sanitiza uma string HSL recebida do Firestore:
 *  - Trim e limit
 *  - Rejeita valores claramente inválidos (vazio, caracteres suspeitos)
 * Formato esperado: `"H S% L%"` ou `"H S L"` com `%` opcional.
 * Aceitamos flexibilidade para tolerar campos vindos de UI de color
 * picker que emitem diferentes formas.
 */
export function sanitizeHslString(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim().slice(0, 64);
  if (!trimmed) return fallback;
  // Permitimos dígitos, espaços, pontos, vírgulas e o sinal de %.
  if (!/^[\d\s.%,-]+$/.test(trimmed)) return fallback;
  return trimmed;
}

export function effectiveClubTheme(club) {
  const stored = (club && typeof club.theme === 'object' && club.theme) || {};
  const result = {};
  CLUB_THEME_FIELDS.forEach((field) => {
    result[field.key] = sanitizeHslString(stored[field.key], field.defaultHsl);
  });
  return result;
}

/**
 * Constrói o objeto `style` que sobrescreve variáveis CSS no escopo do
 * elemento. Cada campo vira `--<key>: <hsl>`. Usar como:
 *   <div style={themeVars}>...</div>
 *
 * Variáveis não informadas são omitidas (cai no default do `:root`).
 */
export function buildClubThemeStyle(theme) {
  const out = {};
  const eff = theme && typeof theme === 'object' ? theme : DEFAULT_CLUB_THEME;
  Object.entries(CSS_VAR_FOR_FIELD).forEach(([fieldKey, cssVar]) => {
    const value = sanitizeHslString(eff[fieldKey], DEFAULT_CLUB_THEME[fieldKey]);
    out[cssVar] = value;
  });
  return out;
}

/**
 * Normalizador do input do color-picker para gravar no Firestore.
 * Mantém apenas os 5 campos conhecidos, com strings HSL válidas
 * (default aplicado quando vazio/inválido).
 */
export function normalizeClubThemeInput(input = {}) {
  const out = {};
  CLUB_THEME_FIELDS.forEach((field) => {
    out[field.key] = sanitizeHslString(input[field.key], field.defaultHsl);
  });
  return out;
}
