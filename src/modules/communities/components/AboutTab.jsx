import React from 'react';

export default function AboutTab({ community }) {
  return (
    <div className="p-6 bg-card border border-border rounded-3xl relative group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-lg">Sobre a Comunidade</h3>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
        {community.description || 'Nenhuma descrição fornecida.'}
      </p>
    </div>
  );
}
