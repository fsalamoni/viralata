import React from 'react';
export default function AboutTab({ community }) {
  return (
    <div className="p-6 bg-card border border-border rounded-3xl">
      <h3 className="font-bold text-lg mb-4">Sobre a Comunidade</h3>
      <p className="whitespace-pre-wrap">{community.description}</p>
    </div>
  );
}
