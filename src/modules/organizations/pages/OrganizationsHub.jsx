import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClubs, useMyClubs } from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, CLUB_ROLE_LABELS } from '@/modules/organizations/domain/constants';

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
    <div className="arena-page mx-auto max-w-5xl space-y-8 px-5 py-6 pb-12">
      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-100/70">Organizações</div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Administre suas organizações em um só lugar</h1>
            <p className="mt-3 text-sm leading-7 text-orange-50/82">
              Acesse animais, equipe, mural, doações e finanças com o mesmo padrão visual das páginas públicas da plataforma.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button asChild size="sm" className="border-0 bg-white text-foreground hover:bg-secondary">
              <Link to="/organizacoes/criar"><Plus className="mr-1.5 h-4 w-4" /> Cadastrar organização</Link>
            </Button>
          </div>
        </div>
      </section>

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
          <Card className="rounded-[1.5rem] border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Você ainda não administra nenhuma organização. Cadastre a sua ou peça acesso a uma existente.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myAdminClubs.map((club) => (
              <Link key={club.id} to={`/organizacoes/${club.id}/admin`} className="block h-full">
                <Card className="match-surface h-full rounded-[1.5rem]">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
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
                  </CardContent>
                </Card>
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
                <Card className="rounded-[1.25rem]">
                  <CardContent className="flex items-center gap-3 p-4">
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
