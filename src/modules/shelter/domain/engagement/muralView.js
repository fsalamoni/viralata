/**
 * Helpers PUROS de visualização do Mural V2 (ROADMAP · Fase 4).
 *
 * Sem Firestore, sem React — apenas transformação de dados para a UI e para
 * a view pública. Cobrem: derivação de estado efetivo (agendado→publicado
 * quando a hora chega, legado→publicado), visibilidade pública, ordenação
 * (fixados primeiro), busca/filtro, moderação de comentários e analytics.
 *
 * Regra de compatibilidade: um post SEM `status` é tratado como `published`
 * (é assim que todos os posts atuais se comportam). Isso garante que, com a
 * flag OFF (nenhum `status` gravado), a derivação nunca esconde nada.
 */

import { POST_STATUS } from './mural.js';

/** Epoch ms de criação do post (tolera timestamps ausentes). */
function createdMs(post) {
  return Number(post?.created_at_ms) || 0;
}

/**
 * Estado EFETIVO do post no instante `now`:
 *  - sem `status` → `published` (compatibilidade com posts legados);
 *  - `scheduled` cujo `scheduled_for` já passou → `published`;
 *  - demais → o próprio `status`.
 */
export function derivePostStatus(post, now = Date.now()) {
  const status = post?.status;
  if (!status) return POST_STATUS.PUBLISHED;
  if (status === POST_STATUS.SCHEDULED) {
    const at = Number(post?.scheduled_for) || 0;
    return at && at <= now ? POST_STATUS.PUBLISHED : POST_STATUS.SCHEDULED;
  }
  return status;
}

/** true se o post está visível ao público (estado efetivo = publicado). */
export function isPostPublic(post, now = Date.now()) {
  return derivePostStatus(post, now) === POST_STATUS.PUBLISHED;
}

export function isPostDraft(post, now = Date.now()) {
  return derivePostStatus(post, now) === POST_STATUS.DRAFT;
}

export function isPostScheduled(post, now = Date.now()) {
  return derivePostStatus(post, now) === POST_STATUS.SCHEDULED;
}

export function isPostArchived(post, now = Date.now()) {
  return derivePostStatus(post, now) === POST_STATUS.ARCHIVED;
}

/** true se o post está fixado (pinned). */
export function isPinned(post) {
  return post?.pinned === true;
}

/** Lista de tags do post (sempre array). */
export function postTags(post) {
  return Array.isArray(post?.tags) ? post.tags : [];
}

/**
 * Ordena posts para exibição: fixados primeiro (mais recente fixado no topo),
 * depois por data de criação desc. Não muta o array recebido.
 */
export function sortMuralPosts(posts, now = Date.now()) {
  void now;
  return [...(posts || [])].sort((a, b) => {
    const pinDiff = (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0);
    if (pinDiff !== 0) return pinDiff;
    if (isPinned(a) && isPinned(b)) {
      const pa = Number(a.pinned_at) || createdMs(a);
      const pb = Number(b.pinned_at) || createdMs(b);
      if (pb !== pa) return pb - pa;
    }
    return createdMs(b) - createdMs(a);
  });
}

/** true se o termo de busca casa com título, conteúdo ou tags do post. */
export function postMatchesSearch(post, term) {
  const q = String(term ?? '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    post?.title,
    post?.content,
    ...(postTags(post)),
    ...((Array.isArray(post?.mentions) ? post.mentions : []).map((m) => m?.name)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Filtra posts para o painel admin.
 *  - `status`: 'all' (padrão) ou um POST_STATUS (usa o estado EFETIVO).
 *  - `search`: casa título/conteúdo/tags/menções.
 *  - `tags`: array — post precisa conter TODAS as tags pedidas.
 */
export function filterMuralPosts(posts, filters = {}, now = Date.now()) {
  const { status = 'all', search = '', tags = [] } = filters;
  const wantTags = (Array.isArray(tags) ? tags : []).map((t) => String(t).toLowerCase());
  return (posts || []).filter((post) => {
    if (status !== 'all' && derivePostStatus(post, now) !== status) return false;
    if (!postMatchesSearch(post, search)) return false;
    if (wantTags.length) {
      const has = new Set(postTags(post).map((t) => String(t).toLowerCase()));
      if (!wantTags.every((t) => has.has(t))) return false;
    }
    return true;
  });
}

/** Só os posts públicos (para a view pública), já ordenados. */
export function publicMuralPosts(posts, now = Date.now()) {
  return sortMuralPosts((posts || []).filter((p) => isPostPublic(p, now)), now);
}

/** Conjunto de todas as tags presentes nos posts (ordenado). */
export function collectTags(posts) {
  const set = new Set();
  for (const post of posts || []) {
    for (const t of postTags(post)) set.add(String(t).toLowerCase());
  }
  return [...set].sort();
}

/* ============================== Moderação ============================== */

/** IDs de comentários ocultados pela moderação (sempre array). */
export function hiddenCommentIds(post) {
  const ids = post?.moderation?.hidden_comment_ids;
  return Array.isArray(ids) ? ids : [];
}

/** true se o comentário foi ocultado pela moderação. */
export function isCommentHidden(post, commentId) {
  return hiddenCommentIds(post).includes(commentId);
}

/** Comentários visíveis ao público (remove os ocultados pela moderação). */
export function visiblePublicComments(comments, post) {
  const hidden = new Set(hiddenCommentIds(post));
  return (comments || []).filter((c) => !hidden.has(c?.id));
}

/* ============================== Analytics ============================== */

function likeCount(post) {
  return Number(post?.likes_count) || 0;
}

function commentCount(post) {
  return Number(post?.comments_count) || 0;
}

/**
 * Agrega métricas do mural. Considera apenas posts com estado efetivo
 * `published` para curtidas/comentários/engajamento (o que o público vê),
 * mas conta rascunhos/agendados/arquivados separadamente para o admin.
 *
 * Retorna `topPosts` (até 5) ordenados por engajamento (curtidas+comentários).
 */
export function computeMuralAnalytics(posts, now = Date.now()) {
  const list = posts || [];
  let published = 0;
  let drafts = 0;
  let scheduled = 0;
  let archived = 0;
  let pinned = 0;
  let likes = 0;
  let comments = 0;

  const publishedPosts = [];
  for (const post of list) {
    const st = derivePostStatus(post, now);
    if (st === POST_STATUS.PUBLISHED) {
      published += 1;
      likes += likeCount(post);
      comments += commentCount(post);
      publishedPosts.push(post);
    } else if (st === POST_STATUS.DRAFT) {
      drafts += 1;
    } else if (st === POST_STATUS.SCHEDULED) {
      scheduled += 1;
    } else if (st === POST_STATUS.ARCHIVED) {
      archived += 1;
    }
    if (isPinned(post)) pinned += 1;
  }

  const engagement = likes + comments;
  const topPosts = [...publishedPosts]
    .sort((a, b) => (likeCount(b) + commentCount(b)) - (likeCount(a) + commentCount(a)))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title || '',
      likes: likeCount(p),
      comments: commentCount(p),
      engagement: likeCount(p) + commentCount(p),
    }));

  return {
    total: list.length,
    published,
    drafts,
    scheduled,
    archived,
    pinned,
    likes,
    comments,
    engagement,
    avgEngagement: published ? Math.round((engagement / published) * 10) / 10 : 0,
    topPosts,
  };
}
