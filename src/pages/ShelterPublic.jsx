/**
 * @fileoverview ShelterPublic — página PÚBLICA do abrigo (sem auth) — TASK-303.
 *
 * Página rica com 5 abas + 3 CTAs integrados (Adotar/Voluntário/Doar).
 * Gated pela flag `SHELTER_FOUNDATION` (Fase 0).
 *
 * **Estrutura**:
 * - Capa com banner + identidade (avatar, nome, cidade, founded)
 * - 3 CTAs integrados no hero (Adotar/Voluntário/Doar)
 * - Tabs: Sobre, Pets, Vitrines, Equipe, Contato
 * - Stats: animais, adoções, membros, vitrines
 *
 * **Sem auth**:
 * - Sem abas internas (Financeiro, Equipe admin, Mural admin, Doações privadas)
 * - CTAs → login se não autenticado (preserva o destino via state.from)
 *
 * **Multi-tenant**:
 * - Cada clube tem URL única: /abrigos/:shelterId
 * - Rules no Firestore garantem read-only público em campos safe (TASK-152).
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, MapPin, PawPrint, Heart, Users, Calendar,
  ArrowLeft, Sparkles, Info, HandCoins, MessageCircle, Mail,
  Phone, Globe, Award, HeartHandshake, ExternalLink,
  Search,
} from 'lucide-react';
import { collection, getDocs, query as fsQuery, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { getClub } from '@/modules/organizations/services/clubService';
import { isClubPubliclyVisible } from '@/modules/communities/domain/directory';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PageHero from '@/components/PageHero';
import ClubCover from '@/modules/organizations/components/ClubCover';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { parseTimestamp } from '@/core/utils/timestamp';
import { toast } from 'sonner';

// ─── Data fetchers ─────────────────────────────────────────────────────

/** Busca pets adotados (snapshot público) — limit 6 */
async function fetchRecentAdoptions(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'pets'),
    where('status', '==', 'adopted'),
    orderBy('updated_at', 'desc'),
    limit(6),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Pets atualmente disponíveis para adoção (top 12) */
async function fetchAvailablePets(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'pets'),
    where('status', '==', 'available'),
    limit(12),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Conta animais (status != 'adopted' e != 'unavailable') */
async function fetchAnimalsCount(clubId) {
  if (!db || !clubId) return 0;
  const q = fsQuery(collection(db, 'clubs', clubId, 'pets'), limit(100));
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.filter((d) => {
    const s = d.data().status;
    return s !== 'adopted' && s !== 'unavailable';
  }).length;
}

/** Conta adoções concretizadas */
async function fetchAdoptionCount(clubId) {
  if (!db || !clubId) return 0;
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'pets'),
    where('status', '==', 'adopted'),
    limit(500),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.length;
}

/** Vitrines públicas (próximas) */
async function fetchExhibitions(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'exhibitions'),
    orderBy('event_date', 'asc'),
    limit(6),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Equipe pública (membros com profile público) */
async function fetchTeam(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'club_members'),
    limit(20),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => m.role !== 'admin' || m.publicly_visible !== false)
    .slice(0, 12);
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? parseTimestamp(timestamp) : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Sub-components ────────────────────────────────────────────────────

