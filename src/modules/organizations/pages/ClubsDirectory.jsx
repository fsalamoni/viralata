import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Hash,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { hasKnownCoords, lookupCityCoordsByName, filterByRadius } from '@/modules/pets/domain/geoDistance';
import {
  useClubs,
  useMyClubs,
  useJoinClub,
  useMyJoinRequests,
  useMyClubInvites,
  useRequestToJoinClub,
} from '@/modules/organizations/hooks/useClubs';
import { JOIN_REQUEST_STATUS } from '@/modules/organizations/domain/constants';
import { cn } from '@/core/lib/utils';
import { useCommunities } from '@/modules/communities/hooks/useCommunities';
import { getVisibleCommunityMap } from '@/modules/communities/domain/directory';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

function RadiusChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground/75 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}

function locationText(club) {
  return [club.city, club.state].filter(Boolean).join(' / ') || null;
}

export default function ClubsDirectory() {
  const { isAuthAvailable, authUnavailableReason, userProfile } = useAuth();
  const { data: clubs = [], isLoading } = useClubs();
  const { data: communities = [] } = useCommunities();
  const { data: myClubs = [] } = useMyClubs();
  const { data: myRequests = [] } = useMyJoinRequests();
  const { data: myInvites = [] } = useMyClubInvites();
  const joinClub = useJoinClub();
  const requestToJoin = useRequestToJoinClub();
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [communityId, setCommunityId] = useState('all');
  // Item 6: filtro por cidade + distância. Por padrão usa a cidade do cadastro
  // do usuário; sem cidade cadastrada, o raio inicial fica em 5 km. O usuário
  // pode limpar a cidade e o raio para ver todas as organizações da plataforma.
  const [city, setCity] = useState(() => userProfile?.city || '');
  const [radius, setRadius] = useState(() => (userProfile?.city ? 25 : 5));
  const isPreviewMode = import.meta.env.DEV && !isAuthAvailable;

  // O perfil pode não estar carregado no primeiro render (auth ainda
  // resolvendo). Quando ele chega, aplicamos a cidade do cadastro uma única vez,
  // sem sobrescrever ajustes que o usuário já tenha feito manualmente.
  const appliedProfileCity = useRef(Boolean(userProfile?.city));
  useEffect(() => {
    if (appliedProfileCity.current) return;
    if (userProfile?.city) {
      appliedProfileCity.current = true;
      setCity((prev) => (prev ? prev : userProfile.city));
      setRadius((prev) => (prev === 5 ? 25 : prev));
    }
  }, [userProfile?.city]);

  const myClubIds = useMemo(() => new Set(myClubs.map((c) => c.id)), [myClubs]);
  const visibleCommunityMap = useMemo(() => getVisibleCommunityMap(communities), [communities]);
  const visibleCommunities = useMemo(() => Object.values(visibleCommunityMap), [visibleCommunityMap]);
  const pendingRequestIds = useMemo(
    () => new Set(myRequests.filter((r) => r.status === JOIN_REQUEST_STATUS.PENDING).map((r) => r.club_id)),
    [myRequests],
  );
  const invitedClubIds = useMemo(() => new Set(myInvites.map((i) => i.club_id)), [myInvites]);

  const joinStateFor = (clubId) => {
    if (myClubIds.has(clubId)) return null;
    if (invitedClubIds.has(clubId)) return 'invited';
    if (pendingRequestIds.has(clubId)) return 'pending';
    return 'none';
  };

  const handleRequest = async (club) => {
    try {
      const res = await requestToJoin.mutateAsync(club);
      if (res?.alreadyMember) toast.success('Você já é membro desta organização.');
      else toast.success(`Pedido enviado para ${club.name}.`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível enviar o pedido.');
    }
  };

  const trimmedCity = city.trim();
  const radiusActive = Boolean(radius && hasKnownCoords(trimmedCity));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clubs.filter((c) => {
      if (!q) return true;
      const haystack = [c.name, c.city, c.state, c.description].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
    if (communityId === 'none') {
      list = list.filter((c) => !c.community_id || !visibleCommunityMap[c.community_id]);
    } else if (communityId !== 'all') {
      list = list.filter((c) => c.community_id === communityId);
    }
    if (radiusActive) {
      const origin = lookupCityCoordsByName(trimmedCity);
      list = filterByRadius(list, origin, radius, trimmedCity) ?? list;
    } else if (trimmedCity) {
      const cityQ = trimmedCity.toLowerCase();
      list = list.filter((c) => String(c.city || '').toLowerCase().includes(cityQ));
    }
    return list.sort((a, b) => {
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDiff !== 0) return featuredDiff;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }, [clubs, communityId, radiusActive, radius, search, trimmedCity, visibleCommunityMap]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const club = await joinClub.mutateAsync(trimmed);
      toast.success(`Você entrou na organização ${club.name}.`);
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Não foi possível ingressar na organização.');
    }
  };

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-8 px-5 py-6 pb-12">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <Card className="arena-panel-strong overflow-hidden rounded-[1.25rem] border-0 sm:rounded-[2rem]">
          <CardContent className="relative p-5 sm:p-8 lg:p-10">
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-50/80">
                <Building2 className="h-3.5 w-3.5" /> ONGs Parceiras
              </span>
              <h2 className="mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
                Encontre uma organização ou cadastre a sua.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-orange-50/75 sm:text-base">
                Gerencie pets para adoção, organize mutirões e mantenha sua equipe conectada
                em um só lugar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-white text-foreground hover:bg-secondary">
                  <Link to="/organizacoes/criar"><Plus className="mr-1.5 h-4 w-4" /> Cadastrar organização</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/80 bg-white/82">
          <CardContent className="p-6 sm:p-7">
            <span className="arena-chip">Ingressar com código</span>
            <h3 className="mt-4 text-2xl font-semibold text-foreground">Tem um convite?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Digite o código compartilhado por um administrador para entrar na organização.
            </p>
            <form onSubmit={handleJoin} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  maxLength={12}
                  className="pl-9 uppercase tracking-[0.2em]"
                />
              </div>
              <Button type="submit" disabled={joinClub.isPending || !code.trim()}>
                {joinClub.isPending ? 'Entrando…' : 'Ingressar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {myClubs.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Minhas organizações</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Organizações em que você participa</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} myRole={club.my_role} />
            ))}
          </div>
        </section>
      )}

      {visibleCommunities.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Comunidades</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Frentes e redes em destaque</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleCommunities.slice(0, 6).map((community) => (
              <Card key={community.id} className="overflow-hidden rounded-[1.75rem] border-white/80 bg-white/88">
                {community.cover_url && (
                  <img src={community.cover_url} alt="" className="h-32 w-full object-cover" />
                )}
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant={community.featured ? 'warning' : 'secondary'}>
                      {community.featured ? 'Destaque' : 'Comunidade'}
                    </Badge>
                    {[community.city, community.state].filter(Boolean).join(' / ') && (
                      <Badge variant="outline">{[community.city, community.state].filter(Boolean).join(' / ')}</Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{community.name}</h4>
                    {community.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{community.description}</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCommunityId(community.id)}>
                    Ver organizações desta comunidade
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card className="rounded-[2rem] border-white/80 bg-white/82">
        <CardContent className="p-4 sm:p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar organização por nome, cidade ou descrição"
              className="h-12 rounded-full border-white/80 bg-white/80 pl-11 pr-11"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground/80"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por cidade + distância (Item 6) */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="flex gap-1.5 overflow-x-auto">
              <RadiusChip active={communityId === 'all'} onClick={() => setCommunityId('all')}>Todas</RadiusChip>
              {visibleCommunities.map((community) => (
                <RadiusChip key={community.id} active={communityId === community.id} onClick={() => setCommunityId(community.id)}>
                  {community.name}
                </RadiusChip>
              ))}
              <RadiusChip active={communityId === 'none'} onClick={() => setCommunityId('none')}>Sem comunidade</RadiusChip>
            </div>
            <div className="relative min-w-[200px] max-w-[280px] flex-1">
              <MapPin className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Filtrar por cidade"
                className="h-[38px] rounded-full border-white/80 bg-white/80 pl-[38px] pr-9 text-[12.5px]"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => setCity('')}
                  aria-label="Limpar cidade"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {RADIUS_OPTIONS.map((km) => (
                <RadiusChip key={km} active={radius === km} onClick={() => setRadius((prev) => (prev === km ? null : km))}>
                  {km} km
                </RadiusChip>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground/90">
            {!trimmedCity
              ? 'Sem cidade definida — mostrando todas as organizações da plataforma'
              : radiusActive
                ? `Organizações até ${radius} km de ${trimmedCity} (distância aproximada pelo centro da cidade)`
                : radius
                  ? `Não conhecemos a localização de "${trimmedCity}" para calcular distância — mostrando só organizações nessa cidade.`
                  : `Organizações em ${trimmedCity}`}
            {communityId !== 'all' && (
              <>
                {' · '}
                {communityId === 'none'
                  ? 'apenas organizações sem comunidade'
                  : `comunidade ${visibleCommunityMap[communityId]?.name || 'selecionada'}`}
              </>
            )}
          </p>

          <div className="mt-4 border-t border-foreground/10 pt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> organização(ões) encontrada(s).
          </div>
        </CardContent>
      </Card>

      {isPreviewMode && (
        <Card className="rounded-[2rem] border-amber-300/70 bg-amber-50/85">
          <CardContent className="p-5 text-sm leading-6 text-amber-950">
            Prévia local sem Firebase: as organizações não são carregadas neste ambiente.
            {authUnavailableReason ? ` ${authUnavailableReason}` : ''}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-48 rounded-[1.75rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-[2rem] border-white/80 bg-white/82">
          <CardContent className="flex flex-col items-center px-4 py-10 text-center sm:px-10 sm:py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-foreground">Nenhuma organização encontrada</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {clubs.length === 0
                ? 'Ainda não há organizações na plataforma. Crie a primeira e convide sua turma!'
                : 'Ajuste a busca para ver mais organizações.'}
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to="/organizacoes/criar"><Plus className="mr-1.5 h-4 w-4" /> Criar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Catálogo</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Todas as organizações</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                community={club.community_id ? visibleCommunityMap[club.community_id] : null}
                myRole={myClubIds.has(club.id) ? (club.my_role || 'member') : null}
                joinState={joinStateFor(club.id)}
                onRequest={handleRequest}
                requesting={requestToJoin.isPending}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ClubCard({ club, community, myRole, joinState = null, onRequest, requesting = false }) {
  const location = locationText(club);
  const handleRequestClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRequest?.(club);
  };
  return (
    <Link to={`/organizacoes/${club.id}`} className="block h-full">
      <Card className="match-surface h-full rounded-[1.75rem] border-white/80 bg-white/85">
        <CardContent className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h4 className="flex min-w-0 items-center gap-3 text-lg font-semibold text-foreground">
              {club.logo_url ? (
                <img src={club.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-primary/10 object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="h-4.5 w-4.5" />
                </span>
              )}
              <span className="truncate">{club.name}</span>
            </h4>
            {myRole && (
              <Badge variant={myRole === 'admin' ? 'warning' : 'success'} className="shrink-0 rounded-full uppercase tracking-[0.12em]">
                {myRole === 'admin' ? 'Admin' : 'Membro'}
              </Badge>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {community && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{community.name}</Badge>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{location || 'Cidade não informada'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-primary" />
              <span>{club.member_count || 0} membro(s)</span>
            </div>
          </div>

          {club.description && (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{club.description}</p>
          )}

          <div className="mt-auto pt-6">
            {myRole || !joinState || joinState === 'none' ? (
              <div className="flex items-center justify-between text-sm font-medium text-primary">
                <span>Abrir organização</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            ) : null}
            {!myRole && joinState === 'none' && (
              <Button size="sm" variant="outline" className="mt-3 w-full" onClick={handleRequestClick} disabled={requesting}>
                Pedir para ingressar
              </Button>
            )}
            {!myRole && joinState === 'pending' && (
              <Badge variant="secondary" className="mt-3 w-full justify-center rounded-full py-1.5">Pedido enviado</Badge>
            )}
            {!myRole && joinState === 'invited' && (
              <Badge variant="warning" className="mt-3 w-full justify-center rounded-full py-1.5">Você foi convidado — abrir</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
