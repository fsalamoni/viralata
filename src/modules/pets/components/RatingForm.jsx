import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title">Avalie {ratedLabel}</h3>
      </div>
      <div className="arena-section-card-body">
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
                    n <= (hoverStars || stars) ? 'fill-highlight text-highlight' : 'text-muted-foreground/40'
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
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </form>
      </div>
    </section>
  );
}
