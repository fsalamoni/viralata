import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getPriorityLabel } from '../domain/priority';

const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', other: '🐾' };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

export default function PetCard({ pet }) {
  const priorityLabel = getPriorityLabel(pet.priority_score ?? 0);
  const photo = pet.photos?.[0] || '/placeholder-pet.svg';

  return (
    <Link
      to={`/pets/${pet.id}`}
      className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={photo}
          alt={pet.title || pet.name || 'Pet para adoção'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {priorityLabel && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-orange-500 text-white text-xs font-semibold px-2 py-0.5">
              ⭐ {priorityLabel}
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2 text-xl">
          {SPECIES_EMOJI[pet.species] || '🐾'}
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-gray-900 truncate">
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
            <Badge variant="outline" className="text-xs text-green-700 border-green-300">Castrado</Badge>
          )}
          {pet.vaccinated === 'yes' && (
            <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">Vacinado</Badge>
          )}
        </div>
        {(pet.city || pet.state) && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3" />
            <span>{[pet.city, pet.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
