import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Formulário de avaliação pós-adoção. Exibido a quem ainda não avaliou a
 * outra parte de uma adoção concluída (ver PetDetail.jsx).
 */
export default function RatingForm({ ratedUid, ratedLabel, onSubmit, submitting }) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (stars === 0) {
      toast.error('Escolha de 1 a 5 estrelas.');
      return;
    }
    await onSubmit({ ratedUid, stars, comment });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Avalie {ratedLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                onMouseEnter={() => setHoverStars(n)}
                onMouseLeave={() => setHoverStars(0)}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 ${
                    n <= (hoverStars || stars) ? 'fill-orange-400 text-orange-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte como foi a experiência (opcional)"
            rows={3}
          />
          <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
