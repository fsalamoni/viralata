/**
 * Importação/exportação em massa de animais de uma organização (aba
 * "Animais" do painel de administração).
 *
 * Formato aceito: .xlsx, .csv ou .json com o cabeçalho da planilha modelo
 * (`buildPetImportWorkbook`). Aceita também os rótulos em português dos
 * campos de enum (ex.: "Cachorro" além de "dog") para reduzir fricção de
 * quem preenche a planilha manualmente.
 *
 * Dedup: a coluna "ID" é o campo-chave — quando preenchida e correspondente
 * a um pet já cadastrado por esta organização, a linha vira candidata a
 * duplicata (o usuário decide manter ou substituir); do contrário é uma
 * inserção nova.
 */

export const PET_IMPORT_HEADERS = [
  'ID', 'Título', 'Nome', 'Espécie', 'Porte', 'Idade', 'Sexo', 'Raça', 'Vacinação', 'Cidade', 'Estado', 'Status',
];

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

/** Lê o valor de uma linha tolerando variações de cabeçalho (PT/EN, com/sem acento). */
function readField(row, ...aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalize(alias);
    const key = keys.find((k) => normalize(k) === target);
    if (key !== undefined && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

/**
 * Gera o workbook (SheetJS) da planilha modelo: aba de dados com o
 * cabeçalho esperado + aba de referência com os valores aceitos por coluna
 * de enum (o SheetJS Community Edition não escreve dropdowns nativos de
 * validação de dados, então a referência serve como guia para quem preenche).
 */
export function buildPetImportWorkbook(XLSX, existingPets = []) {
  const dataRows = existingPets.map((pet) => ([
    pet.id, pet.title || '', pet.name || '', pet.species || '', pet.size || '',
    pet.age_group || '', pet.gender || '', pet.breed || '', pet.vaccinated || '',
    pet.city || '', pet.state || '', pet.status || '',
  ]));
  const sheet = XLSX.utils.aoa_to_sheet([PET_IMPORT_HEADERS, ...dataRows]);
  sheet['!cols'] = PET_IMPORT_HEADERS.map(() => ({ wch: 16 }));

  const reference = XLSX.utils.aoa_to_sheet([
    ['Coluna', 'Valores aceitos'],
    ['Espécie', 'Cachorro, Gato, Coelho, Pássaro, Outro'],
    ['Porte', 'Mini, Pequeno, Médio, Grande, Gigante'],
    ['Idade', 'Filhote, Adulto, Idoso'],
    ['Sexo', 'Macho, Fêmea'],
    ['Vacinação', 'Sim, Parcial, Não'],
    ['Status', 'Disponível, Em processo, Adotado'],
    ['ID', 'Deixe em branco para cadastrar um animal novo. Preencha com o ID de um animal já cadastrado para atualizá-lo.'],
  ]);
  reference['!cols'] = [{ wch: 14 }, { wch: 60 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Animais');
  XLSX.utils.book_append_sheet(workbook, reference, 'Valores permitidos');
  return workbook;
}

/**
 * Parser de CSV dependency-free (suporta campos entre aspas com vírgula/
 * quebra de linha e aspas escapadas `""`). Evitado deliberadamente via
 * SheetJS aqui: `.csv`/`.json` são os formatos mais prováveis de edição
 * manual, então lidar com eles sem a lib reduz a superfície exposta ao CVE
 * de prototype pollution do SheetJS (GHSA-4r6h-8v6p-xvw6), que só é
 * necessário para `.xlsx` de fato (sem alternativa razoável para esse
 * formato binário).
 */
function parseCsv(text) {
  // Cada linha guarda o número da linha física em que começa no arquivo
  // original (`line`), preservado mesmo depois do filtro de linhas em
  // branco abaixo — sem isso, uma linha em branco entre o cabeçalho e os
  // dados desalinha a numeração de erro ("Linha N") do arquivo real.
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push({ line: rowStartLine, cells: row }); row = []; rowStartLine = line; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else {
        if (c === '\n') line += 1;
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushField();
      pushRow();
      line += 1;
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  const filtered = rows.filter((r) => r.cells.some((v) => String(v).trim() !== ''));
  if (filtered.length === 0) return [];
  const header = filtered[0].cells;
  return filtered.slice(1).map((r) => {
    const obj = { __sourceLine: r.line };
    header.forEach((h, idx) => { obj[h] = r.cells[idx] ?? ''; });
    return obj;
  });
}

/**
 * Lê um arquivo de importação (.xlsx/.csv/.json) e retorna as linhas brutas
 * como uma lista de objetos `{ coluna: valor }`. `.xlsx` é o único formato
 * que passa pelo SheetJS (necessário para ler o binário); `.csv`/`.json`
 * usam parsers próprios, sem dependência externa.
 */
export async function readImportFile(file, XLSX) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.json')) {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Não foi possível interpretar o arquivo JSON.');
    }
    if (!Array.isArray(data)) throw new Error('O arquivo JSON deve conter uma lista de animais.');
    return data;
  }
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Valida e mapeia as linhas brutas (já parseadas do arquivo) para o schema
 * de `pets`, comparando com os animais já cadastrados pela organização.
 * @returns {{ toInsert: Array, duplicates: Array, errors: Array }}
 */
export function validateAndMapRows(rawRows, existingPets = []) {
  const existingById = new Map(existingPets.map((p) => [p.id, p]));
  const toInsert = [];
  const duplicates = [];
  const errors = [];

  rawRows.forEach((raw, index) => {
    // `__sourceLine` (só presente em linhas vindas do parser de CSV) aponta
    // para a linha real do arquivo; sem ela (JSON/XLSX), cai para o cálculo
    // por índice de sempre.
    const rowNum = raw.__sourceLine ?? (index + 2); // +1 cabeçalho, +1 índice 1-based
    const id = readField(raw, 'ID', 'id');
    const title = readField(raw, 'Título', 'Titulo', 'title');
    const name = readField(raw, 'Nome', 'name');
    const speciesRaw = readField(raw, 'Espécie', 'Especie', 'species');
    const sizeRaw = readField(raw, 'Porte', 'size');
    const ageRaw = readField(raw, 'Idade', 'age', 'age_group');
    const genderRaw = readField(raw, 'Sexo', 'gender');
    const breed = readField(raw, 'Raça', 'Raca', 'breed');
    const vaccinatedRaw = readField(raw, 'Vacinação', 'Vacinacao', 'vaccinated');
    const city = readField(raw, 'Cidade', 'city');
    const state = readField(raw, 'Estado', 'UF', 'state');
    const statusRaw = readField(raw, 'Status', 'status');

    const rowErrors = [];
    if (!title) rowErrors.push({ field: 'Título', message: 'Campo obrigatório.' });
    const species = mapEnum(speciesRaw, SPECIES_MAP);
    if (!species) rowErrors.push({ field: 'Espécie', message: `Valor inválido: "${speciesRaw}".` });
    const size = mapEnum(sizeRaw, SIZE_MAP);
    if (!size) rowErrors.push({ field: 'Porte', message: `Valor inválido: "${sizeRaw}".` });
    const ageGroup = mapEnum(ageRaw, AGE_MAP);
    if (!ageGroup) rowErrors.push({ field: 'Idade', message: `Valor inválido: "${ageRaw}".` });
    const gender = mapEnum(genderRaw, GENDER_MAP);
    if (!gender) rowErrors.push({ field: 'Sexo', message: `Valor inválido: "${genderRaw}".` });
    const vaccinated = mapEnum(vaccinatedRaw, VACCINATED_MAP);
    if (!vaccinated) rowErrors.push({ field: 'Vacinação', message: `Valor inválido: "${vaccinatedRaw}".` });
    if (!city) rowErrors.push({ field: 'Cidade', message: 'Campo obrigatório.' });
    if (!state) rowErrors.push({ field: 'Estado', message: 'Campo obrigatório.' });
    const status = statusRaw ? mapEnum(statusRaw, STATUS_MAP) : 'available';
    if (statusRaw && !status) rowErrors.push({ field: 'Status', message: `Valor inválido: "${statusRaw}".` });

    if (rowErrors.length > 0) {
      rowErrors.forEach((e) => errors.push({ row: rowNum, field: e.field, message: e.message }));
      return;
    }

    const petData = {
      title, name, species, size, age_group: ageGroup, gender, breed,
      vaccinated, city, state, status: status || 'available',
    };

    const existing = id ? existingById.get(id) : null;
    if (existing) {
      duplicates.push({ row: rowNum, id, name: title || name || existing.title, petData, action: 'keep' });
    } else {
      toInsert.push({ row: rowNum, petData });
    }
  });

  return { toInsert, duplicates, errors };
}
