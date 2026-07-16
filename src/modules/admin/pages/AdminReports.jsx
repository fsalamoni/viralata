import React, { useEffect, useState } from 'react';
import { getAllReports } from '@/modules/reports/services/reportService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

export default function AdminReports() {
  const { isPlatformAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-4 py-6');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    getAllReports().then(setReports).finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) return null;

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Denúncias"
        title="Denúncias de Maus-Tratos"
        description="Denúncias enviadas pelo público. Apenas o admin master tem acesso. Cada denúncia pode gerar um PDF formatado para entrega à Delegacia."
      />
      {loading ? <p className="text-muted-foreground">Carregando...</p> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {r.created_at?.seconds ? format(new Date(r.created_at.seconds * 1000), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                </span>
                <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>{r.status}</Badge>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-3">{r.description}</p>
              {r.address && <p className="text-xs text-muted-foreground">📍 {r.address}</p>}
              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2">
                  {r.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-16 h-16 rounded object-cover border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
