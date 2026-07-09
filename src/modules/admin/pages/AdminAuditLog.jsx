import React from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { AuditLogTable } from '@/components/AuditLogTable';
import { ScrollText } from 'lucide-react';
import PageHero from '@/components/PageHero';

export default function AdminAuditLog() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6">
      <PageHero
        eyebrow="Admin"
        title="Auditoria"
        description="Trilha de auditoria da plataforma. Todas as ações relevantes registradas no sistema — organizações, pets, adoções, denúncias e moderação."
        actions={<ScrollText className="h-5 w-5 text-orange-100" />}
      />
      <AuditLogTable
        title="Trilha de auditoria da plataforma"
        description="Todas as ações relevantes registradas no sistema — organizações, pets, adoções, denúncias e moderação."
      />
    </div>
  );
}
