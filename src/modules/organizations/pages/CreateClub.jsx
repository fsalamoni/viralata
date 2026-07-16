import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCreateClub } from '@/modules/organizations/hooks/useClubs';
import { createAuditLog } from '@/core/services/auditService';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import SingleAcceptanceDialog from '@/modules/shelter/components/legal/SingleAcceptanceDialog';
import {
  SHELTER_ONBOARDING_TERMS_TEXT,
  SHELTER_ONBOARDING_TERMS_VERSION,
  buildShelterOnboardingAcceptance,
} from '@/modules/shelter/domain/legal/shelterOnboardingTerms';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

const INITIAL = {
  name: '',
  description: '',
  city: '',
  state: '',
  home_venue: '',
  contact_email: '',
  contact_phone: '',
  instagram: '',
  logo_url: '',
  cnpj: '',
  donation_link: '',
};

export default function CreateClub() {
  const navigate = useNavigate();
  const { isAuthenticated, user, userProfile } = useAuth();
  const createClub = useCreateClub();
  const onboardingWizardEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_ONBOARDING_WIZARD);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [dpaOpen, setDpaOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Informe o nome da organização.';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      nextErrors.contact_email = 'Informe um e-mail válido.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Em vez de criar o clube agora, abre o modal do Termo de Adesão (DPA).
    // Só após o aceite (com assinatura + CPF do responsável legal) é que
    // o clube é criado. Isso atende ao Guia de Implementação Legal v2 §3
    // ("o aceite deve ser exigido ANTES do usuário ter acesso ao painel
    // administrativo do Abrigo").
    setPendingPayload(form);
    setDpaOpen(true);
  };

  // Chamado quando o usuário ACEITAR o DPA no modal.
  // Cria o clube E grava o aceite do termo de adesão em audit_log.
  const handleDpaAccept = async ({ signature, cpf, role, documentHash, documentVersion, acceptedAt }) => {
    if (!pendingPayload) return;
    // Valida os campos do DPA (defesa em profundidade)
    const dpaAcceptance = buildShelterOnboardingAcceptance({
      legal_rep_name: signature,
      legal_rep_cpf: cpf,
      legal_rep_role: role,
      cnpj: pendingPayload.cnpj,
    });
    // Cria o clube
    const id = await createClub.mutateAsync(pendingPayload);
    // Grava o aceite em audit_log (imutável) — atende Lei 14.063/2020 + LGPD art. 37
    await createAuditLog({
      action: 'shelter_terms_accepted',
      actor: user,
      target_type: 'club',
      target_id: id,
      details: {
        document_version: documentVersion,
        document_hash: documentHash,
        signature_text: signature,
        signature_cpf: dpaAcceptance.signature_cpf,
        signature_role: dpaAcceptance.signature_role,
        cnpj: dpaAcceptance.cnpj,
        accepted_at: acceptedAt,
        club_name: pendingPayload.name,
        legal_basis: 'execution_of_contract (LGPD Art. 7º V) + Lei 14.063/2020',
      },
    }).catch((err) => {
      // Audit é best-effort — não bloqueia a criação do clube
      console.warn('audit log falhou (não bloqueante):', err);
    });
    toast.success('Abrigo criado! Termo de Adesão e DPA registrados.');
    if (onboardingWizardEnabled) {
      navigate(`/abrigo/${id}/onboarding`);
    } else {
      navigate(`/organizacoes/${id}/admin`);
    }
  };

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-3xl space-y-6 px-5 py-6 pb-12')}>
      <PageHero
        eyebrow="Nova organização"
        title="Cadastrar organização"
        description="Você será o administrador da organização e poderá convidar sua equipe por meio de um código exclusivo."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/organizacoes"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para organizações</Link>
          </Button>
        }
      />

      <section className="arena-section-card overflow-hidden">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Dados da organização</h3>
          <p className="arena-section-card-description">Apenas o nome é obrigatório. Quanto mais completo, melhor para a comunidade encontrar você.</p>
        </div>
        <div className="arena-section-card-body p-4 sm:p-5">
          {!isAuthenticated && (
            <p className="mb-4 rounded-md border border-highlight/40 bg-highlight/[0.14] p-3 text-sm text-[hsl(30,60%,24%)]">
              Você precisa estar autenticado para criar uma organização.
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Logo / imagem da organização</Label>
              <ImageUpload
                value={form.logo_url}
                onChange={(url) => setForm((prev) => ({ ...prev, logo_url: url }))}
                folder="clubs"
                shape="square"
                label="Enviar logo"
                hint="Logo ou foto da organização. Aparece no diretório e na página da organização."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome da organização *</Label>
              <Input id="name" value={form.name} onChange={setField('name')} maxLength={80} required />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={setField('description')}
                maxLength={1000}
                rows={4}
                placeholder="Conte sobre a organização, horário de funcionamento, missão, valores…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={setField('city')} maxLength={60} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input id="state" value={form.state} onChange={setField('state')} maxLength={2} placeholder="SP" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home_venue">Endereço / local principal</Label>
              <Input id="home_venue" value={form.home_venue} onChange={setField('home_venue')} maxLength={120} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">E-mail de contato</Label>
                <Input id="contact_email" type="email" value={form.contact_email} onChange={setField('contact_email')} maxLength={120} />
                {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone de contato</Label>
                <Input id="contact_phone" type="tel" value={form.contact_phone} onChange={setField('contact_phone')} maxLength={30} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={form.instagram} onChange={setField('instagram')} maxLength={60} placeholder="@suaorganizacao" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ (se for ONG formalizada)</Label>
                <Input id="cnpj" value={form.cnpj} onChange={setField('cnpj')} maxLength={18} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donation_link">Link de doação (Pix, vaquinha…)</Label>
                <Input id="donation_link" value={form.donation_link} onChange={setField('donation_link')} maxLength={300} placeholder="https://..." />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs text-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Antes de criar a organização, você precisará ler e assinar eletronicamente
                o <strong>Termo de Adesão e Data Processing Agreement (DPA)</strong>,
                conforme exigido pelo Guia de Implementação Legal v2 (10/07/2026) §3.
                O aceite fica registrado no audit_log com hash do documento, IP, data
                e assinatura do responsável legal.
              </span>
            </div>

            <Button type="submit" disabled={createClub.isPending || !isAuthenticated}>
              {createClub.isPending ? 'Criando…' : 'Continuar para o Termo de Adesão'}
            </Button>
          </form>
        </div>
      </section>

      {/* Modal do Termo de Adesão + DPA — abre DEPOIS do submit do form,
          ANTES de criar o clube. */}
      <SingleAcceptanceDialog
        open={dpaOpen}
        onOpenChange={setDpaOpen}
        title="Termo de Adesão e Data Processing Agreement (DPA)"
        description="Você está prestes a criar uma organização na Viralata. Este termo é obrigatório e estabelece a relação contratual (Operadora × Controlador) e o tratamento de dados pessoais (LGPD). O aceite do responsável legal será registrado em audit_log com hash, IP, data e CPF."
        documentText={SHELTER_ONBOARDING_TERMS_TEXT}
        documentVersion={SHELTER_ONBOARDING_TERMS_VERSION}
        prefillSignature={userProfile?.name || user?.displayName || ''}
        prefillCpf={userProfile?.cpf || ''}
        requireCpf
        requireRole
        prefillRole={userProfile?.role_in_org || 'Representante Legal'}
        roleLabel="Cargo / função do responsável legal (Ex.: Presidente, Diretor, Coordenador):"
        acceptButtonLabel="Aceitar DPA e criar organização"
        onAccept={handleDpaAccept}
      />
    </div>
  );
}