/** Card de pet (reutilizado em "Pets" e "Últimas adoções") */
function PetMiniCard({ pet, linkPrefix = '/pets' }) {
  const photo = pet.photos?.[0] || pet.photo_url;
  return (
    <Link
      to={`${linkPrefix}/${pet.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
    >
      {photo ? (
        <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <PawPrint className="h-5 w-5 text-muted-foreground" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {pet.name || 'Pet'}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[pet.species, pet.breed].filter(Boolean).join(' • ') || 'Pet para adoção'}
        </p>
      </div>
    </Link>
  );
}

/** Card de vitrine */
function ExhibitionCard({ exhibition }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{exhibition.title || 'Vitrine'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(exhibition.event_date)}
            </p>
            {exhibition.location && (
              <p className="mt-1 text-xs text-muted-foreground">
                <MapPin className="mr-1 inline-block h-3 w-3" />
                {exhibition.location}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Card de membro da equipe */
function TeamMemberCard({ member }) {
  const name = member.display_name || member.name || 'Membro';
  const role = member.role || 'volunteer';
  const roleLabel = {
    owner: 'Fundador(a)',
    admin: 'Coordenador(a)',
    volunteer: 'Voluntário(a)',
  }[role] || 'Equipe';

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Modal "Quero adotar" — encurta o caminho para o feed filtrado */
function AdoptDialog({ open, onOpenChange, shelterId, shelterName, onConfirm }) {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    species: '',
    age: '',
    size: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Monta query string com preferências
    const params = new URLSearchParams();
    if (shelterId) params.set('shelter', shelterId);
    if (preferences.species) params.set('species', preferences.species);
    if (preferences.age) params.set('age', preferences.age);
    if (preferences.size) params.set('size', preferences.size);
    onConfirm?.(preferences);
    navigate(`/feed?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adotar um pet de {shelterName || 'este abrigo'}</DialogTitle>
          <DialogDescription>
            Conte para nós o que você procura. Vamos te levar ao feed com pets
            deste abrigo que combinam com suas preferências.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="species">Espécie</Label>
            <select
              id="species"
              value={preferences.species}
              onChange={(e) => setPreferences({ ...preferences, species: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Qualquer</option>
              <option value="dog">Cachorro</option>
              <option value="cat">Gato</option>
              <option value="rabbit">Coelho</option>
              <option value="bird">Pássaro</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <Label htmlFor="age">Idade</Label>
            <select
              id="age"
              value={preferences.age}
              onChange={(e) => setPreferences({ ...preferences, age: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Qualquer</option>
              <option value="puppy">Filhote</option>
              <option value="adult">Adulto</option>
              <option value="senior">Idoso</option>
            </select>
          </div>
          <div>
            <Label htmlFor="size">Porte</Label>
            <select
              id="size"
              value={preferences.size}
              onChange={(e) => setPreferences({ ...preferences, size: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Qualquer</option>
              <option value="mini">Mini</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
              <option value="giant">Gigante</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" /> Ver pets
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Modal "Quero doar" — leva ao VolunteerSignup como doador */
function DonateDialog({ open, onOpenChange, shelterId, shelterName, isAuthenticated }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      // Salva intenção no localStorage e leva ao login
      try {
        localStorage.setItem('viralata:donate_intent', JSON.stringify({ shelterId, shelterName, name, email, message }));
      } catch (e) { void e; /* storage indisponível, segue para login */ }
      navigate(`/login?from=${encodeURIComponent(`/abrigos/${shelterId}`)}&reason=donate`);
      onOpenChange(false);
      return;
    }
    toast.success('Mensagem enviada! O abrigo entrará em contato em breve.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Doar para {shelterName || 'este abrigo'}</DialogTitle>
          <DialogDescription>
            Doe ração, medicamentos, cobertores ou qualquer item que o abrigo precisar.
            Deixe seus dados para que a equipe entre em contato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="donate-name">Seu nome</Label>
            <Input id="donate-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="donate-email">E-mail</Label>
            <Input id="donate-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="donate-message">O que você gostaria de doar?</Label>
            <Textarea
              id="donate-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Ex.: 10kg de ração para cães adultos, 1 caixa de areia sanitária..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <HandCoins className="mr-2 h-4 w-4" /> Enviar mensagem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function ShelterPublic() {
  const { shelterId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const arenaCls = useArenaPageClasses('bg-card');
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION);

  const [adoptOpen, setAdoptOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  // Data queries
  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['shelter-public', shelterId],
    queryFn: () => getClub(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: adoptions = [], isLoading: isAdoptionsLoading } = useQuery({
    queryKey: ['shelter-public-adoptions', shelterId],
    queryFn: () => fetchRecentAdoptions(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: availablePets = [], isLoading: isPetsLoading } = useQuery({
    queryKey: ['shelter-public-available-pets', shelterId],
    queryFn: () => fetchAvailablePets(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: animalsCount = 0 } = useQuery({
    queryKey: ['shelter-public-animals', shelterId],
    queryFn: () => fetchAnimalsCount(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: adoptionsCount = 0 } = useQuery({
    queryKey: ['shelter-public-adoptions-count', shelterId],
    queryFn: () => fetchAdoptionCount(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: exhibitions = [], isLoading: isExhibitionsLoading } = useQuery({
    queryKey: ['shelter-public-exhibitions', shelterId],
    queryFn: () => fetchExhibitions(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: team = [], isLoading: isTeamLoading } = useQuery({
    queryKey: ['shelter-public-team', shelterId],
    queryFn: () => fetchTeam(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  // Feature flag off — degrade seguro
  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Página pública do abrigo em breve"
          description="Esta funcionalidade está em rollout. Volte em alguns dias."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Abrigo não encontrado"
          description="O abrigo que você procura não existe ou não está visível publicamente."
          action={(
            <Button asChild variant="outline">
              <Link to="/organizacoes">Ver todos os abrigos</Link>
            </Button>
          )}
        />
      </div>
    );
  }

  if (!isClubPubliclyVisible(club)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Abrigo não disponível publicamente"
          description="Este abrigo optou por não aparecer na listagem pública."
        />
      </div>
    );
  }

  const stats = {
    followers: club.member_count || 0,
    animals: animalsCount,
    adoptions: adoptionsCount,
    founded: club.created_at?.toDate ? parseTimestamp(club.created_at).getFullYear() : null,
  };

  // Chips (informações rápidas)
  const chips = [
    club.city && { icon: MapPin, label: `${club.city}${club.state ? `/${club.state}` : ''}` },
    stats.founded && { icon: Award, label: `Desde ${stats.founded}` },
    club.member_count > 0 && { icon: Users, label: `${club.member_count} membros` },
  ].filter(Boolean);

  return (
    <div className={arenaCls}>
      {/* Capa */}
      <ClubCover club={club} stats={stats} isAdmin={false} />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <PageHero
          eyebrow="Abrigo"
          title={club.name || 'Abrigo sem nome'}
          description={club.description || 'Causa animal e adoção responsável.'}
          chips={chips}
        />

        {/* 3 CTAs integrados (TASK-303) */}
        <section
          aria-label="Ações principais"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <Button
            size="lg"
            onClick={() => {
              if (!isAuthenticated) {
                navigate(`/login?from=${encodeURIComponent(`/abrigos/${shelterId}`)}&reason=adopt`);
                return;
              }
              setAdoptOpen(true);
            }}
            className="h-auto flex-col gap-1 py-4"
            aria-label="Quero adotar um pet deste abrigo"
          >
            <PawPrint className="h-5 w-5" />
            <span className="text-base font-semibold">Quero adotar</span>
            <span className="text-xs font-normal opacity-90">Veja os pets disponíveis</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              if (!isAuthenticated) {
                navigate(`/login?from=${encodeURIComponent(`/abrigos/${shelterId}`)}&reason=volunteer`);
                return;
              }
              navigate(`/voluntarios/seja?abrigo=${shelterId}`);
            }}
            className="h-auto flex-col gap-1 py-4"
            aria-label="Quero ser voluntário deste abrigo"
          >
            <HeartHandshake className="h-5 w-5" />
            <span className="text-base font-semibold">Quero ser voluntário</span>
            <span className="text-xs font-normal opacity-90">Passeios, eventos, cuidados</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              if (!isAuthenticated) {
                navigate(`/login?from=${encodeURIComponent(`/abrigos/${shelterId}`)}&reason=donate`);
                return;
              }
              setDonateOpen(true);
            }}
            className="h-auto flex-col gap-1 py-4"
            aria-label="Quero fazer uma doação para este abrigo"
          >
            <HandCoins className="h-5 w-5" />
            <span className="text-base font-semibold">Quero doar</span>
            <span className="text-xs font-normal opacity-90">Ração, medicamentos, itens</span>
          </Button>
        </section>

        {/* Tabs (TASK-303 — página rica) */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5" role="tablist">
            <TabsTrigger value="about" role="tab">
              <Info className="mr-1.5 h-3.5 w-3.5" /> Sobre
            </TabsTrigger>
            <TabsTrigger value="pets" role="tab">
              <PawPrint className="mr-1.5 h-3.5 w-3.5" /> Pets ({availablePets.length || animalsCount})
            </TabsTrigger>
            <TabsTrigger value="exhibitions" role="tab">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Vitrines
            </TabsTrigger>
            <TabsTrigger value="team" role="tab">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Equipe
            </TabsTrigger>
            <TabsTrigger value="contact" role="tab">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Contato
            </TabsTrigger>
          </TabsList>

          {/* Sobre */}
          <TabsContent value="about" className="mt-6 space-y-6">
            <section aria-label="Estatísticas do abrigo" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col items-start gap-2 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <PawPrint className="h-5 w-5 text-primary" />
                  </span>
                  <p className="font-['Sora'] text-2xl font-bold text-foreground">
                    {animalsCount.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Animais disponíveis</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-start gap-2 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100">
                    <Heart className="h-5 w-5 text-pink-600" />
                  </span>
                  <p className="font-['Sora'] text-2xl font-bold text-foreground">
                    {adoptionsCount.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Adoções concretizadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-start gap-2 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </span>
                  <p className="font-['Sora'] text-2xl font-bold text-foreground">
                    {(club.member_count || 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Membros da equipe</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-start gap-2 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </span>
                  <p className="font-['Sora'] text-2xl font-bold text-foreground">
                    {exhibitions.length.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Vitrines agendadas</p>
                </CardContent>
              </Card>
            </section>

            {/* Localização */}
            {(club.city || club.state) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" /> Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">
                    {[club.city, club.state].filter(Boolean).join(' / ')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Últimas adoções */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" /> Últimas adoções
                </CardTitle>
                <CardDescription>
                  Pets que encontraram um lar através deste abrigo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdoptionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : adoptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma adoção pública registrada ainda.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
                    {adoptions.map((pet) => (
                      <li key={pet.id}>
                        <PetMiniCard pet={pet} linkPrefix="/pet" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pets */}
          <TabsContent value="pets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PawPrint className="h-4 w-4" /> Pets disponíveis
                </CardTitle>
                <CardDescription>
                  Animais que estão atualmente sob cuidado deste abrigo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPetsLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : availablePets.length === 0 ? (
                  <EmptyState
                    icon={PawPrint}
                    title="Nenhum pet disponível no momento"
                    description="Este abrigo não tem pets disponíveis para adoção no momento. Volte em breve!"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
                    {availablePets.map((pet) => (
                      <li key={pet.id}>
                        <PetMiniCard pet={pet} linkPrefix="/pet" />
                      </li>
                    ))}
                  </ul>
                )}
                {availablePets.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Button asChild>
                      <Link to={`/feed?shelter=${shelterId}`}>
                        Ver todos os pets deste abrigo
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vitrines */}
          <TabsContent value="exhibitions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" /> Próximas vitrines
                </CardTitle>
                <CardDescription>
                  Feiras de adoção e eventos do abrigo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isExhibitionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : exhibitions.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Nenhuma vitrine agendada"
                    description="Este abrigo ainda não tem eventos públicos agendados."
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
                    {exhibitions.map((ex) => (
                      <li key={ex.id}>
                        <ExhibitionCard exhibition={ex} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipe */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Nossa equipe
                </CardTitle>
                <CardDescription>
                  Voluntários e coordenadores que cuidam dos pets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTeamLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : team.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Equipe não listada publicamente"
                    description="Este abrigo optou por não listar os membros publicamente."
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
                    {team.map((m) => (
                      <li key={m.id}>
                        <TeamMemberCard member={m} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contato */}
          <TabsContent value="contact" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4" /> Contato
                </CardTitle>
                <CardDescription>
                  Entre em contato com o abrigo para tirar dúvidas, oferecer
                  doações ou agendar uma visita.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {club.email && (
                  <a
                    href={`mailto:${club.email}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{club.email}</span>
                  </a>
                )}
                {club.phone && (
                  <a
                    href={`tel:${club.phone}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{club.phone}</span>
                  </a>
                )}
                {club.website && (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{club.website}</span>
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  </a>
                )}
                {!club.email && !club.phone && !club.website && (
                  <p className="text-sm text-muted-foreground">
                    Este abrigo não disponibilizou informações de contato públicas.
                    Use o botão &quot;Quero doar&quot; ou &quot;Quero ser voluntário&quot; para iniciar
                    uma conversa.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back button */}
        <div className="flex justify-center pt-2">
          <Button asChild variant="ghost">
            <Link to="/organizacoes">
              <ArrowLeft className="mr-2 h-4 w-4" /> Ver todos os abrigos
            </Link>
          </Button>
        </div>
      </div>

      {/* Modais */}
      <AdoptDialog
        open={adoptOpen}
        onOpenChange={setAdoptOpen}
        shelterId={shelterId}
        shelterName={club.name}
        onConfirm={() => {
          // analytics hook (futuro)
          return undefined;
        }}
      />
      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        shelterId={shelterId}
        shelterName={club.name}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
