/**
 * @fileoverview SimilarPets — seção "Pets similares" na página do pet.
 *
 * Gated por feature flag `SHELTER_SIMILAR_PETS`.
 * Mostra até 6 cards horizontais (scroll snap) de pets com espécie/porte/idade
 * compatíveis, ordenados por score de similaridade.
 *
 * Requer `useSimilarPets(pet)` como prop.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, PawPrint, Dog, Cat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PetCard from './PetCard';

const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };

function SimilarPetCard({ pet }) {
  const photo = pet.photos?.[0] || '/placeholder-pet.svg';
  const SpeciesIcon = pet.species === 'dog' ? Dog : pet.species === 'cat' ? Cat : PawPrint;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Link
        to={`/pets/${pet.id}`}
        className="group flex-shrink-0 w-52 overflow-hidden rounded-2xl border bg-card shadow transition-all hover:shadow-lg hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={photo}
            alt={pet.title || pet.name || 'Pet'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <SpeciesIcon className="h-3 w-3" />
              {SPECIES_LABEL[pet.species] || pet.species}
            </span>
          </div>
        </div>
        <div className="p-3">
          <p className="truncate font-semibold text-sm">{pet.title || pet.name || 'Pet'}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {[pet.size && pet.size !== 'medium' ? pet.size : null, pet.age_group ? pet.age_group : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {pet.city && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{pet.city}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function SimilarPets({ pet, similarPets = [], isLoading }) {
  return (
    <section className="not-prose" aria-label="Pets similares">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-primary" />
          Pets similares
        </h2>
        <Link
          to={`/pets?species=${pet?.species || ''}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Ver mais <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading && (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-52 flex-shrink-0">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="mt-2 space-y-1 px-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && similarPets.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          Nenhum pet similar encontrado.
        </p>
      )}

      {!isLoading && similarPets.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {similarPets.map((p) => (
            <div key={p.id} className="snap-start">
              <SimilarPetCard pet={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
