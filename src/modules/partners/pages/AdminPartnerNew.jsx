/**
 * @fileoverview AdminPartnerNew — create new partner (wrapper that uses PartnerForm in full-page mode).
 *
 * Rota: /admin/parceiros/novo
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.2
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useCreatePartner } from '../hooks/usePartners';
import { PartnerForm } from '../components/PartnerForm';

export default function AdminPartnerNew() {
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1);
  const createPartner = useCreatePartner();
  const [open, setOpen] = useState(true);

  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-new">
        <Seo title="Novo Parceiro" description="Criar novo parceiro." />
        <EmptyState icon={AlertCircle} title="Funcionalidade desabilitada" description="Flag ADMIN_PARTNER_SPACES_V1 está OFF." />
      </div>
    );
  }
  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="admin-partner-new">
        <Seo title="Acesso restrito" description="Apenas platform_admin." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Apenas platform_admin pode criar parceiros.
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-6 pb-24" data-testid="admin-partner-new">
      <Seo title="Novo Parceiro" description="Criar novo parceiro." />

      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/admin/parceiros">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Voltar para Parceiros
          </Link>
        </Button>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Parceiros', href: '/admin/parceiros' },
            { label: 'Novo' },
          ]}
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <Megaphone className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-extrabold text-foreground sm:text-2xl">Novo parceiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha o formulário abaixo para criar.</p>
      </div>

      <PartnerForm
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) navigate('/admin/parceiros');
        }}
        onSubmit={async (data) => {
          const result = await createPartner.mutateAsync(data);
          if (result?.id) {
            navigate(`/admin/parceiros/${result.id}`);
          } else {
            navigate('/admin/parceiros');
          }
        }}
      />
    </div>
  );
}
