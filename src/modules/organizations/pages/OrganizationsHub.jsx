import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useClubs, useMyClubs } from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, CLUB_ROLE_LABELS } from '@/modules/organizations/domain/constants';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

/**
 * Hub de gestão de organizações (`/organizacoes`): "Minhas organizações"
 * (onde o usuário é administrador — abre o painel de administração) e
 * "Descobrir outras organizações" (as demais — abre o perfil público em
 * `/comunidade/:id`). O diretório público completo, com busca, continua em
 * `ClubsDirectory` (`/comunidade`).
 */
export default function OrganizationsHub() {
  const { data: allClubs = [], isLoading: loadingAll } = useClubs();
  const { data: myClubs = [], isLoading: loadingMine } = useMyClubs();

  const myAdminClubs = useMemo(
    () => myClubs.filter((c) => c.my_role === CLUB_ROLE.ADMIN),
    [myClubs],
  );
  const myClubIds = useMemo(() => new Set(myClubs.map((c) => c.id)), [myClubs]);
  const discoverClubs = useMemo(
    () => allClubs.filter((c) => !myClubIds.has(c.id)).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')),
    [allClubs, myClubIds],
  );

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-8 px-5 py-6 pb-12')}>
      <PageHero
        eyebrow="Abrigos"
        title="Administre suas organizações em um só lugar"
        description="Acesse animais, equipe, mural, doações e finanças com o mesmo padrão visual das páginas públicas da plataforma."
        actions={(
          <Button asChild size="sm" className="border-0 bg-white text-foreground hover:bg-secondary">
            <Link to="/organizacoes/criar"><Plus className="mr-1.5 h-4 w-4" /> Cadastrar organização</Link>
          </Button>
        )}
      />

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Minha gestão</div>
          <h2 className="mt-2 text-[22px] font-semibold text-foreground">Minhas organizações</h2>
        </div>
        {loadingMine ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
          </div>
        ) : myAdminClubs.length === 0 ? (
          <section className="arena-section-card rounded-[1.5rem] border-dashed">
            <div className="arena-section-card-body p-8 text-center text-sm text-muted-foreground">
              Você ainda não administra nenhuma organização. Cadastre a sua ou peça acesso a uma existente.
            </div>
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myAdminClubs.map((club) => (
              <Link key={club.id} to={`/organizacoes/${club.id}/admin`} className="block h-full">
                <section className="arena-section-card match-surface h-full rounded-[1.5rem]">
                  <div className="arena-section-card-body flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      {club.logo_url ? (
                        <img src={club.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-primary/10 object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{club.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{club.city || 'Cidade não informada'}</div>
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {CLUB_ROLE_LABELS[club.my_role] || club.my_role}
                    </span>
                    <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-foreground">
                      Abrir gestão <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </section>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Comunidade</div>
          <h2 className="mt-2 text-[22px] font-semibold text-foreground">Descobrir outras organizações</h2>
        </div>
        {loadingAll ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[1.25rem]" />)}
          </div>
        ) : discoverClubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma outra organização na plataforma ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {discoverClubs.map((club) => (
              <Link key={club.id} to={`/comunidade/${club.id}`} className="block">
                <section className="arena-section-card rounded-[1.25rem]">
                  <div className="arena-section-card-body flex items-center gap-3 p-4">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-primary/10 object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{club.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{club.city || 'Cidade não informada'}</div>
                    </div>
                  </div>
                </section>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
