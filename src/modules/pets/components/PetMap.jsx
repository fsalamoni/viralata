/**
 * @fileoverview PetMap — mapa simplificado com pin da cidade (V3).
 *
 * TASK-V3-PET-DETAIL-4: mostra onde o pet está (cidade).
 * Sem dependências externas (Leaflet) — SVG inline com pin estilizado.
 *
 * Usa `lookupCityCoordsByName` do geoDistance para obter lat/lng.
 * Renderiza um mapa "estilizado" (gradiente creme + grid + pin central).
 *
 * Tokens: `bg-card`, `border-border`, `bg-primary` (pin), `text-foreground`.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Mapa"
 */
import { MapPin } from 'lucide-react';
import { lookupCityCoordsByName } from '@/modules/pets/domain/geoDistance';
import { cn } from '@/core/lib/utils';

export function PetMap({ city, state, className, height = 180 }) {
  const coords = lookupCityCoordsByName(city);
  if (!coords) return null;
  const [lat, lng] = coords;

  // Posição do pin no SVG (0..100% em ambos eixos)
  // Mapeia lat [-35, 5] para y [0, 100] (Brasil: Norte no topo)
  // Mapeia lng [-75, -35] para x [0, 100] (Leste no canto direito)
  const latToY = (lat) => ((5 - lat) / 40) * 100;
  const lngToX = (lng) => ((lng + 75) / 40) * 100;
  const x = Math.max(8, Math.min(92, lngToX(lng)));
  const y = Math.max(8, Math.min(92, latToY(lat)));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
      style={{ height }}
      data-testid="pet-map"
      role="img"
      aria-label={`Localização aproximada: ${city}${state ? `, ${state}` : ''}`}
    >
      {/* Background gradient + grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-card to-secondary/10" />
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Linhas horizontais (latitudes) */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0" y1={(i + 1) * 20} x2="100" y2={(i + 1) * 20}
            stroke="currentColor" strokeWidth="0.2" className="text-muted-foreground"
          />
        ))}
        {/* Linhas verticais (longitudes) */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={(i + 1) * 20} y1="0" x2={(i + 1) * 20} y2="100"
            stroke="currentColor" strokeWidth="0.2" className="text-muted-foreground"
          />
        ))}
      </svg>

      {/* Pin */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(193,82,42,0.6)] ring-4 ring-card">
          <MapPin className="h-4 w-4" fill="currentColor" />
        </div>
        <div className="-mt-0.5 h-2 w-1.5 rounded-b-full bg-primary/40" />
        <div className="mt-0.5 h-1 w-3 rounded-full bg-primary/20 blur-[1px]" />
      </div>

      {/* Label da cidade */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-xl bg-card/85 px-2.5 py-1.5 text-[12px] backdrop-blur-sm">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          {city}
        </span>
        {state && <span className="text-[10.5px] text-muted-foreground">UF {state}</span>}
      </div>
    </div>
  );
}
