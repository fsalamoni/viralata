/**
 * @fileoverview PublicMuralFeed V3 — feed público do mural (DS-V2).
 *
 * TASK-V3-MURAL: redesign completo do /mural seguindo DS-V2.
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente rose→amber
 *  - 3 stat cards (posts/comunidades/curtidas)
 *  - Filtros: busca + comunidade
 *  - Posts em grid responsivo (1 coluna mobile, 2 desktop)
 *  - Cards com: avatar, autor, comunidade badge, texto, attachments, ações
 *  - Empty states diferenciados
 *  - Trending topics (top 5 tags)
 *  - CTA final para entrar em comunidade
 *  - Auth guard para ações (like/comment)
 *
 * Rota: /mural
 *
 * @see docs/REGENCY_MURAL_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Heart, MessageCircle, Search, Filter, Sparkles,
  TrendingUp, Users, Hash, ChevronRight, X, Calendar, MapPin,
  ArrowRight, Image as ImageIcon, Smile, ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listPublicMuralPosts } from '@/modules/communities/services/publicMuralService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseTimestamp } from '@/core/utils/timestamp';
import { cn } from '@/core/lib/utils';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// UTILS
// ============================================================================

function formatRelative(iso) {
  if (!iso) return '';
  let d = iso;
  if (typeof iso !== 'object' || !iso.toDate) {
    d = parseTimestamp(iso);
  } else if (iso.toDate) {
    d = iso.toDate();
  } else {
    d = new Date(iso);
  }
  if (!d || Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[\wÀ-ÿ]+/g);
  return matches ? matches.slice(0, 5) : [];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, accent }) {
  const colorMap = {
    primary: 'text-primary',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    sky: 'text-sky-600',
  };
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn('mt-1 text-2xl font-extrabold sm:text-3xl', colorMap[accent])}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
            accent === 'primary' && 'bg-primary/10',
            accent === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            accent === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
            accent === 'sky' && 'bg-sky-100 dark:bg-sky-900/30',
          )}
        >
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', colorMap[accent])} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({ post, reduce }) {
  const tags = useMemo(() => extractHashtags(post.text), [post.text]);
  const hasMedia = post.attachments && post.attachments.length > 0;

  return (
    <motion.article
      variants={ANIM}
      className="group rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
      data-testid={`post-${post.id}`}
    >
      <div className="space-y-3 p-4 sm:p-5">
        {/* Header: avatar + autor + comunidade */}
        <div className="flex items-start gap-3">
          <UserAvatar
            photoUrl={post.author_photo}
            name={post.author_name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {post.author_name || 'Membro'}
              </p>
              <span className="text-xs text-muted-foreground">·</span>
              <p className="text-xs text-muted-foreground">
                {formatRelative(post.created_at)}
              </p>
            </div>
            {post.community_id && (
              <Link
                to={`/comunidades/${post.community_id}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {post.community_name || 'Comunidade'}
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {/* Texto */}
        {post.text && (
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground/90">
            {post.text}
          </p>
        )}

        {/* Tags (hashtags) */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-primary/10 text-primary text-[10.5px] font-medium"
              >
                <Hash className="mr-0.5 h-3 w-3" aria-hidden="true" />
                {tag.replace('#', '')}
              </Badge>
            ))}
          </div>
        )}

        {/* Anexos (imagens) */}
        {hasMedia && (
          <div className={cn(
            'grid gap-1.5 overflow-hidden rounded-xl border border-border',
            post.attachments.length === 1 ? 'grid-cols-1' :
            post.attachments.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
          )}>
            {post.attachments.slice(0, 6).map((att, idx) => (
              <div
                key={idx}
                className="relative aspect-square overflow-hidden bg-muted"
              >
                <img
                  src={att.url}
                  alt={att.alt || 'Anexo'}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {idx === 5 && post.attachments.length > 6 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                    +{post.attachments.length - 6}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer: ações */}
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              {post.likes_count || 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {post.comments_count || 0}
            </span>
            {post.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {post.location}
              </span>
            )}
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to={post.community_id ? `/comunidades/${post.community_id}` : '/comunidades'}>
              Ver
              <ChevronRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function MuralSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="mt-3 h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function PublicMuralFeedV3() {
  const reduce = useReducedMotion();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommunity, setActiveCommunity] = useState(null);

  // Load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicMuralPosts({ max: 100 })
      .then((data) => {
        if (!cancelled) {
          setPosts(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Communities
  const communities = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => {
      if (p.community_id && !map.has(p.community_id)) {
        map.set(p.community_id, {
          id: p.community_id,
          name: p.community_name || 'Comunidade',
          count: 0,
        });
      }
      if (p.community_id) {
        map.get(p.community_id).count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [posts]);

  // Stats
  const stats = useMemo(() => {
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
    return {
      totalPosts,
      totalCommunities: communities.length,
      totalLikes,
      totalComments,
    };
  }, [posts, communities]);

  // Trending hashtags
  const trending = useMemo(() => {
    const tagCount = new Map();
    posts.forEach((p) => {
      extractHashtags(p.text).forEach((tag) => {
        const clean = tag.replace('#', '').toLowerCase();
        tagCount.set(clean, (tagCount.get(clean) || 0) + 1);
      });
    });
    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  // Filtered
  const filtered = useMemo(() => {
    let list = posts;
    if (activeCommunity) {
      list = list.filter((p) => p.community_id === activeCommunity);
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      list = list.filter((p) => {
        return (
          (p.text || '').toLowerCase().includes(lower) ||
          (p.author_name || '').toLowerCase().includes(lower) ||
          (p.community_name || '').toLowerCase().includes(lower)
        );
      });
    }
    return list;
  }, [posts, searchQuery, activeCommunity]);

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="mural-page">
      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-600 to-amber-600 p-6 text-white shadow-lg sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Mural público
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              Acompanhe o que está acontecendo
            </motion.h1>
            <motion.p
              variants={ANIM}
              className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
            >
              Veja em tempo real o que as comunidades, abrigos e voluntários
              estão compartilhando — eventos, mutirões, histórias e novidades.
            </motion.p>
            <motion.div variants={ANIM} className="mt-5 flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="border-0 bg-white text-rose-700 hover:bg-white/90">
                <Link to="/comunidades">
                  <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Explorar comunidades
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              {!isAuthenticated && (
                <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
                  <Link to="/login?redirect=/comunidades">
                    Entrar para postar
                  </Link>
                </Button>
              )}
            </motion.div>
          </div>

          <motion.div
            variants={ANIM}
            className="hidden lg:flex lg:flex-col lg:gap-2"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <MessageSquare className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">{stats.totalPosts}</p>
                  <p className="text-xs text-white/80">posts públicos</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.totalCommunities}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">comunidades</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.totalLikes}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">curtidas</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* STATS mobile */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-3 gap-3 lg:hidden"
      >
        <StatCard icon={MessageSquare} value={stats.totalPosts} label="Posts" accent="primary" />
        <StatCard icon={Users} value={stats.totalCommunities} label="Comunidades" accent="rose" />
        <StatCard icon={Heart} value={stats.totalLikes} label="Curtidas" accent="amber" />
      </motion.section>

      {/* FILTROS + TRENDING */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* Filtro principal */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Label htmlFor="mural-search" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Search className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              Buscar
            </Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="mural-search"
                placeholder="Adoção, evento, mutirão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            {communities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCommunity(null)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    activeCommunity === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <Filter className="h-3 w-3" aria-hidden="true" />
                  Todas
                  <span className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    activeCommunity === null ? 'bg-white/20' : 'bg-muted'
                  )}>
                    {posts.length}
                  </span>
                </button>
                {communities.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCommunity(c.id === activeCommunity ? null : c.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      activeCommunity === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {c.name}
                    <span className={cn(
                      'rounded-full px-1.5 text-[10px]',
                      activeCommunity === c.id ? 'bg-white/20' : 'bg-muted'
                    )}>
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {filtered.length === 1 ? '1 post encontrado' : `${filtered.length} posts encontrados`}
              {activeCommunity && ' nesta comunidade'}
            </p>
          </div>
        </div>

        {/* Trending */}
        <aside>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Em alta
            </h3>
            {trending.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma tag em alta no momento.
              </p>
            ) : (
              <ul className="space-y-2">
                {trending.map(([tag, count], i) => (
                  <li key={tag} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery(`#${tag}`)}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
                    >
                      <span className="text-xs text-muted-foreground">{i + 1}.</span>
                      <Hash className="h-3 w-3 text-primary" aria-hidden="true" />
                      {tag}
                    </button>
                    <Badge variant="secondary" className="text-[10.5px]">
                      {count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Quer participar?</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Entre em uma comunidade para postar, curtir e comentar.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                    <Link to="/comunidades">
                      Ver comunidades
                      <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </motion.section>

      {/* LISTA DE POSTS */}
      {loading && <MuralSkeleton />}

      {!loading && error && (
        <EmptyState
          icon={MessageSquare}
          title="Erro ao carregar mural"
          description={error}
        />
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title={activeCommunity || searchQuery ? 'Nenhum post encontrado' : 'Mural vazio'}
          description={
            activeCommunity || searchQuery
              ? 'Tente outro filtro ou busca.'
              : 'As comunidades ainda não postaram. Volte mais tarde!'
          }
          action={
            <Button asChild>
              <Link to="/comunidades">
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                Ver comunidades
              </Link>
            </Button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <motion.section
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} reduce={reduce} />
          ))}
        </motion.section>
      )}

      {/* CTA FINAL */}
      {!loading && !error && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 p-6 text-center sm:p-10 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-rose-950/20"
        >
          <Smile className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            Sua comunidade também pode participar
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
            Você tem um abrigo, organização ou grupo? Crie uma comunidade
            gratuitamente e compartilhe seu trabalho com o Brasil inteiro.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="lg">
              <Link to="/comunidades">
                Explorar comunidades
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/comunidade/criar">
                Criar comunidade
              </Link>
            </Button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
