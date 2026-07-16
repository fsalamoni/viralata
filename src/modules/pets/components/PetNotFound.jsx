import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft } from 'lucide-react';

/**
 * Empty state quando o pet não é encontrado / removido / não existe.
 * Oferece caminhos de saída (voltar ou explorar feed) em vez de só
 * mostrar "Pet não encontrado" sem ação.
 */
export default function PetNotFound({ petId }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <section className="arena-section-card rounded-[1.75rem] border-dashed">
        <div className="arena-section-card-body flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Pet não encontrado</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {petId
                ? `O pet ${petId} não existe, foi removido pelo responsável, ou está em uma região que você não tem acesso.`
                : 'Este pet não existe ou foi removido.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button asChild>
              <Link to="/feed">Explorar pets no feed</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}