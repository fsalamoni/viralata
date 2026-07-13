/**
 * @fileoverview ShelterContractsList — lista de contratos do abrigo (TASK-288).
 * Rota: /abrigos/:shelterId/contracts
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ContractCard } from '../components/ContractCard';
import { listContractsByClub, shelterSignContract } from '../services/contractsService';
import { useQuery } from '@tanstack/react-query';

export function ShelterContractsList({ clubId }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: contracts = [], isLoading, refetch } = useQuery({
    queryKey: ['contracts', 'club', clubId],
    queryFn: () => listContractsByClub(clubId),
    enabled: !!clubId && !!user,
  });

  const filtered = contracts.filter((c) =>
    !search || c.id.toLowerCase().includes(search.toLowerCase())
    || c.pet_id.toLowerCase().includes(search.toLowerCase())
    || c.adopter_uid.toLowerCase().includes(search.toLowerCase()),
  );

  const onSign = async (contractId) => {
    if (!user) return;
    const representativeName = user.displayName || 'Representante';
    await shelterSignContract({
      clubId, contractId,
      representativeUid: user.uid,
      representativeName,
      signatureText: representativeName,
    }, { uid: user.uid, displayName: representativeName });
    refetch();
  };

  const onDownload = (pdfPath) => {
    // Storage path → URL pública. Cloud Function pode gerar signed URL.
    window.open(`https://storage.googleapis.com/${pdfPath}`, '_blank');
  };

  if (!user) return <p className="p-4">Faça login para ver contratos.</p>;

  return (
    <div className="space-y-4">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Contratos do abrigo</h1>
        <p className="text-muted-foreground">Gerencie contratos de adoção assinados digitalmente (Lei 14.063/2020)</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Buscar por pet, adotante ou ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>
      {isLoading && <p>Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground">Nenhum contrato encontrado.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <ContractCard
            key={c.id}
            contract={c}
            onDownload={onDownload}
            onSign={onSign}
            canSign
          />
        ))}
      </div>
    </div>
  );
}
