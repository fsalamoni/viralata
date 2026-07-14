/**
 * @fileoverview Componente: PostEventLog (Fase 11 / TASK-148).
 *
 * Formulário por animal para registrar o destino pós-evento de uma
 * vitrine. Substitui o form inline que ficava em ExhibitionDetails.jsx.
 *
 * UI:
 *  - pet_id (texto — ID do pet interno ou externo)
 *  - pet_origin (radio: internal / external)
 *  - outcome (radio: returned / adopted / foster / other)
 *      Se adopted  → adopter_uid obrigatório (autocomplete de adotantes)
 *      Se foster   → shelter_club_id obrigatório (autocomplete de abrigos)
 *      Se other    → notes obrigatório (mín. 3 chars)
 *  - notes (textarea, max 500 chars, opcional)
 *
 * Submit:
 *  - Valida payload com `postEventLogOutcomeSchema` (Zod)
 *  - Mapeia outcome → destination via `mapOutcomeToDestination`
 *  - Chama `exhibitionService.logPostEvent` via hook `useLogPostEvent`
 *  - Toast de sucesso/erro
 *  - Em sucesso, limpa o form e chama `onLogged(result)`
 *
 * a11y:
 *  - role="alert" em mensagens de erro
 *  - aria-describedby ligando campos aos textos de ajuda/erro
 *  - aria-invalid quando há erro no campo
 *  - focus automático no primeiro campo com erro após submit
 *  - labels associados (htmlFor)
 *  - mobile-first: textarea e inputs com min-h >= 44px
 *
 * Feature flag: `shelter_exhibition_workflow_v1` (default OFF — guard
 * fica no pai, este componente assume que a flag está ligada).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  POST_EVENT_OUTCOMES,
  POST_EVENT_OUTCOME_LABELS,
  postEventLogOutcomeSchema,
  mapOutcomeToDestination,
} from '@/modules/shelter/domain/operational/exhibition';
import { useLogPostEvent } from '@/modules/shelter/hooks/useExhibitions';
import { useApplications } from '@/modules/shelter/hooks/useAdoptionApplications';
import { useClubs } from '@/modules/organizations/hooks/useClubs';

const NOTES_MAX = 500;

function buildEmptyForm(petId = '', petOrigin = 'internal') {
  return {
    pet_id: petId,
    pet_origin: petOrigin,
    outcome: 'returned',
    adopter_uid: '',
    shelter_club_id: '',
    shelter_club_name: '',
    notes: '',
  };
}

/**
 * Extrai adotantes únicos das applications existentes do abrigo,
 * para popular o datalist de autocomplete.
 */
function useRecentAdopters(applications) {
  return useMemo(() => {
    const map = new Map();
    for (const app of applications || []) {
      if (!app?.applicant_uid) continue;
      if (map.has(app.applicant_uid)) continue;
      const snap = app.applicant_snapshot || {};
      map.set(app.applicant_uid, {
        uid: app.applicant_uid,
        name: snap.full_name || app.applicant_name || app.applicant_uid,
      });
    }
    return Array.from(map.values()).slice(0, 50);
  }, [applications]);
}

/**
 * Filtra a lista de clubes para excluir o abrigo atual (não faz sentido
 * "transferir" para o próprio abrigo).
 */
function useOtherClubs(allClubs, currentShelterClubId) {
  return useMemo(() => {
    return (allClubs || [])
      .filter((c) => c?.id && c.id !== currentShelterClubId)
      .map((c) => ({ id: c.id, name: c.name || c.id }));
  }, [allClubs, currentShelterClubId]);
}

