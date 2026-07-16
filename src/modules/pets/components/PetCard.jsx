import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Sparkles, Dog, Cat, Rabbit, Bird, PawPrint, ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { getPriorityLabel } from '../domain/priority';

const SPECIES_ICON = { dog: Dog, cat: Cat, rabbit: Rabbit, bird: Bird, other: PawPrint };
const SPECIES_MATERIAL = { dog: 'pets', cat: 'pets', rabbit: 'cruelty_free', bird: 'flutter_dash', other: 'pets' };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

/**
 * DS_V2_PAGES-PETS — PetCard (referência canônica da spec §3.3)
 *
 *  - Imagem: aspect-ratio 1.3 (spec), object-cover
 *  - Cantos 22px (`rounded-[22px]`)
 *  - Padding 16px (`p-4`)
 *  - Título Sora 16px font-bold
 *  - Metadados Manrope 12px
 *  - Botão terciário full-width ao final
 *  - Hover-lift (scale 1.01-1.02 + sombra crescente)
 *  - Sem tilt 3D
 *  - Glass effect (arena-panel)
 */
export default function PetCard({ pet }) {
  const priorityLabel = getPriorityLabel(pet.priority_score ?? 0);
  const photo = pet.photos?.[0] || '/placeholder-pet.svg';
  const SpeciesIcon = SPECIES_ICON[pet.species] || PawPrint;
  const speciesMaterial = SPECIES_MATERIAL[pet.species] || 'pets';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/pets/${pet.id}`} className="block">
        <Card
          size="pet"
          interactive
          className="group overflow-hidden hover:shadow-[0_28px_70px_-26px_rgba(64,34,18,0.4)]"
        >
          <div className="relative aspect-[1.3] overflow-hidden bg-secondary">
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
            <div className="absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-primary backdrop-blur-md">
              <Icon name={speciesMaterial} size={18} filled className="text-primary" />
            </div>
          </div>

          <CardHeader size="pet" className="space-y-1.5">
            <CardTitle size="pet" asChild>
              <h3>{pet.title || pet.name || 'Pet para adoção'}</h3>
            </CardTitle>
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
          </CardHeader>

          <CardContent size="pet" className="flex items-center justify-between gap-2 pt-0">
            {(pet.city || pet.state) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{[pet.city, pet.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-primary">
              Ver perfil
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
