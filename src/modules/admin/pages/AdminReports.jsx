import React, { useEffect, useState } from 'react';
import { getAllReports } from '@/modules/reports/services/reportService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminReports() {
  const { isPlatformAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    getAllReports().then(setReports).finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Denúncias de Maus-Tratos</h1>
      {loading ? <p className="text-gray-400">Carregando...</p> : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {r.created_at?.seconds ? format(new Date(r.created_at.seconds * 1000), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                </span>
                <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>{r.status}</Badge>
              </div>
              <p className="text-sm text-gray-700 line-clamp-3">{r.description}</p>
              {r.address && <p className="text-xs text-gray-400">📍 {r.address}</p>}
              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2">
                  {r.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-16 h-16 rounded object-cover border" />
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
