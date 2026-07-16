import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary p-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-lg text-foreground">Página não encontrada.</p>
        <p className="mt-2 text-sm text-muted-foreground">Talvez você tenha digitado um endereço errado.</p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
}
