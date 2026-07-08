import React from 'react';
import { Copy, Check, Hash, MapPin } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useClipboard } from '@/core/lib/useClipboard';
import { Button } from '@/components/ui/button';

export default function AboutTab({ community }) {
  const { user } = useAuth();
  const { copy, copied } = useClipboard();
  const isOwner = Boolean(user?.uid) && user.uid === community.owner_id;
  const location = [community.city, community.state].filter(Boolean).join(' / ');

  return (
    <div className="space-y-4">
      <div className="p-6 bg-card border border-border rounded-3xl space-y-4">
        <h3 className="font-bold text-lg">Sobre a Comunidade</h3>
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
          {community.description || 'Esta comunidade ainda não adicionou uma descrição.'}
        </p>
        {location && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {location}
          </p>
        )}
      </div>

      {isOwner && community.invite_code && (
        <div className="p-6 bg-card border border-border rounded-3xl">
          <h3 className="flex items-center gap-2 font-bold text-lg">
            <Hash className="h-5 w-5 text-primary" /> Código de convite
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compartilhe este código para outras pessoas entrarem direto pela página de Comunidades.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-secondary px-4 py-2 font-mono text-lg font-bold tracking-[0.25em] text-foreground">
              {community.invite_code}
            </span>
            <Button variant="outline" size="sm" onClick={() => copy(community.invite_code, 'Código copiado!')}>
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
