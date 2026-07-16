/**
 * @fileoverview Painel admin master: gerenciamento de platform_admins
 * (Fase 21). Apenas o dono fixo da plataforma pode acessar.
 *
 * - Lista todos os platform_admins.
 * - Permite promover user → admin e rebaixar admin → user.
 * - Bloqueia self-demote (regra de segurança).
 * - Tudo é logado no audit log (imutável).
 *
 * Rota: /admin/admins
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listPlatformAdmins,
  promoteToAdmin,
  demoteFromAdmin,
  isPlatformOwnerEmail,
  PLATFORM_OWNER_EMAIL,
} from '../services/adminUsersService';
import { listAllUsers } from '../services/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, ShieldAlert, Lock } from 'lucide-react';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { confirmDialog } from '@/components/ui/confirm-provider';

export default function AdminUsers() {
  const { user, isPlatformAdmin, userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-4 py-6');

  const isOwner = isPlatformOwnerEmail(user?.email) || userProfile?.email === PLATFORM_OWNER_EMAIL;

  useEffect(() => {
    if (!isPlatformAdmin) return;
    void loadAll();
  }, [isPlatformAdmin]);

  async function loadAll() {
    setLoading(true);
    try {
      const [adminsList, usersList] = await Promise.all([
        listPlatformAdmins(),
        listAllUsers(),
      ]);
      setAdmins(adminsList);
      setUsers(usersList);
    } catch (err) {
      toast.error('Erro ao carregar: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(target) {
    if (!(await confirmDialog({ title: `Promover ${target.full_name || target.email} a platform_admin?` }))) return;
    setActing(target.id);
    try {
      const r = await promoteToAdmin(target.id, user);
      if (r.already) toast.info('Usuário já era platform_admin.');
      else toast.success('Promovido a platform_admin.');
      await loadAll();
    } catch (err) {
      toast.error('Erro: ' + (err?.message || err));
    } finally {
      setActing(null);
    }
  }

  async function handleDemote(target) {
    if (!(await confirmDialog({ title: `Rebaixar ${target.full_name || target.email} para user comum?` }))) return;
    setActing(target.id);
    try {
      const r = await demoteFromAdmin(target.id, user);
      if (r.self_demote_blocked) {
        toast.error('Você não pode se remover. Apenas outro platform_admin pode fazer isso.');
        return;
      }
      if (r.already) toast.info('Usuário já era user comum.');
      else toast.success('Rebaixado para user comum.');
      await loadAll();
    } catch (err) {
      toast.error('Erro: ' + (err?.message || err));
    } finally {
      setActing(null);
    }
  }

  if (!isPlatformAdmin) {
    return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;
  }

  const filteredAdmins = filterList(admins, search);
  const nonAdminCandidates = filterList(
    users.filter((u) => u.role !== 'platform_admin' && !u.banned),
    search,
  );

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Admins"
        title="Gerenciamento de Platform Admins"
        description="Promova ou rebaixe platform_admins. Apenas o dono fixo da plataforma pode delegar. O self-demote é bloqueado."
        actions={(
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-white/10 text-white placeholder:text-orange-100/60 border-white/20"
          />
        )}
      />

      {!isOwner && (
        <section className="arena-section-card border-amber-300/50 bg-amber-50">
          <div className="arena-section-card-body py-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">Modo somente leitura</p>
              <p className="text-amber-800/80">
                Apenas o dono fixo ({PLATFORM_OWNER_EMAIL}) pode promover ou rebaixar platform_admins.
                Você ainda vê a lista, mas as ações ficam desabilitadas.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Platform Admins atuais ({admins.length})</h3>
          <p className="arena-section-card-description">
            Admins com acesso a /admin. O self-demote está sempre bloqueado.
          </p>
        </div>
        <div className="arena-section-card-body space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filteredAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum platform_admin encontrado.
            </p>
          ) : (
            filteredAdmins.map((u) => (
              <AdminRow
                key={u.id}
                user={u}
                isSelf={u.id === user?.uid}
                isActing={acting === u.id}
                onDemote={() => handleDemote(u)}
                canAct={isOwner && u.id !== user?.uid}
              />
            ))
          )}
        </div>
      </section>

      {isOwner && (
        <section className="arena-section-card">
          <div className="arena-section-card-header">
            <h3 className="arena-section-card-title">Promover alguém a platform_admin</h3>
            <p className="arena-section-card-description">
              Candidatos: usuários ativos que ainda não são platform_admin.
            </p>
          </div>
          <div className="arena-section-card-body space-y-2">
            {nonAdminCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum candidato disponível.
              </p>
            ) : (
              nonAdminCandidates.slice(0, 25).map((u) => (
                <CandidateRow
                  key={u.id}
                  user={u}
                  isActing={acting === u.id}
                  onPromote={() => handlePromote(u)}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminRow({ user, isSelf, isActing, onDemote, canAct }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={user.photo_url} />
        <AvatarFallback>{(user.full_name || user.email || '?')[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {user.full_name || 'Sem nome'}
          {isSelf && <span className="text-xs text-muted-foreground ml-2">(você)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          <Badge className="bg-highlight/20 text-[hsl(30,60%,32%)] text-xs">Platform Admin</Badge>
          {isSelf && <Badge variant="secondary" className="text-xs">Self</Badge>}
        </div>
      </div>
      {canAct ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDemote}
          disabled={isActing}
        >
          <ShieldOff className="w-3.5 h-3.5 mr-1" />
          Rebaixar
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled>
          <Lock className="w-3.5 h-3.5 mr-1" /> {isSelf ? 'Não pode se remover' : 'Sem permissão'}
        </Button>
      )}
    </div>
  );
}

function CandidateRow({ user, isActing, onPromote }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60">
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarImage src={user.photo_url} />
        <AvatarFallback>{(user.full_name || user.email || '?')[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{user.full_name || 'Sem nome'}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onPromote}
        disabled={isActing}
      >
        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
        Promover
      </Button>
    </div>
  );
}

function filterList(list, search) {
  const term = (search || '').trim().toLowerCase();
  if (!term) return list;
  return list.filter(
    (u) => (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term),
  );
}
