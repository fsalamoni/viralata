/**
 * Tema visual por ONG.
 *
 * Cada organização pode customizar:
 *  - Cores principais (primary, highlight, accent)
 *  - Fundo da página e dos cards (background, card)
 *  - Cores do card da ONG na home (cover_from, cover_to, cover_name)
 *
 * O tema é armazenado como objeto dentro do documento da ONG
 * (`clubs.theme`) e aplicado na página via CSS variables inline num
 * wrapper, de modo que apenas o escopo da ONG seja afetado — outras
 * ONGs e o restante do app seguem com o tema padrão do `index.css`.
 *
 * Os valores são `H S% L%` no formato aceito pelo Tailwind
 * (`hsl(var(--x))`), sem a função `hsl()` e sem vírgulas —
 * ex.: `"17 72% 45%"`.
 *
 * Se um campo estiver ausente ou inválido, caímos no default (que vem
 * do `:root` em `index.css`). A função `effectiveClubTheme` aplica os
 * defaults para garantir que sempre tenhamos os campos válidos.
 */

export const CLUB_THEME_FIELDS = Object.freeze([
  { key: 'primary', label: 'Cor principal', hint: 'Botões primários, ações destacadas, badges.', defaultHsl: '17 72% 45%', section: 'principal' },
  { key: 'highlight', label: 'Cor de destaque', hint: 'Selos, gradientes e pontos de realce.', defaultHsl: '40 88% 54%', section: 'principal' },
  { key: 'accent', label: 'Cor de apoio', hint: 'Suaviza contrastes e auxilia em estados secundários.', defaultHsl: '86 30% 32%', section: 'principal' },
  { key: 'background', label: 'Fundo da página', hint: 'Cor de fundo principal da área da ONG.', defaultHsl: '38 45% 97%', section: 'superfície' },
  { key: 'card', label: 'Fundo dos cards', hint: 'Superfícies elevadas, caixas de conteúdo.', defaultHsl: '30 45% 99%', section: 'superfície' },
  { key: 'cover_from', label: 'Gradiente — cor inicial', hint: 'Cor de partida do gradiente do card da ONG.', defaultHsl: '20 90% 50%', section: 'card' },
  { key: 'cover_to', label: 'Gradiente — cor final', hint: 'Cor de chegada do gradiente do card da ONG.', defaultHsl: '350 80% 55%', section: 'card' },
  { key: 'cover_name', label: 'Cor do nome da ONG', hint: 'Cor do título da ONG no card da home.', defaultHsl: '0 0% 100%', section: 'card' },
]);

export const CLUB_THEME_SECTIONS = Object.freeze([
  { key: 'principal', title: 'Cores principais', description: 'Botões, destaques e elementos de interação.' },
  { key: 'superfície', title: 'Superfície', description: 'Fundo da página e dos cards.' },
  { key: 'card', title: 'Card da ONG', description: 'Cores do card colorido que aparece logo abaixo da barra superior.' },
]);

/** Tema padrão derivado dos campos acima + :root do `index.css`. */
export const DEFAULT_CLUB_THEME = Object.freeze(
  Object.fromEntries(CLUB_THEME_FIELDS.map((f) => [f.key, f.defaultHsl])),
);

/** Mapeamento de chave de campo → CSS variable exposta ao Tailwind/shadcn. */
const CSS_VAR_FOR_FIELD = Object.freeze({
  primary: '--primary',
  highlight: '--highlight',
  accent: '--accent',
  background: '--background',
  card: '--card',
  cover_from: '--cover-from',
  cover_to: '--cover-to',
  cover_name: '--cover-name',
});

/** Variáveis CSS adicionais derivadas das primárias (para gradientes
 *  e contrastes calculados em runtime). Mantidas no mesmo objeto
 *  retornado por `buildClubThemeStyle` para que o componente aplique
 *  tudo de uma vez. */
const DERIVED_VAR_BUILDERS = Object.freeze([
  {
    varName: '--cover-gradient',
    from: ['cover_from', 'cover_to'],
    fallback: 'linear-gradient(135deg, hsl(20 90% 50%) 0%, hsl(350 80% 55%) 100%)',
    build: (theme) => `linear-gradient(135deg, hsl(${theme.cover_from}) 0%, hsl(${theme.cover_to}) 100%)`,
  },
]);

/**
 * Sanitiza uma string HSL recebida do Firestore:
 *  - Trim e limit
 *  - Rejeita valores claramente inválidos (vazio, caracteres suspeitos)
 * Formato esperado: `"H S% L%"` ou `"H S L"` com `%` opcional.
 */
export function sanitizeHslString(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim().slice(0, 64);
  if (!trimmed) return fallback;
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
 * elemento. Cada campo vira `--<key>: <hsl>`. As variáveis derivadas
 * (`--cover-gradient`) são montadas em cima dos campos primários.
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
  DERIVED_VAR_BUILDERS.forEach((derived) => {
    out[derived.varName] = derived.build(eff);
  });
  return out;
}

/**
 * Normalizador do input do color-picker para gravar no Firestore.
 * Mantém apenas os campos conhecidos, com strings HSL válidas
 * (default aplicado quando vazio/inválido).
 */
export function normalizeClubThemeInput(input = {}) {
  const out = {};
  CLUB_THEME_FIELDS.forEach((field) => {
    out[field.key] = sanitizeHslString(input[field.key], field.defaultHsl);
  });
  return out;
}
