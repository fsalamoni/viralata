/**
 * @fileoverview Formulário do Cadastro Único do Animal (Fase 1, módulo abrigo).
 *
 * Componente isolado, sem dependência de plataforma — só estilos utilitários
 * + botões do módulo `core/components/ui`. Renderiza os campos novos do
 * schema `shelterAnimalProfileSchema`. Read-only para quem não tem permissão
 * de editar.
 *
 * Feature flag: `shelter_animal_unified_profile` (default OFF).
 *  - OFF: não é renderizado em lugar nenhum.
 *  - ON: aparece no PetDetail como nova aba "Cadastro" (Fase 2 vai expandir).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 1
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { INTAKE_TYPES, ASILOMAR_STATUSES, CURRENT_LOCATIONS, CURRENT_LOCATION_LABELS } from '@/modules/shelter/domain/core/animal';
import { useShelterAnimalProfile, useUpdateShelterAnimalProfile } from '@/modules/shelter/hooks/useShelterAnimalProfile';
import { updateShelterAnimalProfile as _callService } from '@/modules/shelter/services/shelterAnimalService';

/**
 * @param {object} props
 * @param {string} props.petId
 * @param {string} props.currentUserUid
 * @param {boolean} props.canEdit
 * @param {string} props.actorUid
 */
