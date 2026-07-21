/**
 * Cloud Function: inferPetColumns (TASK-022)
 *
 * Endpoint LLM-assistido para inferir mapeamento de colunas quando a
 * heurística local tem confiança < threshold. Chamada via fetch() pelo
 * `smartInferColumns` no frontend.
 *
 * Provider: Claude (Anthropic) — configurável via env `ANTHROPIC_API_KEY`.
 * Modelo padrão: claude-3-5-haiku-20241022 (rápido, barato, suficiente
 * para inferência de schema).
 *
 * AUTENTICAÇÃO: callable v2 com IAM explícito (regra do projeto).
 * AUTORIZAÇÃO: qualquer user autenticado pode chamar (não toca dados).
 *
 * Setup:
 *   1. Set ANTHROPIC_API_KEY no .env (NÃO commit).
 *   2. Set IAM: gcloud functions add-invoker-policy-binding ...
 *   3. Deploy: firebase deploy --only functions:inferPetColumns
 *
 * Custo: ~$0.0008 por chamada (input 2k tokens, output 200 tokens).
 *
 * IMPORTANTE: sem a key configurada, retorna 503. Frontend faz fallback
 * para heurística (smartInferColumns já trata isso).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022';
const MAX_TOKENS = 1024;

function buildPrompt({ headers, sample, canonicalFields }) {
  return `Você é um parser de planilhas de abrigos de animais.
Recebe os cabeçalhos e 5 primeiras linhas de uma planilha. Sua tarefa é
inferir qual coluna da planilha corresponde a qual campo canônico do
schema de Pet do Viralata.app.

CAMPOS CANÔNICOS DISPONÍVEIS:
${canonicalFields.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}

CABEÇALHOS DA PLANILHA (em ordem):
${headers.map((h, i) => `  ${i + 1}. "${h}"`).join('\n')}

AMOSTRA DE DADOS (5 primeiras linhas):
${JSON.stringify(sample, null, 2)}

REGRAS:
- Cada cabeçalho DEVE ser mapeado para UM campo canônico ou null.
- Use evidência do CONTEÚDO das células, não só do nome da coluna.
- Se a coluna não tem equivalente claro, retorne null no campo canonical.
- Confidence: 0..1 (1 = match óbvio, 0.5 = incerto, 0 = sem match).

RESPONDA APENAS com JSON válido no formato:
{
  "mapping": [
    { "original": "<header>", "canonical": "<field ou null>", "confidence": <0..1> }
  ]
}

Nada além do JSON. Sem markdown, sem texto explicativo.`;
}

export const inferPetColumns = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login obrigatório.');
    }
    const { headers, sample, canonicalFields } = request.data || {};
    if (!Array.isArray(headers) || !Array.isArray(sample) || !Array.isArray(canonicalFields)) {
      throw new HttpsError('invalid-argument', 'headers, sample e canonicalFields são obrigatórios.');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY não configurada nesta function.');
    }

    const prompt = buildPrompt({ headers, sample, canonicalFields });

    let response;
    try {
      response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch (err) {
      throw new HttpsError('unavailable', `LLM network error: ${err.message}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new HttpsError('internal', `LLM returned ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (!text) {
      throw new HttpsError('internal', 'LLM não retornou texto.');
    }

    // Parsear JSON do LLM (modelos às vezes retornam com markdown fence)
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new HttpsError('internal', `LLM retornou JSON inválido: ${err.message}`);
    }
    if (!parsed.mapping || !Array.isArray(parsed.mapping)) {
      throw new HttpsError('internal', 'LLM não retornou mapping[].');
    }
    return parsed;
  }
);
