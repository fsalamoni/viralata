import React, { useState, useEffect, useMemo, useRef } from 'react';
import Seo from '@/components/Seo';
import { Link } from 'react-router-dom';
import { Search, Hash, Plus, Users, Sparkles, MapPin, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { listCommunities as getCommunities } from '../services/communityService';
import { toast } from 'sonner';
import PageHero from '@/components/PageHero';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { hasKnownCoords, lookupCityCoordsByName, filterPetsByRadius } from '@/modules/pets/domain/geoDistance';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { cn } from '@/core/lib/utils';

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

export default function CommunitiesDirectory() {
  const pageHeroEnabled = useFeatureFlag(FEATURE_FLAG.PAGE_HERO_ENABLED);
  const { userProfile } = useAuth();
  // Item 5: o card "ingressar com código" pertence SOMENTE ao acesso de
  // comunidade (persona community_staff, via /entrar/comunidade). Aqui é a
  // visão PÚBLICA — com a V4 ligada, o usuário apenas VÊ e filtra comunidades.
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const showJoinCode = !v4Enabled;
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  // Item 6: filtro por cidade + distância (paridade com o diretório de abrigos).
  const [city, setCity] = useState(() => userProfile?.city || '');
  const [radius, setRadius] = useState(() => (userProfile?.city ? 25 : 5));

  useEffect(() => {
    getCommunities().then(setCommunities);
  }, []);

  // Aplica a cidade do cadastro quando o perfil chega (sem sobrescrever ajuste
  // manual do usuário).
  const appliedProfileCity = useRef(Boolean(userProfile?.city));
  useEffect(() => {
    if (appliedProfileCity.current) return;
    if (userProfile?.city) {
      appliedProfileCity.current = true;
      setCity((prev) => (prev ? prev : userProfile.city));
      setRadius((prev) => (prev === 5 ? 25 : prev));
    }
  }, [userProfile?.city]);

  const handleJoin = (e) => {
    e.preventDefault();
    toast.info('Funcionalidade de convite privado em breve.');
  };

  const trimmedCity = city.trim();
  const radiusActive = Boolean(radius && hasKnownCoords(trimmedCity));

  const filteredCommunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = communities.filter((c) => {
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    });
    if (radiusActive) {
      const origin = lookupCityCoordsByName(trimmedCity);
      list = filterPetsByRadius(list, origin, radius) ?? list;
    } else if (trimmedCity) {
      const cityQ = trimmedCity.toLowerCase();
      list = list.filter((c) => String(c.city || '').toLowerCase().includes(cityQ));
    }
    // Ordenação: destaque primeiro, depois alfabética (pt-BR).
    return [...list].sort((a, b) => {
      const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDiff !== 0) return featuredDiff;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }, [communities, radiusActive, radius, search, trimmedCity]);

  return (
    <div className={useArenaPageClasses('arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-8')}>
      <Seo title="Comunidades" description="Comunidades de proteção animal: murais, fóruns e eventos." />
      {pageHeroEnabled ? (
        <>
          <PageHero
            eyebrow="Comunidade"
            title="Junte-se à maior rede de apoio animal"
            description="Conecte-se com ONGs, protetores e voluntários. Participe de eventos, tire dúvidas e ajude a transformar a vida de milhares de pets."
            actions={
              <Button asChild className="bg-white text-foreground hover:bg-secondary">
                <Link to="/comunidade/criar"><Plus className="mr-1.5 h-4 w-4" /> Nova Comunidade</Link>
              </Button>
            }
          />

          {showJoinCode && (
            <section className="arena-section-card rounded-[2rem] border-white/80 bg-white/82">
              <div className="arena-section-card-body p-6 sm:p-7">
                <span className="arena-chip">Ingressar com código</span>
                <h3 className="mt-4 text-2xl font-semibold text-foreground">Tem um convite?</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Digite o código compartilhado por um administrador para entrar em uma comunidade privada.
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
                  <Button type="submit" disabled={!code.trim()}>
                    Ingressar
                  </Button>
                </form>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className={cn('grid grid-cols-1 gap-6', showJoinCode && 'xl:grid-cols-[1.08fr,0.92fr]')}>
          <section className="arena-section-card arena-panel-strong overflow-hidden rounded-[1.25rem] border-0 sm:rounded-[2rem]">
            <div className="arena-section-card-body relative p-5 sm:p-8 lg:p-10">
              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-50/80">
                  <Users className="h-3.5 w-3.5" /> Comunidade
                </span>
                <h2 className="mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
                  Junte-se à maior rede de apoio animal
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-orange-50/75 sm:text-base">
                  Conecte-se com ONGs, protetores e voluntários. Participe de eventos, tire dúvidas e ajude a transformar a vida de milhares de pets.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="bg-white text-foreground hover:bg-secondary">
                    <Link to="/comunidade/criar"><Plus className="mr-1.5 h-4 w-4" /> Nova Comunidade</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {showJoinCode && (
            <section className="arena-section-card rounded-[2rem] border-white/80 bg-white/82">
              <div className="arena-section-card-body p-6 sm:p-7">
                <span className="arena-chip">Ingressar com código</span>
                <h3 className="mt-4 text-2xl font-semibold text-foreground">Tem um convite?</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Digite o código compartilhado por um administrador para entrar em uma comunidade privada.
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
                  <Button type="submit" disabled={!code.trim()}>
                    Ingressar
                  </Button>
                </form>
              </div>
            </section>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Catálogo</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Todas as Comunidades</h3>
          </div>
          <div className="relative max-w-xs flex-1 sm:ml-auto sm:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comunidade ou local..."
              className="h-[38px] rounded-full border-border bg-card pl-[38px] text-[12.5px]"
            />
          </div>
        </div>

        {/* Filtro por cidade + distância (Item 6) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] max-w-[280px] flex-1">
            <MapPin className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Filtrar por cidade"
              className="h-[38px] rounded-full border-border bg-card pl-[38px] pr-9 text-[12.5px]"
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
        <p className="text-[11.5px] text-muted-foreground/90">
          {!trimmedCity
            ? 'Sem cidade definida — mostrando todas as comunidades da plataforma'
            : radiusActive
              ? `Comunidades até ${radius} km de ${trimmedCity} (distância aproximada pelo centro da cidade)`
              : radius
                ? `Não conhecemos a localização de "${trimmedCity}" para calcular distância — mostrando só comunidades nessa cidade.`
                : `Comunidades em ${trimmedCity}`}
          {' · '}
          <span className="font-semibold text-foreground">{filteredCommunities.length}</span> encontrada(s)
        </p>

        {filteredCommunities.length === 0 ? (
          <section className="arena-section-card rounded-[2rem] border-white/80 bg-white/82">
            <div className="arena-section-card-body flex flex-col items-center px-4 py-10 text-center sm:px-10 sm:py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-foreground">Nenhuma comunidade encontrada</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Ajuste a busca para ver mais comunidades.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/comunidade/criar"><Plus className="mr-1.5 h-4 w-4" /> Criar</Link>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCommunities.map((c) => (
              <Link key={c.id} to={`/comunidade/${c.id}`} className="block h-full">
                <section className="arena-section-card match-surface h-full rounded-[1.75rem] border-white/80 bg-white/85">
                  <div className="arena-section-card-body flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="flex min-w-0 items-center gap-3 text-lg font-semibold text-foreground">
                        {c.cover_url ? (
                          <img src={c.cover_url} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-primary/10 object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                             <Users className="h-4.5 w-4.5" />
                          </span>
                        )}
                        <span className="truncate">{c.name}</span>
                      </h4>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{[c.city, c.state].filter(Boolean).join(' / ') || 'Global'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        <span>{c.member_count || 1} membro(s)</span>
                      </div>
                    </div>

                    {c.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{c.description}</p>
                    )}

                    <div className="mt-auto pt-6">
                      <div className="flex items-center justify-between text-sm font-medium text-primary">
                        <span>Abrir comunidade</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
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
