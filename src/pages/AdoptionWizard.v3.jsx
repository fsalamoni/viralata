/**
 * @fileoverview AdoptionWizard V3 — wizard "Quero adotar" redesenhado.
 *
 * V3 (TASK-V3-ADOPTION): redesign do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_ADOPTION (default OFF, gated via React.lazy).
 *
 * Rota: /quero-adotar/:petId (auth required).
 *
 * 6 steps (mesmo do V1, UI modernizada):
 *   1. Confirmar pet      — foto, nome, abrigo
 *   2. Sobre você         — dados do adotante (prefill do perfil)
 *   3. Questionário       — moradia, outros pets, crianças, motivação
 *   4. Termo de Adoção    — texto integral + clickwrap + assinatura
 *   5. Revisão            — resumo de tudo
 *   6. Confirmação        — protocolo + agradecimento
 *
 * Decisões:
 *  - D-ADOPTION-V3-01: stepper horizontal sticky no mobile com indicator visual
 *  - D-ADOPTION-V3-02: navegação prev/next com validação inline por step
 *  - D-ADOPTION-V3-03: prefill automático do perfil (nome, email, telefone)
 *  - D-ADOPTION-V3-04: SHA-256 do aceite (Lei 14.063/2020 — manter V1)
 *  - D-ADOPTION-V3-05: tela de sucesso com protocolo + ações
 *  - D-ADOPTION-V3-06: dark mode com tokens DS-V2
 *  - D-ADOPTION-V3-07: a11y WCAG AA (labels, aria-describedby em erros)
 *
 * @see docs/V3_ADOPTION_QUESTIONS.md
 * @see docs/REGENCY_ADOPTION_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, CheckCircle2, PawPrint, FileText, User, Home as HomeIcon,
  Sparkles, Phone, Mail, Heart, MapPin, Trees, Building2, ClipboardList,
  Check, AlertCircle, Loader2, PartyPopper,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePet } from '@/modules/pets/hooks/usePets';
import { useSubmitApplication } from '@/modules/shelter/hooks/useAdoptionApplications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/Seo';
import { ADOPTION_TERMS_TEXT, ADOPTION_TERMS_VERSION } from '@/modules/shelter/domain/legal/adoptionTerms';

// ============================================================================
// STEPS CONFIG
// ============================================================================

const STEPS = [
  { id: 0, label: 'Pet', icon: PawPrint },
  { id: 1, label: 'Sobre você', icon: User },
  { id: 2, label: 'Questionário', icon: ClipboardList },
  { id: 3, label: 'Termo', icon: FileText },
  { id: 4, label: 'Revisão', icon: Sparkles },
  { id: 5, label: 'Confirmação', icon: PartyPopper },
];

const HOUSING_OPTIONS = [
  { value: 'house_with_yard', label: 'Casa com pátio', icon: Trees },
  { value: 'apartment', label: 'Apartamento', icon: Building2 },
  { value: 'rural', label: 'Sítio/Chácara', icon: MapPin },
  { value: 'other', label: 'Outro', icon: HomeIcon },
];

const ANIM = {
  enter: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StepIndicator({ currentStep, completedSteps, onJump, reduce }) {
  return (
    <nav aria-label="Progresso do formulário" className="sticky top-[64px] z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      <ol className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide" role="list">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = idx === currentStep;
          const isCompleted = completedSteps.includes(idx);
          const isClickable = isCompleted || idx < currentStep;
          return (
            <li key={step.id} className="flex flex-1 min-w-0 items-center">
              <button
                type="button"
                onClick={() => isClickable && onJump(idx)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label} — ${isCompleted ? 'concluído' : isCurrent ? 'atual' : 'pendente'}`}
                className={`flex flex-col items-center gap-1 rounded-md px-1.5 py-1 transition-colors disabled:cursor-not-allowed ${
                  isClickable ? 'hover:bg-muted/50' : ''
                } ${isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="hidden text-[10px] font-medium sm:block">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <span
                  className={`mx-1 h-0.5 flex-1 ${isCompleted ? 'bg-emerald-500/40' : 'bg-border'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PetConfirmStep({ pet, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (!pet) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <PawPrint className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">Pet não encontrado.</p>
        <Button asChild className="mt-4"><Link to="/feed">Ver outros pets</Link></Button>
      </div>
    );
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-5"
    >
      <motion.div variants={ANIM} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {pet.photos?.[0] ? (
            <img
              src={pet.photos[0]}
              alt={`Foto de ${pet.name || 'pet'}`}
              className="h-32 w-32 flex-shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <PawPrint className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-extrabold text-foreground">{pet.name || 'Sem nome'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pet.species || 'Espécie'} • {pet.breed || 'Raça não informada'} • {pet.age || 'Idade n/d'}
            </p>
            {pet.city && (
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-foreground/80">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {pet.city}
              </p>
            )}
            {pet.bio && (
              <p className="mt-3 line-clamp-3 text-sm text-foreground/90">{pet.bio}</p>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={ANIM} className="rounded-xl border border-amber-300/40 bg-amber-50/40 p-4 dark:bg-amber-900/10">
        <div className="flex items-start gap-3">
          <Heart className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Você está prestes a iniciar um processo de adoção.</p>
            <p className="mt-1">O formulário é dividido em 6 etapas e pode ser salvo entre elas. Após enviar, a ONG responsável entrará em contato em até 3 dias úteis.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AboutYouStep({ form, setField, errors }) {
  return (
    <motion.div initial="hidden" animate="show" variants={ANIM} className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div>
        <Label htmlFor="full_name">Nome completo *</Label>
        <Input
          id="full_name"
          value={form.full_name}
          onChange={(e) => setField('full_name', e.target.value)}
          placeholder="Como você se chama"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? 'full_name-error' : undefined}
        />
        {errors.full_name && (
          <p id="full_name-error" className="mt-1 flex items-center gap-1 text-xs text-destructive" role="status">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.full_name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            className="pl-10"
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <div className="relative mt-1">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            className="pl-10"
            placeholder="(11) 99999-9999"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Para a ONG entrar em contato com você.</p>
      </div>
    </motion.div>
  );
}

function QuestionnaireStep({ form, setField, errors }) {
  return (
    <motion.div initial="hidden" animate="show" variants={ANIM} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <HomeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          Sua moradia
        </h3>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Tipo de moradia</legend>
          {HOUSING_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const checked = form.living_arrangement === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  checked
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="living_arrangement"
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => setField('living_arrangement', e.target.value)}
                  className="h-4 w-4 text-primary focus:ring-2 focus:ring-primary"
                />
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PawPrint className="h-4 w-4 text-primary" aria-hidden="true" />
          Sobre pets e crianças
        </h3>
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-2">
            <Checkbox
              checked={form.has_other_pets}
              onCheckedChange={(c) => setField('has_other_pets', !!c)}
              id="has_other_pets"
            />
            <span className="text-sm text-foreground">Tenho outros pets em casa</span>
          </label>
          {form.has_other_pets && (
            <Textarea
              placeholder="Quais espécies e idades? Castrados? Vacinados?"
              value={form.other_pets_description}
              onChange={(e) => setField('other_pets_description', e.target.value)}
              rows={2}
            />
          )}
          <label className="flex items-start gap-2">
            <Checkbox
              checked={form.has_children}
              onCheckedChange={(c) => setField('has_children', !!c)}
              id="has_children"
            />
            <span className="text-sm text-foreground">Há crianças na casa</span>
          </label>
          {form.living_arrangement === 'apartment' && (
            <label className="flex items-start gap-2">
              <Checkbox
                checked={form.landlord_allows_pets}
                onCheckedChange={(c) => setField('landlord_allows_pets', !!c)}
                id="landlord_allows_pets"
              />
              <span className="text-sm text-foreground">O locador permite pets (se aluguel)</span>
            </label>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <Label htmlFor="reason_to_adopt">Por que você quer adotar este pet? *</Label>
        <Textarea
          id="reason_to_adopt"
          value={form.reason_to_adopt}
          onChange={(e) => setField('reason_to_adopt', e.target.value)}
          placeholder="Conte para a ONG o que te motivou. Mínimo 10 caracteres."
          rows={4}
          aria-invalid={!!errors.reason_to_adopt}
          aria-describedby={errors.reason_to_adopt ? 'reason-error' : 'reason-help'}
        />
        {errors.reason_to_adopt ? (
          <p id="reason-error" className="mt-1 flex items-center gap-1 text-xs text-destructive" role="status">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.reason_to_adopt}
          </p>
        ) : (
          <p id="reason-help" className="mt-1 text-xs text-muted-foreground">
            {form.reason_to_adopt.length}/10 caracteres mínimos
          </p>
        )}
      </div>
    </motion.div>
  );
}

function TermsStep({ scrolledToEnd, setScrolledToEnd, accepted, setAccepted, signature, setSignature, errors, termsRef }) {
  return (
    <motion.div initial="hidden" animate="show" variants={ANIM} className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Termo de Adoção Responsável (versão {ADOPTION_TERMS_VERSION})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Role até o final para habilitar a aceitação.</p>
        <div
          ref={termsRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
              setScrolledToEnd(true);
            }
          }}
          className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90"
          role="document"
          aria-label="Termo de adoção"
        >
          {ADOPTION_TERMS_TEXT}
        </div>
        {!scrolledToEnd && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Continue rolando o termo...
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <label className={`flex items-start gap-3 ${scrolledToEnd ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(c) => scrolledToEnd && setAccepted(!!c)}
            disabled={!scrolledToEnd}
            aria-describedby={errors.accepted ? 'accept-error' : undefined}
          />
          <span className="text-sm text-foreground">
            Li, compreendi e aceito integralmente o Termo de Adoção acima. Estou ciente de que a aceitação tem validade jurídica conforme Lei 14.063/2020.
          </span>
        </label>
        {errors.accepted && (
          <p id="accept-error" className="mt-1 flex items-center gap-1 text-xs text-destructive" role="status">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {errors.accepted}
          </p>
        )}

        <div className="mt-4">
          <Label htmlFor="signature">Assinatura digital (seu nome completo) *</Label>
          <Input
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Digite seu nome completo"
            aria-invalid={!!errors.signature}
            aria-describedby={errors.signature ? 'signature-error' : undefined}
            className="font-serif italic"
          />
          {errors.signature ? (
            <p id="signature-error" className="mt-1 flex items-center gap-1 text-xs text-destructive" role="status">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {errors.signature}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              A assinatura será convertida em hash SHA-256 para registro imutável.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReviewStep({ form, pet, signature }) {
  return (
    <motion.div initial="hidden" animate="show" variants={ANIM} className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-sm font-bold text-foreground">Resumo da solicitação</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Pet:</dt>
            <dd className="font-medium text-foreground">{pet?.name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Adotante:</dt>
            <dd className="font-medium text-foreground">{form.full_name}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Email:</dt>
            <dd className="text-foreground">{form.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Telefone:</dt>
            <dd className="text-foreground">{form.phone || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Moradia:</dt>
            <dd className="text-foreground">{HOUSING_OPTIONS.find(o => o.value === form.living_arrangement)?.label || '—'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Outros pets:</dt>
            <dd className="text-foreground">{form.has_other_pets ? 'Sim' : 'Não'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Crianças:</dt>
            <dd className="text-foreground">{form.has_children ? 'Sim' : 'Não'}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border pb-2">
            <dt className="text-muted-foreground">Termo aceito:</dt>
            <dd className="text-emerald-600 dark:text-emerald-400">Sim (versão {ADOPTION_TERMS_VERSION})</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Assinatura:</dt>
            <dd className="font-serif italic text-foreground">{signature}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/90">
        <p>Ao clicar em <strong>Enviar solicitação</strong>, a ONG responsável pelo pet receberá sua candidatura e entrará em contato em até 3 dias úteis.</p>
      </div>
    </motion.div>
  );
}

function ConfirmationStep({ applicationId, pet }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      className="text-center"
    >
      <motion.div
        variants={ANIM}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      >
        <PartyPopper className="h-10 w-10" aria-hidden="true" />
      </motion.div>
      <motion.h2 variants={ANIM} className="mt-6 text-2xl font-extrabold text-foreground sm:text-3xl">
        Solicitação enviada com sucesso!
      </motion.h2>
      <motion.p variants={ANIM} className="mt-2 text-sm text-muted-foreground sm:text-base">
        A ONG responsável por <strong>{pet?.name || 'o pet'}</strong> recebeu sua candidatura.
        Você receberá um retorno em até 3 dias úteis.
      </motion.p>
      {applicationId && (
        <motion.div variants={ANIM} className="mt-6 inline-block rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Protocolo</p>
          <p className="mt-1 font-mono text-sm font-bold text-foreground">{applicationId}</p>
        </motion.div>
      )}
      <motion.div variants={ANIM} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/feed">Ver outros pets</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/profile?tab=adoptions">Acompanhar adoções</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function AdoptionWizardV3() {
  const reduce = useReducedMotion();
  const { petId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isLoadingAuth } = useAuth();
  const { data: pet, isLoading: petLoading } = usePet(petId);
  const submitMutation = useSubmitApplication();

  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [applicationId, setApplicationId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    living_arrangement: '',
    has_yard: false,
    has_other_pets: false,
    other_pets_description: '',
    has_children: false,
    landlord_allows_pets: false,
    reason_to_adopt: '',
  });
  const [signature, setSignature] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const termsRef = useRef(null);

  // Prefill from user profile
  useEffect(() => {
    if (user) {
      setForm((p) => ({
        ...p,
        full_name: p.full_name || userProfile?.full_name || user.displayName || '',
        email: p.email || user.email || '',
        phone: p.phone || userProfile?.phone || '',
      }));
    }
  }, [user, userProfile]);

  // Auth guard
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast.error('Faça login para iniciar uma adoção.');
      navigate(`/login?redirect=/quero-adotar/${petId}`, { replace: true });
    }
  }, [user, isLoadingAuth, navigate, petId]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // Validação por step
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.full_name.trim() || form.full_name.trim().length < 2) {
        errs.full_name = 'Nome completo é obrigatório';
      }
    }
    if (s === 2) {
      if (!form.living_arrangement) errs.living_arrangement = 'Selecione o tipo de moradia';
      if (form.reason_to_adopt.trim().length < 10) {
        errs.reason_to_adopt = 'Conte sua motivação (mínimo 10 caracteres)';
      }
    }
    if (s === 3) {
      if (!accepted) errs.accepted = 'Você precisa aceitar o termo';
      if (!signature.trim() || signature.trim().length < 3) {
        errs.signature = 'Digite seu nome completo para assinar';
      }
    }
    return errs;
  };

  const next = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Preencha os campos obrigatórios antes de continuar.');
      return;
    }
    setErrors({});
    setCompletedSteps((cs) => Array.from(new Set([...cs, step])));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const jumpTo = (target) => {
    if (target <= step || completedSteps.includes(target)) {
      setStep(target);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const applicant_form = {
        full_name: form.full_name.trim(),
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        living_arrangement: form.living_arrangement,
        has_yard: form.has_yard,
        has_other_pets: form.has_other_pets,
        other_pets_description: form.other_pets_description,
        has_children: form.has_children,
        landlord_allows_pets: form.landlord_allows_pets,
        reason_to_adopt: form.reason_to_adopt,
      };
      const id = await submitMutation.mutateAsync({
        petId,
        applicantUid: user.uid,
        applicantForm: applicant_form,
        signature,
        termsVersion: ADOPTION_TERMS_VERSION,
        termsAccepted: accepted,
      });
      setApplicationId(id);
      setCompletedSteps((cs) => Array.from(new Set([...cs, 4])));
      setStep(5);
    } catch (err) {
      toast.error(err?.message || 'Erro ao enviar solicitação. Tente novamente.');
    }
  };

  // Loading
  if (isLoadingAuth || (petLoading && step === 0)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const isOrgPet = pet?.owner_type === 'organization';
  const isSubmitting = submitMutation.isPending;

  return (
    <div className="arena-page mx-auto w-full max-w-2xl px-4 py-6 sm:px-6" data-testid="adoption-wizard-page">
      <Seo
        title="Quero adotar — Viralata"
        description="Inicie o processo de adoção responsável. 6 etapas: confirme o pet, preencha seus dados, responda o questionário, aceite o termo e envie a solicitação."
      />

      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={pet ? `/pet/${pet.id}` : '/feed'}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Voltar
          </Link>
        </Button>
        <Badge variant="outline" className="ml-auto">
          Etapa {step + 1} de {STEPS.length}
        </Badge>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        Adotar {pet?.name ? pet.name : 'um pet'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Processo de adoção responsável em 6 etapas simples.
      </p>

      {!isOrgPet && pet && (
        <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 text-sm text-amber-900 dark:bg-amber-900/10 dark:text-amber-200">
          <p>Este pet é de um tutor individual. Para esse caso, use o botão "Tenho interesse" no perfil do pet, em vez deste wizard.</p>
        </div>
      )}

      <StepIndicator
        currentStep={step}
        completedSteps={completedSteps}
        onJump={jumpTo}
        reduce={reduce}
      />

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step-0" {...(reduce ? {} : ANIM)}>
              <PetConfirmStep pet={pet} loading={petLoading} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="step-1" {...(reduce ? {} : ANIM)}>
              <AboutYouStep form={form} setField={setField} errors={errors} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step-2" {...(reduce ? {} : ANIM)}>
              <QuestionnaireStep form={form} setField={setField} errors={errors} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step-3" {...(reduce ? {} : ANIM)}>
              <TermsStep
                scrolledToEnd={scrolledToEnd}
                setScrolledToEnd={setScrolledToEnd}
                accepted={accepted}
                setAccepted={setAccepted}
                signature={signature}
                setSignature={setSignature}
                errors={errors}
                termsRef={termsRef}
              />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="step-4" {...(reduce ? {} : ANIM)}>
              <ReviewStep form={form} pet={pet} signature={signature} />
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="step-5" {...(reduce ? {} : ANIM)}>
              <ConfirmationStep applicationId={applicationId} pet={pet} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer navigation (não aparece na confirmação) */}
      {step < 5 && (
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={prev}
            disabled={step === 0 || isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={next} disabled={isSubmitting}>
              Próxima
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !isOrgPet}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Enviar solicitação
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
