/**
 * @fileoverview CommunityPublic — página pública de comunidade com mural
 * read-only (TASK-156).
 *
 * Rota: `/comunidades/:slug` (público, sem auth)
 *
 * Mostra:
 *  - Capa + nome + descrição da comunidade
 *  - Mural de posts (read-only, MuralTab variant public)
 *  - "Faça login para comentar" CTA
 *  - Tabs: Mural / Sobre (read-only)
 *
 * Logado: aparece opção de entrar na comunidade.
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, MapPin, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import MuralTab from '@/modules/communities/components/MuralTab';

/**
 * Busca comunidade por slug OU id (público).
 * Para manter público, retorna apenas campos não-sensíveis.
 */
async function fetchCommunity(communityId) {
  if (!db) return null;
  try {
    const ref = doc(db, 'communities', communityId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    // Sanitize: só campos públicos
    return {
      id: snap.id,
      name: data.name,
      slug: data.slug || snap.id,
      description: data.description,
      cover_url: data.cover_url,
      member_count: data.member_count || 0,
      post_count: data.post_count || 0,
      status: data.status || 'public',
      location: data.location,
      created_at: data.created_at,
    };
  } catch (err) {
    return null;
  }
}

async function fetchPublicPosts(communityId) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'community_posts'),
      where('community_id', '==', communityId),
      orderBy('created_at', 'desc'),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return [];
  }
}

export default function CommunityPublic() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mural');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([fetchCommunity(slug), fetchPublicPosts(slug)])
      .then(([c, p]) => {
        setCommunity(c);
        setPosts(p);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Comunidade não encontrada.</p>
            <Link to="/comunidade" className="text-primary hover:underline">
              ← Ver todas as comunidades
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Capa */}
      <div className="relative h-48 bg-gradient-to-r from-primary/20 to-secondary/20 rounded">
        {community.cover_url && (
          <img
            src={community.cover_url}
            alt={community.name}
            className="absolute inset-0 w-full h-full object-cover rounded"
          />
        )}
        <div className="absolute bottom-0 left-0 p-4 bg-gradient-to-t from-black/60 to-transparent w-full">
          <h1 className="text-2xl font-bold text-white">{community.name}</h1>
          {community.location && (
            <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {community.location}
            </p>
          )}
        </div>
      </div>

      {/* Meta + CTA */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {community.member_count} membros
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> {community.post_count} posts
            </span>
            <Badge variant="outline">{community.status}</Badge>
          </div>
          {user ? (
            <Button asChild>
              <Link to={`/comunidade/${community.id}`}>Entrar</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/login">
                <Lock className="h-4 w-4 mr-1" /> Login para participar
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mural">Mural</TabsTrigger>
          <TabsTrigger value="sobre">Sobre</TabsTrigger>
        </TabsList>
        <TabsContent value="mural">
          <MuralTab communityId={community.id} variant="public" posts={posts} />
        </TabsContent>
        <TabsContent value="sobre">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a comunidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{community.description || 'Sem descrição.'}</p>
              {community.created_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Criada em {new Date(community.created_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
