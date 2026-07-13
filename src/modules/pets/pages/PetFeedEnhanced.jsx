import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap, X, Heart, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeedPreferences } from '@/core/hooks/useFeedPreferences';
import { usePetFeed, useCreateInterest } from '../hooks/usePets';
import { hasKnownCoords } from '../domain/geoDistance';
import { applyFeedFilters } from '../domain/feedFilters';
import PetCard from '../components/PetCard';
import AdSlot from '@/components/AdSlot';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/core/lib/utils';
import { toast } from 'sonner';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const SPECIES_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'dog', label: 'Cães' },
  { value: 'cat', label: 'Gatos' },
  { value: 'rabbit', label: 'Coelhos' },
];

const SIZE_FILTERS = [
  { value: 'all', label: 'Todos os portes' },
  { value: 'mini', label: 'Mini' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'giant', label: 'Gigante' },
];

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-bold transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground/75 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}

const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

function SwipeCard({ pet, isTop, onSwipe, onOpenDetail }) {
  const [drag, setDrag] = useState(null);
  const dx = drag?.dx || 0;
  const rotation = Math.max(-14, Math.min(14, dx / 12));
  const likeOpacity = Math.max(0, Math.min(1, dx / 90));
  const passOpacity = Math.max(0, Math.min(1, -dx / 90));

  const onPointerDown = useCallback((e) => {
    if (!isTop) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    setDrag({ startX: e.clientX, dx: 0 });
  }, [isTop]);

  const onPointerMove = useCallback((e) => {
    setDrag((d) => (d ? { ...d, dx: e.clientX - d.startX } : d));
  }, []);

  const onPointerUp = useCallback(() => {
    setDrag((d) => {
      if (!d) return null;
      if (Math.abs(d.dx) < 6) {
        onOpenDetail(pet.id);
      } else if (d.dx > 90) {
        onSwipe(pet.id, 'like');
      } else if (d.dx < -90) {
        onSwipe(pet.id, 'pass');
      }
      return null;
    });
  }, [onOpenDetail, onSwipe, pet.id]);

  const temperament = pet.temperament || [];

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="absolute inset-0 touch-none select-none"
      style={{
        transform: drag ? `translateX(${dx}px) rotate(${rotation}deg)` : 'translateX(0) rotate(0)',
        transition: drag ? 'none' : 'transform 0.32s cubic-bezier(.2,.8,.2,1)',
        zIndex: isTop ? 3 : 1,
        cursor: isTop ? 'grab' : 'default',
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white shadow-[0_30px_60px_-28px_hsl(20_40%_15%/0.45)]">
        {pet.photos?.[0] ? (
          <img src={pet.photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)]">
            <Heart className="h-28 w-28 text-white/35" />
          </div>
        )}
        <div className="absolute right-4 top-4 opacity-0 transition-opacity" style={{ opacity: likeOpacity, transform: 'rotate(-14deg)' }}>
          <span className="rounded-[10px] border-[3px] border-[hsl(150,55%,55%)] px-3 py-1 font-['Sora'] text-[19px] font-extrabold text-[hsl(150,70%,92%)]">CURTIR</span>
        </div>
        <div className="absolute left-4 top-4" style={{ opacity: passOpacity, transform: 'rotate(14deg)' }}>
          <span className="rounded-[10px] border-[3px] border-[hsl(9,62%,60%)] px-3 py-1 font-['Sora'] text-[19px] font-extrabold text-[hsl(9,70%,92%)]">AGORA NÃO</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenDetail(pet.id); }}
          className="absolute right-3.5 top-3.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/30 text-white"
          aria-label="Ver detalhes"
        >
          <Info className="h-4 w-4" />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 text-white">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="font-['Sora'] text-[21px] font-extrabold">{pet.name || pet.title}</span>
            {pet.age_group && <span className="text-[12.5px] opacity-85">· {AGE_LABEL[pet.age_group]}</span>}
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {temperament.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs opacity-90">
            <MapPin className="h-3.5 w-3.5" /> {pet.city}{pet.state ? `, ${pet.state}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeDeck({ pets, onLike, onPass, onOpenDetail }) {
  const [dismissedIds, setDismissedIds] = useState([]);
  const visible = pets.filter((p) => !dismissedIds.includes(p.id)).slice(0, 3);

  function handleSwipe(id, decision) {
    setDismissedIds((prev) => [...prev, id]);
    if (decision === 'like') onLike(id);
    else onPass(id);
  }

  return (
    <div className="mb-14">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-highlight" fill="currentColor" />
        <h2 className="font-['Sora'] text-[17px] font-bold text-foreground">Descobrir</h2>
      </div>
      <div className="relative mx-auto h-[460px] max-w-[360px]">
        {visible.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-border bg-card p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-accent" />
            <p className="mt-3.5 mb-1 text-sm font-bold text-foreground">Você viu todos os destaques!</p>
            <p className="text-[12.5px] text-muted-foreground">Veja a lista completa logo abaixo.</p>
          </div>
        ) : (
          visible.map((pet, i) => (
            <SwipeCard
              key={pet.id}
              pet={pet}
              isTop={i === 0}
              onSwipe={handleSwipe}
              onOpenDetail={onOpenDetail}
            />
          ))
        )}
      </div>
      <div className="mt-5.5 flex items-center justify-center gap-6">
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => handleSwipe(visible[0]?.id, 'pass')}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-[hsl(9,62%,46%)] shadow-[0_14px_28px_-16px_hsl(20_40%_20%/0.35)] disabled:opacity-40"
          aria-label="Pular"
        >
          <X className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => handleSwipe(visible[0]?.id, 'like')}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_18px_32px_-14px_hsl(17_72%_30%/0.6)] disabled:opacity-40"
          aria-label="Curtir"
        >
          <Heart className="h-7 w-7" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

/**
 * Banner de "fallback de localização": aparece quando o filtro de
 * cidade/raio zerou a lista mas ainda há pets compatíveis nos demais
 * filtros. Informa o usuário sem esconder os pets — feed nunca fica vazio
 * havendo animais cadastrados.
 */
function LocationFallbackBanner({ cityText, radius, radiusActive }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6.5 flex items-start gap-3 rounded-[1.15rem] border border-highlight/40 bg-highlight/10 px-4 py-3"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-highlight/20 text-highlight">
        <Info className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">
          Mostrando pets de todas as cidades
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground/80">
          Nenhum pet encontrado em <strong>{cityText}</strong>
          {radiusActive ? ` num raio de ${radius} km` : ''} — exibindo pets de todas as cidades da plataforma.
        </p>
      </div>
    </div>
  );
}

function LocationHint({ cityText, radiusActive, radius }) {
  return (
    <p className="mb-6.5 text-[11.5px] text-muted-foreground/90">
      {!cityText
        ? 'Sem cidade definida — mostrando todos os pets disponíveis na plataforma'
        : radiusActive
          ? `Pets até ${radius} km de ${cityText} (distância aproximada pelo centro da cidade, sem geolocalização precisa)`
          : radius
            ? `Não conhecemos a localização de "${cityText}" para calcular distância — mostrando pets cadastrados nessa cidade.`
            : `Pets em ${cityText}`}
    </p>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  );
}

function FeedEmpty({ fetchedCount, hasFilters }) {
  if (fetchedCount === 0) {
    return (
      <div className="space-y-3 py-16 text-center">
        <p className="text-[13.5px] text-muted-foreground">
          Ainda não há pets disponíveis para adoção na plataforma.
        </p>
        <p className="text-sm text-muted-foreground">
          Seja o primeiro: cadastre um pet e ajude ele a encontrar um novo lar.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 py-16 text-center">
      <p className="text-[13.5px] text-muted-foreground">Nenhum pet encontrado com esses filtros.</p>
      <p className="text-sm text-muted-foreground">
        {hasFilters
          ? 'Limpe os filtros de espécie e porte para ver todos os pets da plataforma.'
          : 'Tente novamente em alguns instantes.'}
      </p>
    </div>
  );
}

/**
 * PetFeedEnhanced — versão com correção de confiabilidade.
 *
 * Carrega todos os pets disponíveis em uma ÚNICA query (sem filtros no
 * servidor), e aplica espécie/porte/cidade/raio/dono no cliente via
 * `applyFeedFilters`. Quando o filtro de localização zera a lista mas há
 * pets compatíveis nos demais filtros, exibe um banner explicativo e
 * mantém os pets visíveis (`locationFallback`).
 *
 * Ativado pela feature flag `PET_FEED_RELIABILITY_FIX`. Default OFF —
 * neste caso, o wrapper em `PetFeed.jsx` renderiza o componente original.
 */
export default function PetFeedEnhanced() {
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { settings } = usePlatformSettings();
  const [feedPrefs, setFeedPrefs] = useFeedPreferences();
  const species = feedPrefs.species;
  const size = feedPrefs.size;
  const showOwnPets = feedPrefs.showOwnPets;
  const setSpecies = (v) => setFeedPrefs({ species: v });
  const setSize = (v) => setFeedPrefs({ size: v });
  const setShowOwnPets = (v) => setFeedPrefs({ showOwnPets: v });
  // Item 4: por padrão o filtro usa a cidade do cadastro do usuário. Se não há
  // cidade cadastrada, o raio inicial fica em 5 km. O usuário pode limpar a
  // cidade e o raio para ver todos os pets da plataforma.
  const [city, setCity] = useState(() => userProfile?.city || '');
  const [radius, setRadius] = useState(() => (userProfile?.city ? 25 : 5));

  // O perfil pode não estar carregado no primeiro render (auth ainda
  // resolvendo). Quando ele chega, aplicamos a cidade do cadastro uma única
  // vez, sem sobrescrever ajustes que o usuário já tenha feito manualmente.
  const appliedProfileCity = useRef(Boolean(userProfile?.city));
  useEffect(() => {
    if (appliedProfileCity.current) return;
    if (userProfile?.city) {
      appliedProfileCity.current = true;
      setCity((prev) => (prev ? prev : userProfile.city));
      setRadius((prev) => (prev === 5 ? 25 : prev));
    }
  }, [userProfile?.city]);
  const createInterest = useCreateInterest();

  const firstName = (userProfile?.name || user?.displayName || '').split(' ')[0];

  const trimmedCity = city.trim();
  const radiusActive = Boolean(radius && hasKnownCoords(trimmedCity));
  // UMA query, sem filtros no servidor — todos os filtros estruturais e de
  // localização rodam no cliente. Isso elimina a matriz de índices compostos
  // que vinha derrubando o feed.
  const { data: fetchedPets = [], isLoading, isError } = usePetFeed();

  const { pets, locationFallback } = useMemo(() => applyFeedFilters(fetchedPets, {
    species: species === 'all' ? undefined : species,
    size: size === 'all' ? undefined : size,
    cityText: trimmedCity,
    radiusKm: radius,
    hideOwnerId: user?.uid && !showOwnPets ? user.uid : null,
  }), [fetchedPets, species, size, trimmedCity, radius, showOwnPets, user?.uid]);

  const priorityPets = useMemo(
    () => [...pets].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)),
    [pets],
  );

  function handleLike(petId) {
    if (!petId) return;
    if (!user) { navigate('/login'); return; }
    createInterest.mutate(petId, {
      onSuccess: () => toast.success('Interesse registrado! 🐾'),
      onError: () => toast.error('Não foi possível registrar o interesse.'),
    });
  }

  function handlePass() {
    // Sem persistência — só remove da pilha local, como no protótipo.
  }

  function handleOpenDetail(petId) {
    navigate(`/pets/${petId}`);
  }

  const hasFilters = species !== 'all' || size !== 'all' || Boolean(trimmedCity) || Boolean(radius);

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-6xl px-5 py-5.5 pb-12')}>
      <PageHero
        eyebrow="Feed"
        title={`Encontre seu novo melhor amigo${firstName ? `, ${firstName}` : ''}`}
        description={settings.ui_text.feed_hero_description}
      />

      {/* Chips de espécie */}
      <div className="mb-4 mt-6 flex gap-2 overflow-x-auto pb-0.5">
        {SPECIES_FILTERS.map((f) => (
          <FilterChip key={f.value} active={species === f.value} onClick={() => setSpecies(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </div>
      {/* Chips de porte */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1.5">
        {SIZE_FILTERS.map((f) => (
          <FilterChip key={f.value} active={size === f.value} onClick={() => setSize(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {/* Localização + raio */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[280px] flex-1 min-w-[200px]">
          <MapPin className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filtrar por cidade"
            className="h-[38px] rounded-full border-border bg-card pl-[38px] text-[12.5px]"
            aria-label="Filtrar por cidade"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Raio de busca em km">
          {RADIUS_OPTIONS.map((km) => (
            <FilterChip key={km} active={radius === km} onClick={() => setRadius((prev) => (prev === km ? null : km))}>
              {km} km
            </FilterChip>
          ))}
        </div>
      </div>
      {user && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-border/70 bg-card/80 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Mostrar meus pets no feed</p>
            <p className="text-xs text-muted-foreground">Use o controle para incluir ou ocultar pets cadastrados por você.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>{showOwnPets ? 'Exibindo' : 'Ocultando'}</span>
            <Switch
              checked={showOwnPets}
              onCheckedChange={setShowOwnPets}
              aria-label="Mostrar meus pets no feed"
            />
          </div>
        </div>
      )}
      {locationFallback ? (
        <LocationFallbackBanner cityText={trimmedCity} radius={radius} radiusActive={radiusActive} />
      ) : (
        <LocationHint cityText={trimmedCity} radiusActive={radiusActive} radius={radius} />
      )}

      {!isLoading && !isError && (
        <SwipeDeck
          key={`${species}-${size}-${trimmedCity}-${radius}-${showOwnPets}`}
          pets={priorityPets}
          onLike={handleLike}
          onPass={handlePass}
          onOpenDetail={handleOpenDetail}
        />
      )}

      <div>
        <h2 className="mb-4 font-['Sora'] text-[17px] font-bold text-foreground">Todos os pets disponíveis</h2>

        {isLoading && <FeedSkeleton />}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
            <p className="text-sm">Erro ao carregar pets. Tente novamente.</p>
          </div>
        )}

        {!isLoading && !isError && pets.length === 0 && (
          <FeedEmpty fetchedCount={fetchedPets.length} hasFilters={hasFilters} />
        )}

        {!isLoading && pets.length > 0 && (
          <>
            <AdSlot className="mb-2" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}