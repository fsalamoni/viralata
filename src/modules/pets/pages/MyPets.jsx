import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyPets } from '../hooks/usePets';
import PetCard from '../components/PetCard';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function MyPets() {
  const { user } = useAuth();
  const { data: pets = [], isLoading } = useMyPets(user?.uid);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meus Pets</h1>
        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
          <Link to="/pets/new"><PlusCircle className="w-4 h-4 mr-2" /> Cadastrar Pet</Link>
        </Button>
      </div>
      {isLoading && <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}</div>}
      {!isLoading && pets.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>Você ainda não cadastrou nenhum pet.</p>
          <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
            <Link to="/pets/new">Cadastrar meu primeiro pet</Link>
          </Button>
        </div>
      )}
      {!isLoading && pets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      )}
    </div>
  );
}
