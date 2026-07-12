/**
 * @fileoverview Domínio: validação Zod de conteúdo de comunidade
 * (TASK-198, gap Regra A Eixo 3).
 *
 * Todos os inputs mutáveis do mural e do fórum (post, comentário,
 * thread, mensagem) passam por estes schemas ANTES de tocar o
 * Firestore. Limites de tamanho evitam docs gigantes (custo/abuso) e
 * garantem mensagem de erro amigável em PT-BR em vez de rejeição
 * silenciosa nas Firestore rules.
 */

import { z } from 'zod';

/** Texto livre obrigatório de post/comentário/mensagem. */
export const contentTextSchema = z
  .string({ required_error: 'Escreva um texto.' })
  .trim()
  .min(1, 'Escreva um texto.')
  .max(10000, 'Texto muito longo (máximo 10.000 caracteres).');

/** Título de tópico do fórum. */
export const threadTitleSchema = z
  .string({ required_error: 'Informe um título.' })
  .trim()
  .min(3, 'Título muito curto (mínimo 3 caracteres).')
  .max(200, 'Título muito longo (máximo 200 caracteres).');

/**
 * Anexo já hospedado no Storage (a UI faz o upload antes). Aceitamos
 * apenas URLs http(s) — nunca data: URIs (bloat) nem javascript: (XSS).
 */
export const attachmentSchema = z.object({
  url: z
    .string()
    .url('Anexo com URL inválida.')
    .refine((u) => /^https?:\/\//i.test(u), 'Anexo deve ser um link http(s).'),
  type: z.string().max(100).optional(),
  name: z.string().max(300).optional(),
}).passthrough();

export const attachmentsSchema = z
  .array(attachmentSchema)
  .max(10, 'Máximo de 10 anexos.')
  .default([]);

/** Enquete opcional em thread/mensagem do fórum. */
export const pollSchema = z
  .object({
    question: z.string().trim().min(1, 'Enquete precisa de pergunta.').max(300),
    options: z
      .array(z.string().trim().min(1).max(120))
      .min(2, 'Enquete precisa de pelo menos 2 opções.')
      .max(10, 'Enquete aceita no máximo 10 opções.'),
  })
  .passthrough()
  .nullable();

export const postInputSchema = z.object({
  text: contentTextSchema,
  attachments: attachmentsSchema,
});

export const commentInputSchema = z.object({
  text: contentTextSchema,
});

export const threadInputSchema = z.object({
  title: threadTitleSchema,
  text: contentTextSchema,
  attachments: attachmentsSchema,
  poll: pollSchema.default(null),
});

export const threadMessageInputSchema = z.object({
  text: contentTextSchema,
  attachments: attachmentsSchema,
  poll: pollSchema.default(null),
});

/**
 * Parse com erro amigável: lança `Error` com a primeira mensagem do
 * ZodError (as UIs do mural/fórum exibem `err.message` em toast).
 */
export function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Conteúdo inválido.');
  }
  return result.data;
}
