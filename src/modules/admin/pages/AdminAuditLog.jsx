import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Shield } from 'lucide-react';
import { AuditLogTable } from '@/components/AuditLogTable';
import { ScrollText } from 'lucide-react';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

/**
 * AdminAuditLog — trilha de auditoria da plataforma.
 * Ver TASK-859: auditoria DS_V2, access denied consistente.
 */
export default function AdminAuditLog() {
  const { isPlatformAdmin } = useAuth();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl space-y-6 px-4 py-6');
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');

  if (!isPlatformAdmin) {
    return (
      <div className={deniedClass}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva do administrador da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
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
