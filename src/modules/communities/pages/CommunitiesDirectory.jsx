import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Hash, Plus, Users, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { listCommunities as getCommunities } from '../services/communityService';
import { toast } from 'sonner';
import PageHero from '@/components/PageHero';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

export default function CommunitiesDirectory() {
  const pageHeroEnabled = useFeatureFlag(FEATURE_FLAG.PAGE_HERO_ENABLED);
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    getCommunities().then(setCommunities);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    toast.info('Funcionalidade de convite privado em breve.');
  };

  const filteredCommunities = useMemo(() => {
    if (!search.trim()) return communities;
    const q = search.toLowerCase();
    return communities.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.description || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  }, [communities, search]);

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
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

          <Card className="rounded-[2rem] border-white/80 bg-white/82">
            <CardContent className="p-6 sm:p-7">
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
            </CardContent>
          </Card>
        </>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr,0.92fr]">
          <Card className="arena-panel-strong overflow-hidden rounded-[1.25rem] border-0 sm:rounded-[2rem]">
            <CardContent className="relative p-5 sm:p-8 lg:p-10">
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
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/80 bg-white/82">
            <CardContent className="p-6 sm:p-7">
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
            </CardContent>
          </Card>
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

        {filteredCommunities.length === 0 ? (
          <Card className="rounded-[2rem] border-white/80 bg-white/82">
            <CardContent className="flex flex-col items-center px-4 py-10 text-center sm:px-10 sm:py-12">
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
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCommunities.map((c) => (
              <Link key={c.id} to={`/comunidade/${c.id}`} className="block h-full">
                <Card className="match-surface h-full rounded-[1.75rem] border-white/80 bg-white/85">
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
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
