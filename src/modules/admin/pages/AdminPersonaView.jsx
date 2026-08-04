/**
 * @fileoverview AdminPersonaView — visão agregada de personas (V4).
 *
 * D-PERSONA-ADMIN-OVERRIDE (Q7, Q9): admin master pode ver TUDO
 * de todas as personas sem precisar ser membro.
 *
 * Esta página mostra:
 *  - Stats de personas ativas (quantos users em cada)
 *  - Usuários com 2+ personas
 *  - Voluntários no pool (Q26)
 *  - Pets órfãos (Q21)
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Users, Heart, AlertCircle, Search, Loader2 } from 'lucide-react';
import { db } from '@/core/config/firebase';
import PageHero from '@/components/PageHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { logger } from '@/core/lib/logger';

export function AdminPersonaView() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_PLATFORM_ADMIN);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [orphanPets, setOrphanPets] = useState([]);
  const [volunteerPoolCount, setVolunteerPoolCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!v4Enabled) return;
    if (!userProfile?.role === 'platform_admin') return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        // 1. Todos os users (admin master pode ler)
        const usersSnap = await getDocs(collection(db, 'users'));
        if (cancelled) return;
        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(allUsers);

        // 2. Pets órfãos (owner_type='user' + user desativado ou sem perfil)
        // Heurística simples: pets com owner_id que não está em users
        const petsSnap = await getDocs(
          query(collection(db, 'pets'), where('owner_type', '==', 'user')),
        );
        const userIds = new Set(allUsers.map((u) => u.id));
        const orphans = petsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => !userIds.has(p.owner_id));
        setOrphanPets(orphans);

        // 3. Voluntários no pool (não vinculados a abrigo)
        const poolSnap = await getDocs(
          collection(db, 'volunteer_pool'),
        ).catch(() => null);
        if (poolSnap) {
          setVolunteerPoolCount(poolSnap.size);
        }
      } catch (err) {
        logger.error('[AdminPersonaView] load failed:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [v4Enabled, userProfile?.role]);

  if (!v4Enabled) {
    navigate('/admin', { replace: true });
    return null;
  }

  if (userProfile?.role !== 'platform_admin') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center">
        <p className="text-muted-foreground">
          Esta página é exclusiva do admin master.
        </p>
        <Button onClick={() => navigate('/admin')} className="mt-4">
          Voltar ao admin
        </Button>
      </div>
    );
  }

  // Stats
  const totalUsers = users.length;
  const multiPersona = users.filter((u) => Array.isArray(u.personas_enabled) && u.personas_enabled.length >= 2).length;
  const activeAdopter = users.filter((u) => u.active_persona === 'adopter' || u.active_persona?.startsWith('adopter:')).length;
  const activeDonor = users.filter((u) => u.active_persona === 'donor' || u.active_persona?.startsWith('donor:')).length;
  const activeShelter = users.filter((u) => u.active_persona?.startsWith('shelter_staff:')).length;
  const activeCommunity = users.filter((u) => u.active_persona?.startsWith('community_staff:')).length;
  const activeVolunteer = users.filter((u) => u.active_persona?.startsWith('volunteer:')).length;

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || u.platform_name || u.email || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:py-8" data-testid="admin-persona-view">
      <PageHero
        title="Visão geral de personas"
        subtitle="Estatísticas de personas ativas e pool de voluntários."
        icon={Users}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Estatísticas de personas">
            <StatCard label="Usuários" value={totalUsers} icon={Users} color="bg-card" />
            <StatCard label="Multi-persona" value={multiPersona} icon={Users} color="bg-violet-50" />
            <StatCard label="Pool de voluntários" value={volunteerPoolCount} icon={Heart} color="bg-rose-50" />
            <StatCard label="Pets órfãos" value={orphanPets.length} icon={AlertCircle} color="bg-amber-50" />
          </section>

          {/* Breakdown por persona ativa */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-label="Breakdown por persona ativa">
            <h2 className="text-sm font-bold uppercase text-muted-foreground">
              Personas ativas
            </h2>
            <div className="mt-3 space-y-2">
              <PersonaRow label="Adotante" value={activeAdopter} total={totalUsers} color="bg-rose-100" />
              <PersonaRow label="Doador" value={activeDonor} total={totalUsers} color="bg-amber-100" />
              <PersonaRow label="Membro de abrigo" value={activeShelter} total={totalUsers} color="bg-emerald-100" />
              <PersonaRow label="Membro de comunidade" value={activeCommunity} total={totalUsers} color="bg-sky-100" />
              <PersonaRow label="Voluntário" value={activeVolunteer} total={totalUsers} color="bg-violet-100" />
            </div>
          </section>

          {/* Pets órfãos */}
          {orphanPets.length > 0 && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-label="Pets órfãos">
              <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                Pets órfãos ({orphanPets.length})
              </h2>
              <p className="mt-1 text-xs text-amber-800">
                Pets cadastrados por usuários que desativaram a conta.
                Estão ocultos no feed público. Você pode reativá-los ou
                excluí-los.
              </p>
              <ul className="mt-3 space-y-2">
                {orphanPets.slice(0, 20).map((p) => (
                  <li key={p.id} className="rounded-lg border border-amber-200 bg-white p-2 text-sm">
                    <span className="font-semibold">{p.title || p.name || 'Sem nome'}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      #{p.pet_code || p.pet_seq} · owner_id: {p.owner_id}
                    </span>
                  </li>
                ))}
              </ul>
              {orphanPets.length > 20 && (
                <p className="mt-2 text-xs text-amber-800">
                  Mostrando 20 de {orphanPets.length}.
                </p>
              )}
            </section>
          )}

          {/* Lista de usuários */}
          <section className="mt-6" aria-label="Lista de usuários">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Usuários</h2>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou email"
                  className="pl-9"
                />
              </div>
            </div>
            <ul className="mt-3 space-y-2" data-testid="admin-persona-user-list">
              {filtered.slice(0, 50).map((u) => (
                <li
                  key={u.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {u.full_name || u.platform_name || u.email || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium">
                        {u.active_persona || '—'}
                      </span>
                      {Array.isArray(u.personas_enabled) && (
                        <span className="text-xs text-muted-foreground">
                          {u.personas_enabled.length} personas
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {filtered.length > 50 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando 50 de {filtered.length}.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`rounded-xl ${color} p-4`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function PersonaRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${color}`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default AdminPersonaView;