export function PostEventLog({
  shelterClubId,
  exhibitionId,
  actor,
  initialPetId,
  initialPetOrigin = 'internal',
  onLogged,
  onCancel,
  compact = false,
}) {
  const uid = useId();
  const { toast } = useToast();
  const logPostEvent = useLogPostEvent(shelterClubId);
  const { data: applications = [] } = useApplications(shelterClubId, { maxResults: 100 });
  const { data: allClubs = [] } = useClubs();
  const recentAdopters = useRecentAdopters(applications);
  const otherClubs = useOtherClubs(allClubs, shelterClubId);

  const [form, setForm] = useState(() =>
    buildEmptyForm(initialPetId, initialPetOrigin),
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const firstErrorRef = useRef(null);

  // Se o pai passar novo initialPetId (ex.: pet selecionado na lista),
  // sincroniza o form.
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      pet_id: initialPetId ?? prev.pet_id,
      pet_origin: initialPetOrigin ?? prev.pet_origin,
    }));
  }, [initialPetId, initialPetOrigin]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };
  const clearErrors = () => setErrors({});

  const handleSubmit = async (e) => {
    e?.preventDefault();
    clearErrors();
    if (!shelterClubId || !exhibitionId) {
      toast({
        title: 'Erro',
        description: 'shelterClubId e exhibitionId são obrigatórios',
        variant: 'destructive',
      });
      return;
    }
    // Trim pet_id e notes antes de validar
    const payload = {
      pet_id: form.pet_id.trim(),
      pet_origin: form.pet_origin,
      outcome: form.outcome,
      adopter_uid: form.adopter_uid.trim() || undefined,
      shelter_club_id: form.shelter_club_id || undefined,
      shelter_club_name: form.shelter_club_name || undefined,
      notes: form.notes.trim() || undefined,
    };
    const parsed = postEventLogOutcomeSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path?.[0] || '_';
        // Mantém só a primeira mensagem por campo
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      // Move foco para o primeiro campo com erro
      const firstField = Object.keys(fieldErrors)[0];
      if (firstField && firstErrorRef.current?.[firstField]) {
        firstErrorRef.current[firstField].focus();
      }
      return;
    }

    // Mapeia outcome → destination + prepara input do service
    const destination = mapOutcomeToDestination(parsed.data.outcome);
    const serviceInput = {
      pet_id: parsed.data.pet_id,
      pet_origin: parsed.data.pet_origin,
      destination,
      notes: parsed.data.notes,
    };
    if (parsed.data.outcome === 'adopted' && parsed.data.adopter_uid) {
      serviceInput.adopter_uid = parsed.data.adopter_uid;
    }
    if (parsed.data.outcome === 'foster') {
      serviceInput.transferred_to_shelter_id = parsed.data.shelter_club_id;
      if (parsed.data.shelter_club_name) {
        serviceInput.transferred_to_shelter_name = parsed.data.shelter_club_name;
      }
    }

    setSubmitting(true);
    try {
      const result = await logPostEvent.mutateAsync({
        exhibitionId,
        input: serviceInput,
        actor,
      });
      if (result?.idempotent) {
        toast({
          title: 'Já registrado',
          description: 'Esse animal já tem destino registrado para este evento.',
        });
      } else {
        toast({
          title: '✓ Destino registrado',
          description: `${POST_EVENT_OUTCOME_LABELS[parsed.data.outcome] || parsed.data.outcome} · pet ${parsed.data.pet_id}`,
        });
      }
      // Limpa o form (mantém pet_origin como estava)
      setForm(buildEmptyForm('', parsed.data.pet_origin));
      clearErrors();
      if (typeof onLogged === 'function') {
        onLogged(result);
      }
    } catch (err) {
      const msg = String(err?.message || err);
      setError('_', msg);
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const notesCount = form.notes.length;
  const notesNearLimit = notesCount > NOTES_MAX - 50;

  // Mapeamento de field → ref para focus
  const fieldRefs = useRef({});
  const setFieldRef = (field) => (el) => {
    fieldRefs.current[field] = el;
    firstErrorRef.current = fieldRefs.current;
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Registrar destino do animal após evento"
      className={compact ? 'space-y-3' : 'space-y-4'}
    >
      {/* pet_id + pet_origin */}
      <div className={compact ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 md:grid-cols-3 gap-3'}>
        <div className="col-span-2">
          <Label htmlFor={`${uid}-pet-id`}>ID do pet</Label>
          <Input
            id={`${uid}-pet-id`}
            ref={setFieldRef('pet_id')}
            value={form.pet_id}
            onChange={(e) => update({ pet_id: e.target.value })}
            placeholder="ex.: p-abc123"
            className="min-h-[44px]"
            aria-invalid={Boolean(errors.pet_id)}
            aria-describedby={errors.pet_id ? `${uid}-pet-id-err` : `${uid}-pet-id-help`}
            required
          />
          {errors.pet_id ? (
            <p id={`${uid}-pet-id-err`} className="mt-1 text-xs text-destructive" role="alert">
              {errors.pet_id}
            </p>
          ) : (
            <p id={`${uid}-pet-id-help`} className="mt-1 text-xs text-muted-foreground">
              ID interno do pet (em pet_ids[]) ou ID externo (em external_pets[]).
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={`${uid}-pet-origin`}>Origem</Label>
          <select
            id={`${uid}-pet-origin`}
            value={form.pet_origin}
            onChange={(e) => update({ pet_origin: e.target.value })}
            className="mt-1 w-full min-h-[44px] border rounded-md px-2 text-sm bg-background"
            aria-describedby={errors.pet_origin ? `${uid}-pet-origin-err` : undefined}
          >
            <option value="internal">Interno</option>
            <option value="external">Externo</option>
          </select>
          {errors.pet_origin && (
            <p id={`${uid}-pet-origin-err`} className="mt-1 text-xs text-destructive" role="alert">
              {errors.pet_origin}
            </p>
          )}
        </div>
      </div>

      {/* outcome (radio group) */}
      <fieldset
        aria-describedby={errors.outcome ? `${uid}-outcome-err` : undefined}
        className="space-y-2"
      >
        <legend className="text-sm font-medium">Destino do animal</legend>
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 md:grid-cols-4 gap-2'}>
          {POST_EVENT_OUTCOMES.map((o) => {
            const id = `${uid}-outcome-${o}`;
            return (
              <label
                key={o}
                htmlFor={id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer min-h-[44px] transition-colors ${
                  form.outcome === o
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${uid}-outcome`}
                  value={o}
                  checked={form.outcome === o}
                  onChange={() => update({ outcome: o })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">{POST_EVENT_OUTCOME_LABELS[o] || o}</span>
              </label>
            );
          })}
        </div>
        {errors.outcome && (
          <p id={`${uid}-outcome-err`} className="text-xs text-destructive" role="alert">
            {errors.outcome}
          </p>
        )}
      </fieldset>

      {/* Condicional: adopted → adopter_uid */}
      {form.outcome === 'adopted' && (
        <div>
          <Label htmlFor={`${uid}-adopter`}>UID do adotante</Label>
          <Input
            id={`${uid}-adopter`}
            ref={setFieldRef('adopter_uid')}
            value={form.adopter_uid}
            onChange={(e) => update({ adopter_uid: e.target.value })}
            placeholder="ex.: u-abc123"
            className="min-h-[44px]"
            aria-invalid={Boolean(errors.adopter_uid)}
            aria-describedby={
              errors.adopter_uid
                ? `${uid}-adopter-err`
                : `${uid}-adopter-help`
            }
            list={`${uid}-adopter-options`}
            required
          />
          <datalist id={`${uid}-adopter-options`}>
            {recentAdopters.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name}
              </option>
            ))}
          </datalist>
          {errors.adopter_uid ? (
            <p id={`${uid}-adopter-err`} className="mt-1 text-xs text-destructive" role="alert">
              {errors.adopter_uid}
            </p>
          ) : (
            <p id={`${uid}-adopter-help`} className="mt-1 text-xs text-muted-foreground">
              {recentAdopters.length > 0
                ? `Selecione da lista de ${recentAdopters.length} adotante(s) recente(s) ou cole o UID manualmente.`
                : 'Cole o UID do adotante (encontre em applications recentes).'}
            </p>
          )}
        </div>
      )}

      {/* Condicional: foster → shelter_club_id */}
      {form.outcome === 'foster' && (
        <div>
          <Label htmlFor={`${uid}-shelter`}>Abrigo de destino (lar temporário / transferência)</Label>
          <select
            id={`${uid}-shelter`}
            ref={setFieldRef('shelter_club_id')}
            value={form.shelter_club_id}
            onChange={(e) => {
              const id = e.target.value;
              const found = otherClubs.find((c) => c.id === id);
              update({
                shelter_club_id: id,
                shelter_club_name: found ? found.name : '',
              });
            }}
            className="mt-1 w-full min-h-[44px] border rounded-md px-2 text-sm bg-background"
            aria-invalid={Boolean(errors.shelter_club_id)}
            aria-describedby={
              errors.shelter_club_id ? `${uid}-shelter-err` : `${uid}-shelter-help`
            }
            required
          >
            <option value="">— selecione um abrigo —</option>
            {otherClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.shelter_club_id ? (
            <p id={`${uid}-shelter-err`} className="mt-1 text-xs text-destructive" role="alert">
              {errors.shelter_club_id}
            </p>
          ) : (
            <p id={`${uid}-shelter-help`} className="mt-1 text-xs text-muted-foreground">
              {otherClubs.length > 0
                ? `Lista de ${otherClubs.length} abrigo(s) cadastrado(s).`
                : 'Nenhum outro abrigo disponível.'}
            </p>
          )}
        </div>
      )}

      {/* notes */}
      <div>
        <Label htmlFor={`${uid}-notes`}>
          Notas {form.outcome === 'other' ? <span className="text-destructive">*</span> : '(opcional)'}
        </Label>
        <Textarea
          id={`${uid}-notes`}
          ref={setFieldRef('notes')}
          value={form.notes}
          onChange={(e) => {
            if (e.target.value.length <= NOTES_MAX) {
              update({ notes: e.target.value });
            }
          }}
          rows={3}
          placeholder={
            form.outcome === 'other'
              ? 'Descreva o que aconteceu (mín. 3 caracteres)…'
              : 'Observações sobre o destino (opcional).'
          }
          className="min-h-[88px]"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={
            errors.notes ? `${uid}-notes-err` : `${uid}-notes-help`
          }
          required={form.outcome === 'other'}
        />
        {errors.notes ? (
          <p id={`${uid}-notes-err`} className="mt-1 text-xs text-destructive" role="alert">
            {errors.notes}
          </p>
        ) : (
          <p
            id={`${uid}-notes-help`}
            className={`mt-1 text-xs ${
              notesNearLimit ? 'text-amber-700' : 'text-muted-foreground'
            }`}
          >
            {notesCount}/{NOTES_MAX} caracteres
          </p>
        )}
      </div>

      {/* erro geral */}
      {errors._ && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{errors._}</p>
        </div>
      )}

      {/* ações */}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="min-h-[44px]"
        >
          {submitting ? 'Salvando…' : 'Registrar destino'}
        </Button>
      </div>
    </form>
  );
}

export default PostEventLog;
