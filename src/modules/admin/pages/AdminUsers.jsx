import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listAllUsers, banUser, unbanUser } from '../services/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ShieldOff, ShieldCheck } from 'lucide-react';

export default function AdminUsers() {
  const { user, isPlatformAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    listAllUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  async function handleBan(target) {
    const reason = window.prompt(`Motivo do banimento de ${target.full_name || target.email}:`, '');
    if (reason === null) return;
    try {
      await banUser(target.id, reason, user);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, banned: true, banned_reason: reason } : u)));
      toast.success('Usuário banido.');
    } catch (e) {
      toast.error('Erro ao banir usuário.');
    }
  }

  async function handleUnban(target) {
    if (!confirm(`Remover o banimento de ${target.full_name || target.email}?`)) return;
    try {
      await unbanUser(target.id, user);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, banned: false, banned_reason: null } : u)));
      toast.success('Banimento removido.');
    } catch (e) {
      toast.error('Erro ao remover banimento.');
    }
  }

  if (!isPlatformAdmin) return null;

  return (
    <div className="arena-page max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
      <Input
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {loading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={u.photo_url} />
                <AvatarFallback>{(u.full_name || u.email || '?')[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{u.full_name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {u.role === 'platform_admin' && <Badge className="bg-highlight/20 text-[hsl(30,60%,32%)] text-xs">Admin</Badge>}
                  {u.banned && <Badge variant="destructive" className="text-xs">Banido{u.banned_reason ? `: ${u.banned_reason}` : ''}</Badge>}
                </div>
              </div>
              {u.role !== 'platform_admin' && (
                u.banned ? (
                  <Button size="sm" variant="outline" onClick={() => handleUnban(u)}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Desbanir
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleBan(u)}>
                    <ShieldOff className="w-3.5 h-3.5 mr-1" /> Banir
                  </Button>
                )
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>}
        </div>
      )}
    </div>
  );
}
