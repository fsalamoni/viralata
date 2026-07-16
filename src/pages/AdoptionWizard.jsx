/**
 * @fileoverview AdoptionWizard — wizard público "Quero adotar"
 * (TASK-127 + TASK-128 / Regra A Eixo 1).
 *
 * Rota: /quero-adotar/:petId (auth required — o submit precisa de
 * applicant_uid; visitante anônimo é levado ao /login pelo guard).
 *
 * 5 steps:
 *   1. Confirmar pet      — foto, nome, abrigo
 *   2. Sobre você         — dados do adotante (prefill do perfil)
 *   3. Questionário       — moradia, outros pets, crianças, motivação
 *   4. Termo de Adoção    — texto integral + clickwrap + assinatura
 *   5. Confirmação        — resumo + protocolo
 *
 * O submit usa `submitAdoptionApplication` (adoption_workflow do
 * abrigo) com aceite v2 (hash SHA-256 — Lei 14.063/2020). Disponível
 * apenas para pets de organização (owner_type === 'organization');
 * pets de tutor individual seguem o fluxo de interesse do PetDetail.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, PawPrint, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePet } from '@/modules/pets/hooks/usePets';
import { useSubmitApplication } from '@/modules/shelter/hooks/useAdoptionApplications';
import {
  ADOPTION_TERMS_TEXT,
  ADOPTION_TERMS_VERSION,
} from '@/modules/shelter/domain/legal/adoptionTerms';
import Seo from '@/components/Seo';

const STEPS = ['Pet', 'Sobre você', 'Questionário', 'Termo', 'Revisão', 'Confirmação'];

export default function AdoptionWizard() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto w-full max-w-2xl px-4 py-6 sm:px-6');
  const { user, userProfile } = useAuth();
  const { data: pet, isLoading } = usePet(petId);
  const submitMutation = useSubmitApplication();

  const [step, setStep] = useState(0);
  const [applicationId, setApplicationId] = useState(null);
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || user?.displayName || '',
    email: user?.email || '',
    phone: userProfile?.phone || '',
    living_arrangement: '',
    has_yard: false,
    has_other_pets: false,
    other_pets_description: '',
    has_children: false,
    landlord_allows_pets: false,
    reason_to_adopt: '',
    agreed_to_home_visit: false,
    agreed_to_follow_up: false,
  });
  const [signature, setSignature] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const termsRef = useRef(null);

  const isOrgPet = pet?.owner_type === 'organization';
  const shelterClubId = isOrgPet ? pet?.owner_id : null;

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const stepValid = useMemo(() => {
    if (step === 1) return form.full_name.trim().length >= 2;
    if (step === 2) return form.reason_to_adopt.trim().length >= 10;
    if (step === 3) return accepted && signature.trim().length >= 3;
    return true;
  }, [step, form, accepted, signature]);

  const handleTermsScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setScrolledToEnd(true);
  };

  const handleSubmit = async () => {
    try {
      const applicant_form = {
        full_name: form.full_name.trim(),
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.living_arrangement ? { living_arrangement: form.living_arrangement } : {}),
        has_yard: form.has_yard,
        has_other_pets: form.has_other_pets,
        ...(form.other_pets_description ? { other_pets_description: form.other_pets_description } : {}),
        has_children: form.has_children,
        landlord_allows_pets: form.landlord_allows_pets,
        reason_to_adopt: form.reason_to_adopt.trim(),
        agreed_to_home_visit: form.agreed_to_home_visit,
        agreed_to_follow_up: form.agreed_to_follow_up,
      };
      const result = await submitMutation.mutateAsync({
        input: {
          pet_id: petId,
          shelter_club_id: shelterClubId,
          applicant_form,
          terms_signature_text: signature.trim(),
        },
        actor: { uid: user.uid, displayName: user.displayName, email: user.email },
      });
      setApplicationId(result.id);
      setStep(4);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o pedido.');
    }
  };

  if (isLoading) {
    return (
      <div className={wrapperClass}>
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="mt-4 h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!pet || !isOrgPet) {
    return (
      <div className={wrapperClass}>
        <EmptyState
          icon={PawPrint}
          title={pet ? 'Este pet não usa o fluxo de adoção do abrigo' : 'Pet não encontrado'}
          description={pet
            ? 'Para este pet, demonstre interesse direto na página do pet — o responsável entra em contato.'
            : 'O pet pode ter sido removido ou o link está incorreto.'}
          action={
            <Button asChild variant="outline">
              <Link to={pet ? `/pet/${petId}` : '/feed'}>{pet ? 'Ir para a página do pet' : 'Ver pets disponíveis'}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <Seo title={`Quero adotar ${pet.name || ''}`} description="Wizard de adoção responsável." />
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to={`/pet/${petId}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao pet
        </Link>
      </Button>

      {/* Stepper */}
      <ol className="mb-4 flex items-center gap-1.5" aria-label="Etapas do pedido de adoção">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`}
              aria-hidden
            />
            <span className={`text-[10px] ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
        {step === 0 && (
          <>
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Confirme o pet</h3>
              <p className="arena-section-card-description">Você está iniciando um pedido de adoção responsável.</p>
            </div>
            <div className="arena-section-card-body space-y-4 p-0">
              <div className="flex items-center gap-4">
                <img
                  src={pet.photos?.[0] || '/placeholder-pet.svg'}
                  alt={pet.name || 'Pet'}
                  className="h-20 w-20 rounded-2xl border border-border object-cover"
                />
                <div>
                  <p className="text-lg font-semibold">{pet.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[pet.species, pet.breed, pet.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                O pedido será analisado pelo abrigo responsável. Você acompanha o andamento em{' '}
                <span className="font-medium text-foreground">Perfil → Minhas adoções</span>.
              </p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Sobre você</h3>
              <p className="arena-section-card-description">O abrigo usa estes dados para entrar em contato.</p>
            </div>
            <div className="arena-section-card-body space-y-3.5 p-0">
              <div className="space-y-1.5">
                <Label htmlFor="aw_name">Nome completo *</Label>
                <Input id="aw_name" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="aw_email">E-mail</Label>
                  <Input id="aw_email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aw_phone">Telefone / WhatsApp</Label>
                  <Input id="aw_phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Questionário</h3>
              <p className="arena-section-card-description">Ajuda o abrigo a avaliar a compatibilidade do lar.</p>
            </div>
            <div className="arena-section-card-body space-y-3.5 p-0">
              <div className="space-y-1.5">
                <Label>Tipo de moradia</Label>
                <div className="flex flex-wrap gap-2">
                  {[['house', 'Casa'], ['apartment', 'Apartamento'], ['rural', 'Sítio/rural'], ['other', 'Outro']].map(([v, l]) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={form.living_arrangement === v ? 'default' : 'outline'}
                      onClick={() => setField('living_arrangement', v)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              {[
                ['has_yard', 'Tenho quintal ou área externa segura'],
                ['has_other_pets', 'Tenho outros pets'],
                ['has_children', 'Moro com crianças'],
                ['landlord_allows_pets', 'Moro de aluguel e o proprietário permite pets'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox id={`aw_${key}`} checked={form[key]} onCheckedChange={(v) => setField(key, v === true)} />
                  <Label htmlFor={`aw_${key}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
              {form.has_other_pets && (
                <div className="space-y-1.5">
                  <Label htmlFor="aw_pets_desc">Quais pets você já tem?</Label>
                  <Input id="aw_pets_desc" value={form.other_pets_description} onChange={(e) => setField('other_pets_description', e.target.value)} maxLength={500} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="aw_reason">Por que você quer adotar? * (mínimo 10 caracteres)</Label>
                <Textarea id="aw_reason" rows={4} value={form.reason_to_adopt} onChange={(e) => setField('reason_to_adopt', e.target.value)} maxLength={2000} />
              </div>
              {[
                ['agreed_to_home_visit', 'Aceito receber visita de pré-adoção do abrigo'],
                ['agreed_to_follow_up', 'Aceito acompanhamento pós-adoção'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox id={`aw_${key}`} checked={form[key]} onCheckedChange={(v) => setField(key, v === true)} />
                  <Label htmlFor={`aw_${key}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
                <FileText className="h-[19px] w-[19px] text-primary" /> Termo de Adoção Responsável
              </h3>
              <p className="arena-section-card-description">
                Versão {ADOPTION_TERMS_VERSION}. Leia até o fim para habilitar o aceite
                (Lei 14.063/2020 — assinatura eletrônica).
              </p>
            </div>
            <div className="arena-section-card-body space-y-3.5 p-0">
              <div
                ref={termsRef}
                onScroll={handleTermsScroll}
                className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-muted-foreground"
                tabIndex={0}
                aria-label="Texto integral do Termo de Adoção"
              >
                {ADOPTION_TERMS_TEXT}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="aw_accept"
                  checked={accepted}
                  disabled={!scrolledToEnd}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="aw_accept" className={`text-xs font-normal leading-snug ${scrolledToEnd ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  Li o texto integral e aceito o Termo de Adoção Responsável.
                  {!scrolledToEnd && ' (role o texto até o fim para habilitar)'}
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aw_sig">Assinatura — digite seu nome completo *</Label>
                <Input id="aw_sig" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={form.full_name} maxLength={120} />
                <p className="text-[11px] text-muted-foreground">
                  O aceite fica registrado com data, versão e hash SHA-256 do documento.
                </p>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="arena-section-card-body flex flex-col items-center gap-3 p-0 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <h2 className="text-lg font-bold">Pedido enviado! 🎉</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              O abrigo vai analisar seu pedido de adoção de <strong>{pet.name}</strong>.
              Protocolo: <code className="text-xs">{applicationId}</code>
            </p>
            <div className="mt-2 flex gap-2">
              <Button asChild variant="outline">
                <Link to={`/adocoes/${shelterClubId}/${applicationId}`}>Acompanhar pedido</Link>
              </Button>
              <Button asChild>
                <Link to="/perfil#adocoes">Minhas adoções</Link>
              </Button>
            </div>
          </div>
        )}


        {step === 4 && (
          <>
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Revise seu pedido</h3>
              <p className="arena-section-card-description">Verifique os dados antes de assinar e enviar.</p>
            </div>
            <div className="arena-section-card-body space-y-4 p-0">
              <div className="space-y-3 rounded-xl border border-border p-4">
                <h4 className="text-sm font-semibold">Dados do adotante</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{form.full_name}</span></div>
                  {form.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{form.email}</span></div>}
                  {form.phone && <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{form.phone}</span></div>}
                  <div><span className="text-muted-foreground">Moradia:</span> <span className="font-medium">{form.living_arrangement || '—'}</span></div>
                  <div><span className="text-muted-foreground">Pets:</span> <span className="font-medium">{form.has_other_pets ? 'Sim' : 'Não'}</span></div>
                  <div><span className="text-muted-foreground">Crianças:</span> <span className="font-medium">{form.has_children ? 'Sim' : 'Não'}</span></div>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">Motivação:</p>
                  <p className="text-sm">{form.reason_to_adopt || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Ao assinar e enviar, você declara que leu e concorda com o Termo de Adoção e cede seus dados ao abrigo responsável para fins de análise do pedido.</p>
              </div>
            </div>
          </>
        )}
        {step < 4 && (
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? navigate(`/pet/${petId}`) : setStep(step - 1))}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {step === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            {step < 3 ? (
              <Button type="button" disabled={!stepValid} onClick={() => setStep(step + 1)}>
                Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : step === 3 ? (
              <Button type="button" disabled={!stepValid || !accepted} onClick={() => setStep(4)}>
                Revisar <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : step === 4 ? (
              <Button type="button" disabled={submitMutation.isPending} onClick={handleSubmit}>
                {submitMutation.isPending ? 'Enviando…' : 'Assinar e enviar pedido'}
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
