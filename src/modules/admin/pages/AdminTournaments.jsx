import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
// Página legada do pickleball — redirecionada para o dashboard admin do viralata
export default function AdminTournaments() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
      <p className="text-gray-400">Esta página foi substituída pelo painel administrativo do Viralata.</p>
      <Button asChild variant="outline">
        <Link to="/admin">Ir para o Painel Admin</Link>
      </Button>
    </div>
  );
}
