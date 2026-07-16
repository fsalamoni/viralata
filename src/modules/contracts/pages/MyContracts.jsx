/**
 * @fileoverview MyContracts — contratos do adotante (TASK-288).
 * Rota: /perfil/contratos
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { ContractCard } from '../components/ContractCard';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

export function MyContracts() {
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(collectionGroup(db, 'contracts'), where('adopter_uid', '==', user.uid));
        const snap = await getDocs(q);
        setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const onDownload = (pdfPath) => {
    window.open(`https://storage.googleapis.com/${pdfPath}`, '_blank');
  };

  if (!user) return <p className="p-4">Faça login para ver seus contratos.</p>;

  return (
    <div className="space-y-4">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Meus contratos de adoção</h1>
        <p className="text-muted-foreground">Seus contratos assinados digitalmente (Lei 14.063/2020)</p>
      </div>
      {isLoading && <p>Carregando…</p>}
      {!isLoading && contracts.length === 0 && (
        <section className="arena-section-card">
          <div className="arena-section-card-body p-4 text-muted-foreground">
            Você ainda não tem contratos de adoção assinados.
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.map((c) => (
          <ContractCard
            key={c.id}
            contract={c}
            onDownload={onDownload}
            canSign={false}
          />
        ))}
      </div>
    </div>
  );
}
