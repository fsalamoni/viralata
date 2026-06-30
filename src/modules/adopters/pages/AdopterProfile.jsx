import React from 'react';
import { useParams } from 'react-router-dom';
// Perfil de adotante — a ser implementado na Fase 2
export default function AdopterProfile() {
  const { uid } = useParams();
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
      <p>Perfil do adotante — em breve.</p>
    </div>
  );
}
