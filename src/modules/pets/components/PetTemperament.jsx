/**
 * @fileoverview PetTemperament — badges de temperamento do pet (V3).
 *
 * TASK-V3-PET-DETAIL-3: exibe traits do pet com ícones Sora.
 * Baseado em `pet.temperament: string[]` no Firestore.
 *
 * Traits suportados (com ícone + label):
 *  - calm, playful, shy, sociable, energetic, loyal, independent, gentle
 *
 * Tokens: `bg-secondary`, `text-secondary-foreground`. Sem cores hard-coded.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Temperamento"
 */
import { Smile, Zap, Heart, Users, Sparkles, Shield, Wind, HandHeart } from 'lucide-react';
import { cn } from '@/core/lib/utils';

const TRAITS = {
  calm: { label: 'Calmo', icon: Smile, color: 'bg-secondary text-secondary-foreground' },
  playful: { label: 'Brincalhão', icon: Sparkles, color: 'bg-secondary text-secondary-foreground' },
  shy: { label: 'Tímido', icon: Wind, color: 'bg-secondary text-secondary-foreground' },
  sociable: { label: 'Sociável', icon: Users, color: 'bg-secondary text-secondary-foreground' },
  energetic: { label: 'Energético', icon: Zap, color: 'bg-secondary text-secondary-foreground' },
  loyal: { label: 'Leal', icon: Shield, color: 'bg-secondary text-secondary-foreground' },
  independent: { label: 'Independente', icon: Wind, color: 'bg-secondary text-secondary-foreground' },
  gentle: { label: 'Dócil', icon: HandHeart, color: 'bg-secondary text-secondary-foreground' },
  affectionate: { label: 'Carinhoso', icon: Heart, color: 'bg-secondary text-secondary-foreground' },
};

export function PetTemperament({ traits = [], className, max = 5 }) {
  if (!Array.isArray(traits) || traits.length === 0) return null;

  const visible = traits.slice(0, max);
  const remaining = Math.max(0, traits.length - max);

  return (
    <div
      className={cn('flex flex-wrap gap-1.5', className)}
      role="list"
      aria-label="Temperamento do pet"
      data-testid="pet-temperament"
    >
      {visible.map((trait) => {
        const normalized = String(trait).toLowerCase().trim();
        const def = TRAITS[normalized] || { label: trait, icon: Sparkles };
        const Icon = def.icon;
        return (
          <span
            key={trait}
            role="listitem"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
              def.color,
            )}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {def.label}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
