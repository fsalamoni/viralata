/**
 * @fileoverview DonorOnboarding — questionário de primeiro acesso do Doador (V4).
 *
 * D-PERSONA-DONOR-ONBOARDING (Q24): 9 campos específicos
 *  - donor_motivation (texto)
 *  - has_donated_before (boolean)
 *  - pets_count (número)
 *  - experience_with_species (array: dogs, cats, rabbits, birds, other)
 *  - experience_years (número)
 *  - donor_accepts_home_check (boolean)
 *  - donor_accepts_post_adoption_followup (boolean)
 *  - donor_preferred_contact_method (whatsapp/email/chat)
 *  - donor_bio (texto curto)
 *
 * Compartilhado com `users/{uid}` global: cidade, estado, telefone,
 * LGPD consent (esses são atualizados pelo AuthContext normal).
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Heart, ArrowRight, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { enablePersona } from '@/core/services/personaService';
import { createAuditLog } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';
import { cn } from '@/core/lib/utils';

const SPECIES_OPTIONS = [
  { value: 'dogs', label: 'Cães' },
  { value: 'cats', label: 'Gatos' },
  { value: 'rabbits', label: 'Coelhos' },
  { value: 'birds', label: 'Pássaros' },
  { value: 'other', label: 'Outros' },
];

const CONTACT_METHODS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Chat da plataforma' },
];

const STEPS = [
  { id: 'motivation', title: 'Motivação' },
  { id: 'experience', title: 'Experiência' },
  { id: 'preferences', title: 'Preferências' },
  { id: 'bio', title: 'Sobre você' },
  { id: 'review', title: 'Revisão' },
];

export function DonorOnboarding() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_DONOR);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActive: setActiveHook } = useActivePersona();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [form, setForm] = useState({
    donor_motivation: '',
    has_donated_before: false,
    pets_count: 0,
    experience_with_species: [],
    experience_years: 0,
    donor_accepts_home_check: false,
    donor_accepts_post_adoption_followup: false,
    donor_preferred_contact_method: 'whatsapp',
    donor_bio: '',
  });

  if (!enabled) {
    navigate('/meus-pets', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true, state: { from: '/onboarding/doador' } });
    return null;
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSpecies = (value) => {
    setForm((prev) => {
      const arr = prev.experience_with_species || [];
      return {
        ...prev,
        experience_with_species: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const canAdvance = () => {
    switch (STEPS[step].id) {
      case 'motivation':
        return form.donor_motivation.trim().length >= 5;
      case 'experience':
        return form.experience_with_species.length > 0;
      case 'preferences':
        return Boolean(form.donor_preferred_contact_method);
      case 'bio':
        return true; // bio é opcional
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Persiste donor_profile em users/{uid}/donor_profile/main
      const profileData = {
        ...form,
        uid: user.uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(
        doc(db, 'users', user.uid, 'donor_profile', 'main'),
        profileData,
      );

      // 2. Habilita persona
      await enablePersona(user.uid, PERSONA_TYPE.DONOR);

      // 3. Define como ativa
      await setActiveHook(PERSONA_TYPE.DONOR);

      // 4. Audit log
      await createAuditLog({
        action: 'donor_onboarding_completed',
        actor: user,
        details: { persona: PERSONA_TYPE.DONOR },
      }).catch((err) => logger.warn('[DonorOnboarding] audit failed:', err));

      navigate('/meus-pets', { replace: true });
    } catch (err) {
      logger.error('[DonorOnboarding] submit failed:', err);
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12" data-testid="donor-onboarding">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md" aria-hidden="true">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Cadastro de Doador
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Conte um pouco sobre você como doador. Isso ajuda adotantes a conhecerem você.
        </p>
      </header>

      <Stepper current={step} steps={STEPS} />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {STEPS[step].id === 'motivation' && (
          <div>
            <Label htmlFor="motivation">Por que você quer doar um pet?</Label>
            <Textarea
              id="motivation"
              value={form.donor_motivation}
              onChange={(e) => set('donor_motivation', e.target.value)}
              placeholder="Ex.: mudança de cidade, alergia, novo emprego..."
              rows={4}
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Compartilhado com os adotantes no card do pet. Mínimo 5 caracteres.
            </p>
            <div className="mt-4">
              <Checkbox
                id="has-donated-before"
                checked={form.has_donated_before}
                onChange={(e) => set('has_donated_before', e.target.checked)}
                label="Já doei pets antes"
              />
            </div>
          </div>
        )}

        {STEPS[step].id === 'experience' && (
          <>
            <div>
              <Label>Com quais espécies você tem experiência?</Label>
              <p className="mt-1 text-xs text-muted-foreground">Selecione uma ou mais.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SPECIES_OPTIONS.map((opt) => {
                  const checked = form.experience_with_species.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSpecies(opt.value)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:border-primary/50',
                      )}
                      data-testid={`species-${opt.value}`}
                    >
                      {checked && <Check className="h-4 w-4" aria-hidden="true" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="pets-count">Quantos pets você já cuidou na vida?</Label>
              <Input
                id="pets-count"
                type="number"
                min="0"
                value={form.pets_count}
                onChange={(e) => set('pets_count', Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="experience-years">Anos de experiência com pets</Label>
              <Input
                id="experience-years"
                type="number"
                min="0"
                value={form.experience_years}
                onChange={(e) => set('experience_years', Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </>
        )}

        {STEPS[step].id === 'preferences' && (
          <>
            <div>
              <Label>Como você prefere ser contatado?</Label>
              <div className="mt-2 space-y-2">
                {CONTACT_METHODS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 rounded-lg border-2 border-border bg-card p-3 transition hover:border-primary/50">
                    <input
                      type="radio"
                      name="contact-method"
                      value={m.value}
                      checked={form.donor_preferred_contact_method === m.value}
                      onChange={() => set('donor_preferred_contact_method', m.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Checkbox
                id="accepts-home-check"
                checked={form.donor_accepts_home_check}
                onChange={(e) => set('donor_accepts_home_check', e.target.checked)}
                label="Aceito receber visita prévia do adotante (home check)"
              />
              <Checkbox
                id="accepts-followup"
                checked={form.donor_accepts_post_adoption_followup}
                onChange={(e) => set('donor_accepts_post_adoption_followup', e.target.checked)}
                label="Aceito receber atualizações pós-adoção"
              />
            </div>
          </>
        )}

        {STEPS[step].id === 'bio' && (
          <div>
            <Label htmlFor="bio">Sobre você (opcional)</Label>
            <Textarea
              id="bio"
              value={form.donor_bio}
              onChange={(e) => set('donor_bio', e.target.value)}
              placeholder="Conte um pouco sobre você. Será exibido no card do pet."
              rows={5}
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Máx. 500 caracteres.
            </p>
          </div>
        )}

        {STEPS[step].id === 'review' && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Revisão
            </h2>
            <ReviewRow label="Motivação" value={form.donor_motivation} />
            <ReviewRow label="Já doou antes?" value={form.has_donated_before ? 'Sim' : 'Não'} />
            <ReviewRow label="Experiência" value={form.experience_with_species.map((s) => SPECIES_OPTIONS.find((o) => o.value === s)?.label).join(', ') || '—'} />
            <ReviewRow label="Pets já cuidados" value={form.pets_count} />
            <ReviewRow label="Anos de experiência" value={form.experience_years} />
            <ReviewRow label="Contato preferido" value={CONTACT_METHODS.find((m) => m.value === form.donor_preferred_contact_method)?.label} />
            <ReviewRow label="Aceita home check?" value={form.donor_accepts_home_check ? 'Sim' : 'Não'} />
            <ReviewRow label="Aceita follow-up?" value={form.donor_accepts_post_adoption_followup ? 'Sim' : 'Não'} />
            <ReviewRow label="Sobre você" value={form.donor_bio || '—'} />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            data-testid="donor-onboarding-next"
          >
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="donor-onboarding-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Concluir
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current, steps }) {
  return (
    <ol className="flex items-center justify-between gap-2" aria-label="Progresso do cadastro">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex flex-1 items-center">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                done && 'bg-primary text-primary-foreground',
                active && 'border-2 border-primary bg-primary/10 text-primary',
                !done && !active && 'border-2 border-border bg-card text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('ml-2 text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={cn('mx-2 h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 text-foreground">{value || '—'}</span>
    </div>
  );
}

export default DonorOnboarding;
