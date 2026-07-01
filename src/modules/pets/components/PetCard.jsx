import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, Dog, Cat, Rabbit, Bird, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPriorityLabel } from '../domain/priority';

const SPECIES_ICON = { dog: Dog, cat: Cat, rabbit: Rabbit, bird: Bird, other: PawPrint };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

export default function PetCard({ pet }) {
  const priorityLabel = getPriorityLabel(pet.priority_score ?? 0);
  const photo = pet.photos?.[0] || '/placeholder-pet.svg';
  const SpeciesIcon = SPECIES_ICON[pet.species] || PawPrint;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <Link
        to={`/pets/${pet.id}`}
        className="group block overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/90 shadow-[0_18px_40px_-28px_rgba(64,34,18,0.35)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_24px_46px_-24px_rgba(64,34,18,0.5)]"
      >
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={photo}
            alt={pet.title || pet.name || 'Pet para adoção'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {priorityLabel && (
            <div className="absolute top-2.5 left-2.5">
              <Badge className="bg-highlight text-highlight-foreground text-xs font-semibold px-2 py-0.5 shadow-sm">
                <Sparkles className="w-3 h-3 mr-1" />{priorityLabel}
              </Badge>
            </div>
          )}
          <div className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/80 text-primary backdrop-blur-md">
            <SpeciesIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="p-3.5 space-y-1.5">
          <h3 className="font-semibold text-foreground truncate">
            {pet.title || pet.name || 'Pet para adoção'}
          </h3>
          <div className="flex flex-wrap gap-1">
            {pet.size && (
              <Badge variant="secondary" className="text-xs">{SIZE_LABEL[pet.size]}</Badge>
            )}
            {pet.age_group && (
              <Badge variant="secondary" className="text-xs">{AGE_LABEL[pet.age_group]}</Badge>
            )}
            {pet.neutered && (
              <Badge variant="success" className="text-xs">Castrado</Badge>
            )}
            {pet.vaccinated === 'yes' && (
              <Badge variant="outline" className="text-xs">Vacinado</Badge>
            )}
          </div>
          {(pet.city || pet.state) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{[pet.city, pet.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
