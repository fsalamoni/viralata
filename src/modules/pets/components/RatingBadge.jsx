import React from 'react';
import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getRatingsForUser, summarizeRatings } from '../services/ratingService';

/** Badge compacto com a média de avaliações recebidas por um usuário/organização. */
export default function RatingBadge({ uid, className = '' }) {
  const { data: ratings = [] } = useQuery({
    queryKey: ['adoption_ratings', 'user', uid],
    queryFn: () => getRatingsForUser(uid),
    enabled: Boolean(uid),
    staleTime: 1000 * 60 * 5,
  });
  const { avg, count } = summarizeRatings(ratings);

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-amber-700 ${className}`}>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      {avg.toFixed(1)} <span className="text-gray-400 font-normal">({count})</span>
    </span>
  );
}
