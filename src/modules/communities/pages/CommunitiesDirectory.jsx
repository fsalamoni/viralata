import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { listCommunities as getCommunities } from '../services/communityService';

export default function CommunitiesDirectory() {
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    getCommunities().then(setCommunities);
  }, []);

  return (
    <div className="arena-page mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Comunidades</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Participe de grupos de debates, encontre pessoas da sua região e compartilhe experiências.
          </p>
        </div>
        <Button asChild>
          <Link to="/comunidade/criar"><Plus className="mr-2 w-4 h-4" /> Criar Comunidade</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map(c => (
          <Card key={c.id} className="p-5 flex flex-col gap-3">
            <h3 className="font-bold text-lg">{c.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
            <Button asChild className="mt-auto" variant="outline">
              <Link to={`/comunidade/${c.id}`}>Ver Comunidade</Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
