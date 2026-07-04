import React from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { AuditLogTable } from '@/components/AuditLogTable';
import { ScrollText } from 'lucide-react';

export default function AdminAuditLog() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
      </div>
      <AuditLogTable
        title="Trilha de auditoria da plataforma"
        description="Todas as ações relevantes registradas no sistema — organizações, pets, adoções, denúncias e moderação."
      />
    </div>
  );
}
