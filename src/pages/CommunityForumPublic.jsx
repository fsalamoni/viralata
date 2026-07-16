/**
 * @fileoverview CommunityForumPublic — feed público de fórum (TASK-159).
 *
 * Rota: `/comunidades/:slug/forum` (público, read-only)
 *
 * Mostra threads do fórum da comunidade. Anônimos podem ler mas
 * precisam logar para responder. Logado: pode entrar na comunidade.
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Lock, Users, Eye, MessageSquare, Plus } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  doc, getDoc, collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';

async function fetchCommunity(slug) {
  if (!db) return null;
  try {
    const ref = doc(db, 'communities', slug);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      description: data.description,
      member_count: data.member_count || 0,
    };
  } catch {
    return null;
  }
}

async function fetchPublicThreads(communityId) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'community_forum_threads'),
      where('community_id', '==', communityId),
      orderBy('created_at', 'desc'),
      limit(30),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export default function CommunityForumPublic() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([fetchCommunity(slug), fetchPublicThreads(slug)])
      .then(([c, t]) => {
        setCommunity(c);
        setThreads(t);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto p-4">
        <section className="arena-section-card">
          <div className="arena-section-card-body p-6">
            <p className="text-muted-foreground">Comunidade não encontrada.</p>
            <Link to="/comunidade" className="text-primary hover:underline">
              ← Ver todas as comunidades
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to={`/comunidades/${community.id}`} className="text-sm text-muted-foreground hover:underline">
            ← {community.name}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" /> Fórum
          </h1>
          <p className="text-muted-foreground">
            Discussões públicas —{' '}
            <span className="text-foreground font-medium">{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        {user ? (
          <Button asChild>
            <Link to={`/comunidade/${community.id}/forum`}>
              <Plus className="h-4 w-4 mr-1" /> Nova thread
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/login">
              <Lock className="h-4 w-4 mr-1" /> Login para responder
            </Link>
          </Button>
        )}
      </div>

      {/* Lista de threads */}
      {threads.length === 0 ? (
        <section className="arena-section-card">
          <div className="arena-section-card-body p-6 text-muted-foreground text-center">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma thread ainda. Seja o primeiro a postar!</p>
          </div>
        </section>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/comunidades/${community.id}/forum/${thread.id}`}
              className="block"
            >
              <section className="arena-section-card hover:bg-muted/30 transition-colors">
                <div className="arena-section-card-header">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="arena-section-card-title">
                        {thread.title || '(sem título)'}
                      </h3>
                      <p className="arena-section-card-description">
                        {thread.body || thread.excerpt || 'Sem descrição.'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        por {thread.author_name || 'anônimo'} ·{' '}
                        {thread.created_at && new Date(thread.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {thread.replies_count || 0}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {thread.views_count || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </section>
            </Link>
          ))}
        </div>
      )}

      {/* Meta footer */}
      <section className="arena-section-card">
        <div className="arena-section-card-body p-3 text-xs text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {community.member_count} membros
          </span>
          <span>Read-only — login para participar</span>
        </div>
      </section>
    </div>
  );
}
