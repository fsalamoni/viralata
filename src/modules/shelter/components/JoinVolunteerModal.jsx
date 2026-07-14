/**
 * @fileoverview JoinVolunteerModal — modal completo de inscrição de voluntário
 * em abrigo (TASK-264).
 *
 * 4 passos inline:
 *   1. Termo de voluntariado (read-only, scroll)
 *   2. Perfil (habilidades, disponibilidade)
 *   3. Confirmação (resumo)
 *   4. Sucesso
 *
 * Auth obrigatória. Usa useJoinShelterAsVolunteer + useAcceptVolunteerTerms.
 * Captcha só em /voluntarios/seja (página); modal usa App Check em prod.
 *
 * Gated por SHELTER_VOLUNTEER_PROFILE_V1.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HeartHandshake, ScrollText, ClipboardList, CheckCircle2, Building2,
  ChevronRight, ChevronLeft, Loader2, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { VOLUNTEER_TERMS_VERSION } from '@/modules/shelter/domain/legal/volunteerTerms';
import { VOLUNTEER_TERMS_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/volunteerTerms.v2';
import {
  useVolunteerProfile,
  useAcceptVolunteerTerms,
  useJoinShelterAsVolunteer,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { cn } from '@/core/lib/utils';
import { logger } from '@/core/lib/logger';

const STEPS = [
  { id: 'terms', label: 'Termo', icon: ScrollText },
  { id: 'profile', label: 'Perfil', icon: ClipboardList },
  { id: 'confirm', label: 'Confirmar', icon: CheckCircle2 },
];

const SKILL_OPTIONS = [
  { value: 'dogs', label: 'Cães' },
  { value: 'cats', label: 'Gatos' },
  { value: 'transit', label: 'Transporte' },
  { value: 'photo', label: 'Fotografia' },
  { value: 'social', label: 'Redes sociais' },
  { value: 'vet', label: 'Veterinária' },
  { value: 'admin', label: 'Administrativo' },
  { value: 'events', label: 'Eventos' },
];

function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol
      aria-label="Progresso da inscrição"
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < idx;
        const active = i === idx;
        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
              active && 'border-primary bg-primary/10 text-primary',
              done && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              !active && !done && 'border-border bg-muted/40 text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function JoinVolunteerModal({
  open,
  onOpenChange,
  clubId,
  clubName,
  onSuccess,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const acceptTerms = useAcceptVolunteerTerms();
  const joinShelter = useJoinShelterAsVolunteer();

  const [step, setStep] = useState('terms');
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [skills, setSkills] = useState([]);
  const [availability, setAvailability] = useState('');
  const [experience, setExperience] = useState('');
  const [error, setError] = useState(null);

  // Pré-popula com perfil existente
  useEffect(() => {
    if (profile) {
      setSkills(profile.skills || []);
      setAvailability(profile.availability || '');
      setExperience(profile.experience || '');
    }
  }, [profile]);

  // Reseta quando abre
  useEffect(() => {
    if (open) {
      setStep('terms');
      setTermsRead(false);
      setTermsAccepted(false);
      setError(null);
    }
  }, [open]);

  // Detecta scroll até o fim
  const handleScroll = (e) => {
    const t = e.currentTarget;
    if (t.scrollHeight - (t.scrollTop + t.clientHeight) < 30) {
      setTermsRead(true);
    }
  };

  const toggleSkill = (val) => {
    setSkills((prev) => (prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]));
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      setError('Você precisa estar logado');
      return;
    }
    setError(null);
    try {
      // 1. Aceitar termo (se ainda não aceito nesta versão)
      if (!profile?.terms_accepted_version || profile.terms_accepted_version !== VOLUNTEER_TERMS_VERSION) {
        await acceptTerms.mutateAsync({
          version: VOLUNTEER_TERMS_VERSION,
          skills,
          availability,
          experience,
        });
      }
      // 2. Entrar no abrigo
      await joinShelter.mutateAsync({
        club_id: clubId,
        user: {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Voluntário',
          email: user.email,
        },
        skills,
        availability,
        experience,
      });
      setStep('done');
      toast({
        title: 'Inscrição enviada!',
        description: `${clubName} foi notificado da sua candidatura.`,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      logger.warn('JoinVolunteerModal', { err: String(err) });
      setError(err.message || 'Erro ao se inscrever');
    }
  };

  const loading = profileLoading || acceptTerms.isPending || joinShelter.isPending;
  const canAdvance = {
    terms: termsRead && termsAccepted,
    profile: skills.length > 0,
    confirm: true,
  }[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="join-volunteer-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Seja voluntário em {clubName || 'este abrigo'}
          </DialogTitle>
          <DialogDescription>
            3 passos rápidos. Você pode cancelar a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Stepper current={step} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 'terms' && (
            <div className="space-y-3">
              <div
                onScroll={handleScroll}
                className="h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed"
                tabIndex={0}
                aria-label="Termo de voluntariado"
                data-testid="volunteer-terms-scroll"
              >
                {VOLUNTEER_TERMS_TEXT_V2.split('\n').map((p, i) => (
                  <p key={i} className="mb-2">{p}</p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {termsRead ? '✓ Você leu o termo até o final' : 'Role até o final para habilitar a aceitação'}
              </p>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={termsAccepted}
                  disabled={!termsRead}
                  onCheckedChange={(v) => setTermsAccepted(Boolean(v))}
                  data-testid="volunteer-terms-accept"
                />
                <span className={termsRead ? '' : 'text-muted-foreground'}>
                  Li e aceito o termo de voluntariado (v{VOLUNTEER_TERMS_VERSION})
                </span>
              </label>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-4">
              {profileLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm">Em quais áreas você quer ajudar? <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground mb-2">Selecione ao menos uma</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILL_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            'flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer transition-colors',
                            skills.includes(opt.value)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/30',
                          )}
                        >
                          <Checkbox
                            checked={skills.includes(opt.value)}
                            onCheckedChange={() => toggleSkill(opt.value)}
                            data-testid={`skill-${opt.value}`}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="availability" className="text-sm">Disponibilidade semanal</Label>
                    <Input
                      id="availability"
                      placeholder="Ex: tardes + finais de semana"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience" className="text-sm">Experiência prévia (opcional)</Label>
                    <Textarea
                      id="experience"
                      rows={3}
                      placeholder="Breve descrição da sua experiência com animais"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Abrigo:</span>
                    <span>{clubName || clubId}</span>
                  </div>
                  <div>
                    <span className="font-medium">Habilidades:</span>
                    <p className="text-muted-foreground">
                      {skills.length === 0 ? '—' : skills.map((s) => SKILL_OPTIONS.find((o) => o.value === s)?.label).join(', ')}
                    </p>
                  </div>
                  {availability && (
                    <div>
                      <span className="font-medium">Disponibilidade:</span>
                      <p className="text-muted-foreground">{availability}</p>
                    </div>
                  )}
                  {experience && (
                    <div>
                      <span className="font-medium">Experiência:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{experience}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Termo de voluntariado v{VOLUNTEER_TERMS_VERSION} aceito.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-3" data-testid="join-volunteer-success">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Inscrição enviada!</h3>
              <p className="text-sm text-muted-foreground">
                {clubName} vai revisar seu perfil e entrar em contato.
                Você pode acompanhar pelo seu perfil.
              </p>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <DialogFooter className="flex-row justify-between gap-2 sm:space-x-0">
            {step !== 'terms' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) - 1].id)}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            ) : (
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
            )}

            {step === 'confirm' ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !user?.uid}
                data-testid="join-volunteer-submit"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
                ) : (
                  <>Confirmar inscrição <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) + 1].id)}
                disabled={!canAdvance || loading}
                data-testid="join-volunteer-next"
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </DialogFooter>
        )}

        {step === 'done' && (
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JoinVolunteerModal;
