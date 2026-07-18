/**
 * @fileoverview PublicMuralFeed — feed PÚBLICO agregado de posts do mural
 * (TASK-156).
 *
 * Mostra posts de várias comunidades em uma timeline unificada.
 * - Visitante vê tudo (read-only)
 * - Logado: CTA "Curtir/Comentar" leva a login se comunidade privada
 * - Filtros: comunidade
 *
 * Rota: /mural
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Heart, MessageCircle, User, MapPin,
  Filter, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/user-avatar';
import PageHero from '@/components/PageHero';
import { listPublicMuralPosts } from '@/modules/communities/services/publicMuralService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseTimestamp } from '@/core/utils/timestamp';

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

function PostCard({ post }) {
  return (
    <section className="hover:shadow-md transition-shadow" data-testid={`post-${post.id}`}>
      <div className="arena-section-card-body p-4 space-y-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            photoUrl={post.author_photo}
            name={post.author_name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">
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
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                {post.community_name || 'Comunidade'}
              </Link>
            )}
          </div>
        </div>

        {post.text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {post.text}
          </p>
        )}

        {post.attachments && post.attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {post.attachments.slice(0, 6).map((att, idx) => (
              <img
                key={idx}
                src={att.url}
                alt={att.alt || 'Anexo'}
                className="w-full h-32 object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {post.likes_count || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comments_count || 0}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function PublicMuralFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicMuralPosts({ max: 50 })
      .then((data) => {
        if (!cancelled) {
          setPosts(data);
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

  const filtered = useMemo(() => {
    if (!searchQuery) return posts;
    const lower = searchQuery.toLowerCase();
    return posts.filter((p) => {
      return (
        (p.text || '').toLowerCase().includes(lower) ||
        (p.author_name || '').toLowerCase().includes(lower) ||
        (p.community_name || '').toLowerCase().includes(lower)
      );
    });
  }, [posts, searchQuery]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHero
        title="Mural da Comunidade"
        subtitle="Veja o que está acontecendo nas comunidades. Cada post é de um abrigo/comunidade parceiro."
        icon={MessageSquare}
        kicker="COMUNIDADES"
      />

      <section className="arena-section-card">
        <div className="arena-section-card-body p-4 space-y-3">
          <div>
            <Label htmlFor="search">Buscar posts</Label>
            <Input
              id="search"
              placeholder="Ex: adoção, evento, mutirão..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} encontrado{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

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
          title="Nenhum post no mural"
          description="Tente outra busca ou visite uma comunidade específica."
          action={
            <Button asChild>
              <Link to="/comunidades">Ver comunidades</Link>
            </Button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <section className="arena-section-card bg-blue-50/50 border-blue-200">
        <div className="arena-section-card-body p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 mt-1 shrink-0" />
            <div className="text-sm">
              <h2 className="font-semibold text-blue-900 mb-1">
                Quer participar de uma comunidade?
              </h2>
              <p className="text-blue-800 text-xs mb-3">
                Entre em uma comunidade para postar, comentar e interagir
                com outros membros. É gratuito.
              </p>
              <Button asChild size="sm">
                <Link to="/comunidades">Ver comunidades</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
