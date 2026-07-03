import React from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { AuditLogTable } from '@/components/AuditLogTable';
import { ScrollText } from 'lucide-react';

export default function AdminAuditLog() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  return (
    <div className="arena-page max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
      </div>
      <AuditLogTable
        title="Trilha de auditoria da plataforma"
        description="Todas as ações relevantes registradas no sistema — clubes, pets, adoções, denúncias e moderação."
      />
    </div>
  );
}