export function ShelterProfileForm({ petId, canEdit = false, actorUid }) {
  const { data: profile, isLoading } = useShelterAnimalProfile(petId);
  const updateMutation = useUpdateShelterAnimalProfile(petId);
  const { toast } = useToast();
  // O hook retorna uma mutation; o service real é chamado via mutation.mutateAsync
  // (mas o componente chama direto o service para simplificar — bypass do actor).
  // Mantemos o hook só para invalidação de cache.

  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile && draft === null) {
      setDraft(_emptyToEmpty(profile));
    }
  }, [profile, draft]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando perfil de abrigo…</p>;
  }

  if (!draft) {
    return <p className="text-sm text-muted-foreground">Perfil indisponível.</p>;
  }

  const isSaving = updateMutation.isPending;
  const isDirty = _isDirty(profile, draft);

  const handleChange = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const handleSave = async () => {
    try {
      const delta = _delta(profile, draft);
      if (Object.keys(delta).length === 0) {
        toast({ title: 'Nada para salvar.' });
        return;
      }
      // Injeta actor (o service espera um objeto {uid}).
      const res = await _callService(petId, delta, { uid: actorUid });
      toast({
        title: 'Perfil atualizado',
        description: `${res.changed_fields.length} campo(s) atualizado(s).`,
      });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Cadastro de Resgate</h2>
        <p className="text-sm text-muted-foreground">
          Identifica como e quando este animal entrou no abrigo. Esses dados
          seguem o animal em transferências entre abrigos.
        </p>
      </header>

      {/* Aviso: dados internos do abrigo (não vão para a página pública). */}
      <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Estes dados são internos do abrigo (registro, planilhas e métricas) e
        <strong> não aparecem na página pública do pet</strong>.
      </p>

      <fieldset disabled={!canEdit || isSaving} className="space-y-4">
        {/* Número de resgate — sequencial automático (read-only) */}
        {draft.rescue_number && (
          <div>
            <Label>Número do resgate</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold tracking-wide">
              {draft.rescue_number}
            </div>
          </div>
        )}

        {/* Resgate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rescue_name">Nome do resgate</Label>
            <Input
              id="rescue_name"
              value={draft.rescue_name || ''}
              onChange={(e) => handleChange('rescue_name', e.target.value || null)}
              placeholder="Título dado pelo resgatante (ex: Resgate da Ipiranga)"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="rescue_date">Data do resgate</Label>
            <Input
              id="rescue_date"
              type="datetime-local"
              value={_isoToInput(draft.rescue_date)}
              onChange={(e) => handleChange('rescue_date', _inputToIso(e.target.value) || null)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="rescue_responsible_name">Responsável pelo resgate</Label>
          <Input
            id="rescue_responsible_name"
            value={draft.rescue_responsible_name || ''}
            onChange={(e) => handleChange('rescue_responsible_name', e.target.value || null)}
            placeholder="Nome de quem resgatou"
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="rescue_location_description">Local do resgate (livre)</Label>
          <Textarea
            id="rescue_location_description"
            value={draft.rescue_location?.description || ''}
            onChange={(e) =>
              handleChange('rescue_location', {
                ...(draft.rescue_location || {}),
                description: e.target.value || null,
              })
            }
            rows={2}
            maxLength={280}
            placeholder="Ex: Avenida Ipiranga com Rua Silva Só, próximo a ponto de ônibus"
          />
        </div>

        {/* GPS do local do resgate (opcional) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-end gap-3">
          <div>
            <Label htmlFor="rescue_lat">Latitude (GPS)</Label>
            <Input
              id="rescue_lat"
              type="number"
              step="any"
              value={draft.rescue_location?.lat ?? ''}
              onChange={(e) =>
                handleChange('rescue_location', {
                  ...(draft.rescue_location || {}),
                  lat: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="-30.0346"
            />
          </div>
          <div>
            <Label htmlFor="rescue_lng">Longitude (GPS)</Label>
            <Input
              id="rescue_lng"
              type="number"
              step="any"
              value={draft.rescue_location?.lng ?? ''}
              onChange={(e) =>
                handleChange('rescue_location', {
                  ...(draft.rescue_location || {}),
                  lng: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="-51.2177"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!navigator.geolocation) {
                toast({ title: 'GPS indisponível neste dispositivo.' });
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => handleChange('rescue_location', {
                  ...(draft.rescue_location || {}),
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  source: 'device_gps',
                }),
                () => toast({ title: 'Não foi possível obter a localização.' }),
              );
            }}
          >
            Usar minha localização
          </Button>
        </div>

        {/* Identificação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="birth_date">Data de nascimento (se conhecida)</Label>
            <Input
              id="birth_date"
              type="date"
              value={(draft.birth_date || '').slice(0, 10)}
              onChange={(e) => handleChange('birth_date', e.target.value || null)}
            />
          </div>
          <div>
            <Label htmlFor="microchip_id">Microchip (15 dígitos ISO 11784/11785)</Label>
            <Input
              id="microchip_id"
              value={draft.microchip_id || ''}
              onChange={(e) => handleChange('microchip_id', e.target.value || null)}
              placeholder="123456789012345"
              maxLength={15}
              inputMode="numeric"
            />
            {errors.microchip_id && (
              <p className="text-xs text-destructive mt-1">{errors.microchip_id}</p>
            )}
          </div>
        </div>

        {/* Tipo de entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="intake_type">Tipo de entrada</Label>
            <select
              id="intake_type"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft.intake_type || ''}
              onChange={(e) => handleChange('intake_type', e.target.value || null)}
            >
              <option value="">— não informado —</option>
              {INTAKE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {_intakeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="asilomar_status">Status Asilomar</Label>
            <select
              id="asilomar_status"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft.asilomar_status || 'undetermined'}
              onChange={(e) => handleChange('asilomar_status', e.target.value)}
            >
              {ASILOMAR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {_asilomarLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {draft.intake_type && (
          <div>
            <Label htmlFor="intake_subtype">Subtipo (opcional)</Label>
            <Input
              id="intake_subtype"
              value={draft.intake_subtype || ''}
              onChange={(e) => handleChange('intake_subtype', e.target.value || null)}
              placeholder='Ex: "denúncia por maus-tratos", "ninhada"'
              maxLength={80}
            />
          </div>
        )}

        {/* Situação operacional interna */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="current_location">Localização atual</Label>
            <select
              id="current_location"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft.current_location || ''}
              onChange={(e) => handleChange('current_location', e.target.value || null)}
            >
              <option value="">— não informado —</option>
              {CURRENT_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {CURRENT_LOCATION_LABELS[loc] || loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="current_location_notes">Detalhe da localização</Label>
            <Input
              id="current_location_notes"
              value={draft.current_location_notes || ''}
              onChange={(e) => handleChange('current_location_notes', e.target.value || null)}
              placeholder="Ex: lar temporário da Maria; clínica VetX"
              maxLength={280}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="legal_process_number">Processo judicial (se houver)</Label>
          <Input
            id="legal_process_number"
            value={draft.legal_process_number || ''}
            onChange={(e) => handleChange('legal_process_number', e.target.value || null)}
            placeholder="Número do processo (deixe vazio se não houver)"
            maxLength={60}
          />
        </div>

        <div>
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            value={draft.observations || ''}
            onChange={(e) => handleChange('observations', e.target.value || null)}
            rows={3}
            maxLength={2000}
            placeholder="Observações internas sobre o animal"
          />
        </div>

        {/* Óbito (read-only por enquanto; Fase 8/21 implementa fluxo) */}
        {draft.deceased_at && (
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Animal veio a óbito em {_formatDate(draft.deceased_at)}
            {draft.death_cause ? ` (${draft.death_cause})` : ''}.
            Edição de óbito virá em fase posterior.
          </div>
        )}
      </fieldset>

      {canEdit && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || isSaving}
            onClick={() => setDraft(_emptyToEmpty(profile))}
          >
            Descartar
          </Button>
          <Button type="button" disabled={!isDirty || isSaving} onClick={handleSave}>
            {isSaving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers locais (UI) ────────────────────────────────────────────────

function _emptyToEmpty(obj) {
  if (!obj) return null;
  return {
    rescue_number: obj.rescue_number || '',
    rescue_name: obj.rescue_name || '',
    rescue_date: obj.rescue_date || '',
    rescue_responsible_name: obj.rescue_responsible_name || '',
    rescue_location: obj.rescue_location || {},
    birth_date: obj.birth_date || '',
    microchip_id: obj.microchip_id || '',
    intake_type: obj.intake_type || '',
    intake_subtype: obj.intake_subtype || '',
    asilomar_status: obj.asilomar_status || 'undetermined',
    current_location: obj.current_location || '',
    current_location_notes: obj.current_location_notes || '',
    legal_process_number: obj.legal_process_number || '',
    observations: obj.observations || '',
    deceased_at: obj.deceased_at || '',
    death_cause: obj.death_cause || '',
  };
}

function _delta(oldObj, newObj) {
  if (!oldObj) return newObj;
  const out = {};
  for (const k of Object.keys(newObj)) {
    if (JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k])) {
      out[k] = newObj[k] === '' ? null : newObj[k];
    }
  }
  return out;
}

function _isDirty(oldObj, newObj) {
  return Object.keys(_delta(oldObj, newObj)).length > 0;
}

function _isoToInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 16); // YYYY-MM-DDTHH:MM
}

function _inputToIso(input) {
  if (!input) return null;
  return new Date(input).toISOString();
}

function _formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

const INTAKE_LABELS = {
  rescue: 'Resgate',
  born: 'Nascido no abrigo',
  transfer: 'Transferência de outro abrigo',
  surrender: 'Entregue pelo tutor',
  purchase: 'Compra (resgate comercial)',
};
function _intakeLabel(t) {
  return INTAKE_LABELS[t] || t;
}

const ASILOMAR_LABELS = {
  healthy: 'Saudável',
  treatable_rehabilitatable: 'Tratável e reabilitável',
  treatable_manageable: 'Tratável com manejo contínuo',
  unhealthy_untreatable: 'Doente sem tratamento',
  undetermined: 'Não avaliado',
};
function _asilomarLabel(s) {
  return ASILOMAR_LABELS[s] || s;
}
