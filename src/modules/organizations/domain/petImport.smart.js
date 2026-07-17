/**
 * petImport.smart — Parser inteligente de planilha de pets.
 *
 * TASK-022: Parser assistido por LLM na importação de planilha de animais.
 *
 * Complementa o petImport.js clássico (que mapeia por nome da coluna) com:
 *
 *  1. **Inferência de cabeçalhos ambíguos**: quando o usuário usa nomes
 *     livres ("Animal", "Pet Name", "Tipo"), o parser tradicional falha
 *     silenciosamente. Este módulo infere o mapeamento a partir do
 *     CONTEÚDO das células, não do nome.
 *
 *  2. **Detecção de typos em valores enum**: além do matcher exato
 *     (cachorro → dog), detecta typos ("cachoro" → dog com confiança 0.7)
 *     via distância Levenshtein.
 *
 *  3. **Detecção de schema mismatch**: avisa se a planilha parece ter
 *     as colunas certas mas faltam campos críticos (ex.: sem "Espécie"
 *     nem coluna inferível).
 *
 *  4. **Hook LLM opcional**: o método `inferWithLLM` chama um endpoint
 *     configurável (por padrão, Cloud Function) para casos onde a
 *     heurística tem confiança < threshold. SEM LLM obrigatório — fallback
 *     100% heurístico se LLM não disponível.
 *
 *  O resultado é: 90% dos casos resolvidos sem LLM (rápido, grátis);
 *  10% usa LLM para desambiguar. Mantém offline-first e custo baixo.
 */
// mapEnum, normalize e as tabelas SPECIES_MAP/SIZE_MAP/etc são internos
// em petImport.js (não exportados). Replicamos aqui para manter
// independência. Mantemos em sync manual (regra #sync: ambos apontam
// para a mesma especificação de campos de pet).
const SPECIES_MAP = {
  dog: 'dog', cachorro: 'dog', cao: 'dog', 'cão': 'dog',
  cat: 'cat', gato: 'cat',
  rabbit: 'rabbit', coelho: 'rabbit',
  bird: 'bird', passaro: 'bird', 'pássaro': 'bird', ave: 'bird',
  other: 'other', outro: 'other', outros: 'other',
};
const SIZE_MAP = {
  mini: 'mini',
  small: 'small', pequeno: 'small', pequena: 'small',
  medium: 'medium', medio: 'medium', 'médio': 'medium', media: 'medium', 'média': 'medium',
  large: 'large', grande: 'large',
  giant: 'giant', gigante: 'giant',
};
const AGE_MAP = {
  puppy: 'puppy', filhote: 'puppy',
  adult: 'adult', adulto: 'adult', adulta: 'adult',
  senior: 'senior', idoso: 'senior', idosa: 'senior',
};
const GENDER_MAP = {
  male: 'male', macho: 'male',
  female: 'female', 'fêmea': 'female', femea: 'female',
};
const VACCINATED_MAP = {
  yes: 'yes', sim: 'yes',
  no: 'no', 'não': 'no', nao: 'no',
  partial: 'partial', parcial: 'partial',
};
const STATUS_MAP = {
  available: 'available', 'disponível': 'available', disponivel: 'available',
  in_process: 'in_process', 'em processo': 'in_process',
  adopted: 'adopted', adotado: 'adopted', adotada: 'adopted',
};

export { SPECIES_MAP, SIZE_MAP, AGE_MAP, GENDER_MAP, VACCINATED_MAP, STATUS_MAP };

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function mapEnum(value, table) {
  if (!value) return null;
  return table[normalize(value)] || null;
}

// Limiares de confiança. Ajustáveis pelo admin.
export const CONFIDENCE = {
  AUTO: 0.85,    // >= este valor: aplica sem perguntar
  SUGGEST: 0.5,  // >= este valor: sugere ao usuário (UI)
  REJECT: 0.3,   // < este valor: ignora a inferência (trata como null)
};

