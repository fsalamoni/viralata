import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Sparkles, Hash, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { listCommunities as getCommunities } from '../services/communityService';
import { toast } from 'sonner';

export default function CommunitiesDirectory() {
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
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <Card className="arena-panel-strong overflow-hidden rounded-[1.25rem] border-0 sm:rounded-[2rem]">
          <CardContent className="relative p-5 sm:p-8 lg:p-10">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-highlight/20 blur-2xl" />
            <div className="absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative z-10 max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-50/80">
                <Users className="h-3.5 w-3.5" /> Comunidade
              </span>
              <h2 className="text-[28px] font-extrabold leading-[1.15] text-white sm:text-[36px]">
                Junte-se à maior rede de apoio animal
              </h2>
              <p className="max-w-xl text-[15px] leading-7 text-orange-50/75 sm:text-base">
                Conecte-se com ONGs, protetores e voluntários. Participe de eventos, tire dúvidas e ajude a transformar a vida de milhares de pets.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-white text-foreground hover:bg-secondary">
                  <Link to="/comunidade/criar"><Plus className="mr-1.5 h-4 w-4" /> Criar Comunidade</Link>
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

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Explorar Comunidades</div>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comunidade ou local..."
              className="h-10 rounded-full border-border bg-card pl-9 text-[13px]"
            />
          </div>
        </div>

        {filteredCommunities.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Nenhuma comunidade encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCommunities.map((c) => (
              <Link key={c.id} to={`/comunidade/${c.id}`} className="block h-full">
                <Card className="match-surface h-full rounded-[1.75rem] border-white/80 bg-white/85 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(64,34,18,0.35)]">
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

                    <div className="mt-auto pt-6 flex items-center justify-between text-sm font-medium text-primary">
                      <span>Abrir comunidade</span>
                      <ArrowRight className="h-4 w-4" />
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
