import React from 'react';
import { useParams } from 'react-router-dom';
export default function AthleteProfile() {
  const { uid } = useParams();
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
      <p>Perfil do adotante — em breve.</p>
    </div>
  );
}