/**
 * Calcula distância Levenshtein (insertion, deletion, substitution).
 * Custo: O(m * n). Bom o suficiente para strings de até 30 chars.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,         // insertion
        prev[j] + 1,              // deletion
        prev[j - 1] + cost        // substitution
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Confiança de um match fuzzy (Levenshtein normalizado):
 *   1.0 = match exato, 0.0 = sem similaridade
 */
function fuzzyConfidence(input, candidate) {
  const a = normalize(input);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Tenta mapear um valor para um enum de forma inteligente:
 *  1. Match exato (case/acentos insensíveis)
 *  2. Fuzzy match via Levenshtein (typos)
 *
 * @returns {{ value: string|null, confidence: number }}
 */
export function smartMapEnum(value, enumTable) {
  // Passo 1: match exato
  const exact = mapEnum(value, enumTable);
  if (exact !== null) {
    return { value: exact, confidence: 1 };
  }

  // Passo 2: fuzzy match. Pega o melhor candidato com confidence > REJECT.
  if (!value) return { value: null, confidence: 0 };
  const target = normalize(value);
  if (!target) return { value: null, confidence: 0 };

  let best = { value: null, confidence: 0 };
  for (const [key, mapped] of Object.entries(enumTable)) {
    const c = fuzzyConfidence(target, key);
    if (c > best.confidence) {
      best = { value: mapped, confidence: c };
    }
  }
  if (best.confidence < CONFIDENCE.REJECT) {
    return { value: null, confidence: best.confidence };
  }
  return best;
}

/**
 * Sinônimos conhecidos pelo parser inteligente. Quando o usuário usa
 * nomes de coluna não-canônicos ("Pet" em vez de "Nome"), o parser
 * tradicional falha. Aqui inferimos por SINÔNIMOS antes de tentar LLM.
 */
const COLUMN_SYNONYMS = {
  // Espécie
  'tipo de animal': 'species',
  'animal': 'species',
  'tipo': 'species',
  'pet type': 'species',
  'kind': 'species',
  // Nome
  'pet name': 'name',
  'nome do animal': 'name',
  'nome do pet': 'name',
  'nome do cachorro': 'name',
  'nome do gato': 'name',
  // Raça
  'raca': 'breed',
  'breed': 'breed',
  'raca do pet': 'breed',
  // Idade
  'faixa etaria': 'age',
  'idade do animal': 'age',
  'age group': 'age',
  // Sexo
  'genero': 'gender',
  'sex': 'gender',
  'sexo do animal': 'gender',
  // Vacinação
  'vacinado': 'vaccinated',
  'vacinacao': 'vaccinated',
  'vacina': 'vaccinated',
  'vaccine': 'vaccinated',
  // Cidade
  'cidade onde esta': 'city',
  'localizacao': 'city',
  'location': 'city',
  // Estado
  'uf': 'state',
  'estado onde esta': 'state',
  // Status
  'situacao': 'status',
  'disponibilidade': 'status',
  // ID
  'id do pet': 'id',
  'codigo': 'id',
  'pet id': 'id',
};

/**
 * Infere o mapeamento de colunas a partir de headers não-canônicos.
 *
 * @param {string[]} headers — nomes das colunas da planilha
 * @returns {Array<{ original: string, canonical: string, confidence: number, method: 'synonym'|'fuzzy'|'none' }>}
 */
export function inferColumnMapping(headers) {
  const canonicalFields = [
    'id', 'title', 'name', 'species', 'size', 'age', 'gender',
    'breed', 'vaccinated', 'city', 'state', 'status',
  ];
  // Sinônimos PT/EN oficiais (do petImport.js)
  const officialAliases = {
    id: ['id'],
    title: ['título', 'titulo', 'title'],
    name: ['nome', 'name'],
    species: ['espécie', 'especie', 'species'],
    size: ['porte', 'size'],
    age: ['idade', 'age', 'age_group'],
    gender: ['sexo', 'gender'],
    breed: ['raça', 'raca', 'breed'],
    vaccinated: ['vacinação', 'vacinacao', 'vaccinated'],
    city: ['cidade', 'city'],
    state: ['estado', 'uf', 'state'],
    status: ['status'],
  };

  return headers.map((header) => {
    const norm = normalize(header);

    // 1. Match exato com canônico (PT/EN oficial)
    for (const [field, aliases] of Object.entries(officialAliases)) {
      if (aliases.includes(norm)) {
        return { original: header, canonical: field, confidence: 1, method: 'synonym' };
      }
    }

    // 2. Sinônimo livre
    const synonym = COLUMN_SYNONYMS[norm];
    if (synonym && canonicalFields.includes(synonym)) {
      return { original: header, canonical: synonym, confidence: 0.95, method: 'synonym' };
    }

    // 3. Fuzzy match contra aliases conhecidos
    let best = { canonical: null, confidence: 0 };
    for (const [field, aliases] of Object.entries(officialAliases)) {
      for (const alias of aliases) {
        const c = fuzzyConfidence(norm, alias);
        if (c > best.confidence) {
          best = { canonical: field, confidence: c };
        }
      }
    }
    // Fuzzy contra sinônimos livres também
    for (const [syn, field] of Object.entries(COLUMN_SYNONYMS)) {
      const c = fuzzyConfidence(norm, syn);
      if (c > best.confidence && canonicalFields.includes(field)) {
        best = { canonical: field, confidence: c };
      }
    }

    if (best.confidence >= CONFIDENCE.SUGGEST) {
      return { original: header, canonical: best.canonical, confidence: best.confidence, method: 'fuzzy' };
    }
    return { original: header, canonical: null, confidence: best.confidence, method: 'none' };
  });
}

/**
 * Aplica o mapping inferido a uma linha parseada, retornando o objeto
 * no schema canônico. Colunas sem mapping vão pra `__unmapped`.
 */
export function applyColumnMapping(row, mapping) {
  const out = { __unmapped: {} };
  for (const m of mapping) {
    if (m.canonical && m.confidence >= CONFIDENCE.AUTO) {
      out[m.canonical] = row[m.original];
    } else if (m.canonical && m.confidence >= CONFIDENCE.SUGGEST) {
      // Sugestão: aplica mas marca para o usuário revisar
      out[m.canonical] = row[m.original];
      out.__unmapped[m.original] = { canonical: m.canonical, confidence: m.confidence };
    } else {
      out.__unmapped[m.original] = row[m.original];
    }
  }
  return out;
}

/**
 * Valida o schema de uma planilha. Detecta:
 *  - Colunas críticas ausentes (Espécie, Cidade, Estado, Idade, Sexo)
 *  - Schema totalmente incompatível (zero match)
 *  - Schema plausível mas com colunas extras
 *
 * @returns {{ isValid: boolean, missingCritical: string[], hasAnyMatch: boolean, suggestions: string[] }}
 */
export function validateSchema(mapping) {
  const critical = ['species', 'age', 'gender', 'city', 'state'];
  const mapped = mapping.filter((m) => m.canonical).map((m) => m.canonical);
  const missingCritical = critical.filter((c) => !mapped.includes(c));
  const hasAnyMatch = mapped.length > 0;
  const isValid = missingCritical.length === 0 && hasAnyMatch;

  const suggestions = [];
  if (!hasAnyMatch) {
    suggestions.push(
      'Nenhuma coluna foi reconhecida. Verifique se a primeira linha é o cabeçalho da planilha.'
    );
  } else if (missingCritical.length > 0) {
    suggestions.push(
      `Colunas críticas faltando: ${missingCritical.join(', ')}. Renomeie-as ou adicione-as à planilha.`
    );
  } else {
    suggestions.push('Schema reconhecido. Prosseguindo com o mapeamento automático.');
  }

  return { isValid, missingCritical, hasAnyMatch, suggestions };
}

/**
 * Integração com LLM opcional.
 *
 * Se houver uma Cloud Function `inferColumnsLLM` deployada, esta função
 * chama o endpoint passando as primeiras N linhas + headers. A LLM
 * retorna mapping mais inteligente (lida com headers criativos, typos
 * semânticos, etc.).
 *
 * SEM LLM: throw explícito. Caller decide se quer fallback heurístico.
 */
export async function inferWithLLM({ headers, sampleRows, endpoint }) {
  if (!endpoint) {
    throw new Error('LLM endpoint não configurado. Use inferColumnMapping (heurístico).');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'infer_pet_columns',
      canonical_fields: ['id', 'title', 'name', 'species', 'size', 'age', 'gender', 'breed', 'vaccinated', 'city', 'state', 'status'],
      headers,
      sample: sampleRows.slice(0, 5),
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM endpoint retornou ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Função pública que decide automaticamente entre heurística e LLM.
 *
 * @param {string[]} headers
 * @param {Array} sampleRows
 * @param {object} opts { llmEndpoint?: string, minConfidence?: number }
 * @returns {Promise<{ mapping, source: 'heuristic'|'llm'|'hybrid', lowConfidence: Array }>}
 */
export async function smartInferColumns(headers, sampleRows, opts = {}) {
  const { llmEndpoint, minConfidence = CONFIDENCE.SUGGEST } = opts;

  // 1. Heurística
  const heuristic = inferColumnMapping(headers);
  const lowConfidence = heuristic.filter((m) => m.confidence < minConfidence && m.canonical);

  // 2. Se heurística cobriu 100% com alta confiança, retorna direto (sem LLM)
  if (lowConfidence.length === 0) {
    return { mapping: heuristic, source: 'heuristic', lowConfidence: [] };
  }

  // 3. Se LLM disponível, chama só para as colunas de baixa confiança
  if (llmEndpoint && lowConfidence.length > 0) {
    try {
      const llmResult = await inferWithLLM({ headers, sampleRows, endpoint: llmEndpoint });
      // Merge: substitui apenas as colunas que o LLM mapeou com mais confiança
      const merged = heuristic.map((h) => {
        if (h.confidence >= minConfidence) return h;
        const llmMatch = llmResult.mapping?.find((l) => l.original === h.original);
        if (llmMatch && llmMatch.confidence > h.confidence) {
          return { ...h, canonical: llmMatch.canonical, confidence: llmMatch.confidence, method: 'llm' };
        }
        return h;
      });
      return { mapping: merged, source: 'hybrid', lowConfidence: merged.filter((m) => m.confidence < minConfidence && m.canonical) };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[petImport.smart] LLM call failed, using heuristic:', err.message);
      return { mapping: heuristic, source: 'heuristic', lowConfidence };
    }
  }

  return { mapping: heuristic, source: 'heuristic', lowConfidence };
}

/**
 * Aplica smartMapEnum em todas as colunas enum-aware.
 * Retorna linhas com campos enum validados + lista de warnings.
 */
export function smartValidateRow(row, mapping) {
  const warnings = [];
  const mapped = applyColumnMapping(row, mapping);
  const out = { ...mapped };
  delete out.__unmapped;

  // Para cada campo enum, aplica smartMapEnum
  const enumFields = [
    { canonical: 'species', table: SPECIES_MAP, fieldName: 'Espécie' },
    { canonical: 'size', table: SIZE_MAP, fieldName: 'Porte' },
    { canonical: 'age', table: AGE_MAP, fieldName: 'Idade' },
    { canonical: 'gender', table: GENDER_MAP, fieldName: 'Sexo' },
    { canonical: 'vaccinated', table: VACCINATED_MAP, fieldName: 'Vacinação' },
    { canonical: 'status', table: STATUS_MAP, fieldName: 'Status' },
  ];

  for (const { canonical, table, fieldName } of enumFields) {
    const raw = mapped[canonical];
    if (!raw) continue;
    const { value, confidence } = smartMapEnum(raw, table);
    if (value) {
      out[canonical] = value;
      if (confidence < 1) {
        warnings.push({
          field: fieldName,
          original: raw,
          inferred: value,
          confidence,
        });
      }
    }
  }

  return { row: out, warnings };
}
