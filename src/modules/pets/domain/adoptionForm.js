/**
 * @fileoverview Domínio puro do formulário de doação/adoção montado na própria
 * plataforma. Sem React nem Firebase — só a lógica de definição do formulário
 * (campos criados pelo responsável do pet) e de validação das respostas do
 * adotante. É o que dá confiança sem ambiente de execução (ver ARCHITECTURE.md).
 *
 * A definição vive no documento do pet (`pets/{id}.adoption_form`) e as
 * respostas no documento de interesse (`adoption_interests/{id}.form_answers`).
 */

/** Tipos de campo suportados pelo construtor de formulário. */
export const FIELD_TYPES = ['short_text', 'long_text', 'yes_no', 'single_choice'];

export const FIELD_TYPE_LABELS = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  yes_no: 'Sim / Não',
  single_choice: 'Escolha única',
};

export const FORM_LIMITS = {
  MAX_FIELDS: 15,
  LABEL_MAX: 140,
  OPTION_MAX: 80,
  MAX_OPTIONS: 8,
  ANSWER_MAX: 1000,
};

const YES_NO_OPTIONS = ['Sim', 'Não'];

/** Gera um id curto e estável para um campo novo. */
export function makeFieldId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `f_${Date.now().toString(36)}_${rand}`;
}

/** Cria um campo vazio de um dado tipo, pronto para edição no builder. */
export function createField(type = 'short_text') {
  const safeType = FIELD_TYPES.includes(type) ? type : 'short_text';
  return {
    id: makeFieldId(),
    type: safeType,
    label: '',
    required: false,
    options: safeType === 'single_choice' ? ['', ''] : [],
  };
}

/**
 * Normaliza (sanitiza) a definição de um formulário antes de gravar: descarta
 * campos sem rótulo, apara textos, limita quantidades e garante que campos de
 * escolha tenham opções válidas. Retorna sempre `{ fields: [...] }`.
 */
export function normalizeForm(form) {
  const rawFields = Array.isArray(form?.fields) ? form.fields : [];
  const fields = [];

  for (const raw of rawFields) {
    if (fields.length >= FORM_LIMITS.MAX_FIELDS) break;
    const type = FIELD_TYPES.includes(raw?.type) ? raw.type : 'short_text';
    const label = String(raw?.label ?? '').trim().slice(0, FORM_LIMITS.LABEL_MAX);
    if (!label) continue;

    const field = {
      id: raw?.id ? String(raw.id) : makeFieldId(),
      type,
      label,
      required: Boolean(raw?.required),
    };

    if (type === 'single_choice') {
      const options = (Array.isArray(raw?.options) ? raw.options : [])
        .map((o) => String(o ?? '').trim().slice(0, FORM_LIMITS.OPTION_MAX))
        .filter(Boolean)
        .slice(0, FORM_LIMITS.MAX_OPTIONS);
      // Escolha única sem pelo menos duas opções não faz sentido — descarta.
      if (options.length < 2) continue;
      field.options = options;
    } else if (type === 'yes_no') {
      field.options = [...YES_NO_OPTIONS];
    }

    fields.push(field);
  }

  return { fields };
}

/** Indica se um formulário tem ao menos uma pergunta utilizável. */
export function hasQuestions(form) {
  return normalizeForm(form).fields.length > 0;
}

/** Opções apresentáveis ao adotante para um campo (yes_no ou single_choice). */
export function fieldOptions(field) {
  if (field?.type === 'yes_no') return [...YES_NO_OPTIONS];
  if (field?.type === 'single_choice') return Array.isArray(field.options) ? field.options : [];
  return [];
}

/**
 * Valida as respostas de um adotante contra a definição do formulário.
 * @returns {{ valid: boolean, errors: Record<string,string>, answers: Record<string,string> }}
 */
export function validateAnswers(form, answers = {}) {
  const { fields } = normalizeForm(form);
  const errors = {};
  const clean = {};

  for (const field of fields) {
    const raw = answers?.[field.id];
    const value = typeof raw === 'string' ? raw.trim().slice(0, FORM_LIMITS.ANSWER_MAX) : '';

    if (!value) {
      if (field.required) errors[field.id] = 'Campo obrigatório';
      continue;
    }

    if (field.type === 'yes_no' || field.type === 'single_choice') {
      const allowed = fieldOptions(field);
      if (!allowed.includes(value)) {
        errors[field.id] = 'Selecione uma das opções';
        continue;
      }
    }

    clean[field.id] = value;
  }

  return { valid: Object.keys(errors).length === 0, errors, answers: clean };
}

/**
 * Casa a definição do formulário com as respostas gravadas para exibição
 * (ex.: painel de interessados). Perguntas sem resposta aparecem com '—'.
 * @returns {{ id: string, label: string, value: string }[]}
 */
export function summarizeAnswers(form, answers = {}) {
  const { fields } = normalizeForm(form);
  return fields.map((field) => {
    const raw = answers?.[field.id];
    const value = typeof raw === 'string' && raw.trim() ? raw.trim() : '—';
    return { id: field.id, label: field.label, value };
  });
}
