import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getCommunityPosts, createPost, deletePost } from '../services/communityService';
import { formatDistanceToNow } from 'date-fns';
import { hasCommunityPermission } from '../domain/permissions';
import { COMMUNITY_PERMISSION } from '../domain/constants';

import { ptBR } from 'date-fns/locale';

export default function MuralTab({ communityId, isMember, isAdmin, membership, community }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const data = await getCommunityPosts(communityId);
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [communityId]);

  const handlePost = async () => {
    if (!newPostText.trim()) return;
    setSubmitting(true);
    try {
      await createPost(communityId, user.uid, newPostText);
      setNewPostText('');
      fetchPosts();
      toast.success('Publicado!');
    } catch (e) {
      toast.error('Erro ao publicar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Deseja excluir este post?')) return;
    try {
      await deletePost(postId, user.uid);
      fetchPosts();
      toast.success('Post excluído');
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

    const canPost = hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.FEED);
  const canDelete = (postId, authorId) => user?.uid === authorId || isAdmin;

  return (
    <div className="space-y-6">
      {canPost && (
        <div className="bg-card border border-border p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
          <Textarea 
            placeholder="O que você quer compartilhar com a comunidade?"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            className="border-none focus-visible:ring-0 resize-none min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button onClick={handlePost} disabled={submitting || !newPostText.trim()} size="sm">
              <Send className="w-4 h-4 mr-2" /> Publicar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            Nenhum post no mural ainda.
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <UserAvatarFallback />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Usuário Anônimo</p>
                    <p className="text-xs text-muted-foreground">
                      {post.created_at ? formatDistanceToNow(post.created_at.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
                    </p>
                  </div>
                </div>
                {canDelete(post.id, post.author_id) && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {post.text}
              </p>
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                  <Heart className="w-4 h-4" /> {post.likes_count || 0}
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-4 h-4" /> {post.comments_count || 0}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UserAvatarFallback() {
  return <span className="text-xs font-bold">U</span>;
}
