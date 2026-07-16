/**
 * @fileoverview Painel de configuração do Google Forms por abrigo (Fase 5).
 *
 * Feature flag: `shelter_adopter_full_profile` também abrange o formulário
 * externo. Aqui o abrigo configura:
 * - form_id, form_url
 * - field_map (qual campo do Forms = qual campo do applicant_form)
 * - secret_token (gerado/regenerado)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 5
 */

import { confirmDialog } from '@/components/ui/confirm-provider';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  useGoogleFormsConfig,
  useCreateGoogleFormsConfig,
  useUpdateGoogleFormsConfig,
  useRotateGoogleFormsSecret,
} from '@/modules/shelter/hooks/useGoogleFormsConfig';

const DEFAULT_FIELD_MAP = {
  full_name: 'Nome completo',
  email: 'E-mail',
  phone: 'Telefone',
  reason_to_adopt: 'Por que quer adotar?',
  has_yard: 'Tem quintal?',
  household_size: 'Quantas pessoas na casa',
  has_children: 'Tem crianças?',
  pet_id: 'Qual pet? (campo oculto com ID)',
};

export function GoogleFormsConfigPanel({ shelterClubId, canAdmin = false, actor }) {
  const { data: config, isLoading } = useGoogleFormsConfig(shelterClubId);
  const createMutation = useCreateGoogleFormsConfig();
  const updateMutation = useUpdateGoogleFormsConfig(shelterClubId);
  const rotateMutation = useRotateGoogleFormsSecret(shelterClubId);
  const { toast } = useToast();

  const [draft, setDraft] = useState(null);
  const [secretVisible, setSecretVisible] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando config…</p>;
  }
  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }

  const isCreating = !config;
  const formData = draft || config || { enabled: false, field_map: DEFAULT_FIELD_MAP };

  const handleChange = (field, value) => {
    setDraft((d) => ({ ...(d || formData), [field]: value }));
  };
  const handleFieldMap = (key, value) => {
    setDraft((d) => ({
      ...(d || formData),
      field_map: { ...((d || formData).field_map || DEFAULT_FIELD_MAP), [key]: value },
    }));
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await createMutation.mutateAsync({
          input: { ...formData, shelter_club_id: shelterClubId },
          actor,
        });
        toast({ title: 'Integração criada. Anote o secret token.' });
        setSecretVisible(true);
      } else {
        const delta = _delta(config, formData);
        if (Object.keys(delta).length === 0) {
          toast({ title: 'Nada para salvar.' });
          return;
        }
        await updateMutation.mutateAsync({ updates: delta, actor });
        toast({ title: 'Config atualizada.' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleRotate = async () => {
    if (!(await confirmDialog({ title: 'Rotacionar o secret invalida o webhook imediatamente. Continuar?' }))) return;
    try {
      await rotateMutation.mutateAsync({ actor });
      toast({ title: 'Secret rotacionado.' });
      setSecretVisible(true);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="arena-section-card-title">Integração Google Forms</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Receba applications de visitantes anônimos (via Google Forms) sem precisar de login.
            </p>
          </div>
          <Badge variant={formData.enabled ? 'default' : 'secondary'}>
            {formData.enabled ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
      </div>
      <div className="arena-section-card-body space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="enabled">Status</Label>
            <label className="flex items-center gap-2 text-sm">
              <input
                id="enabled"
                type="checkbox"
                checked={Boolean(formData.enabled)}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                disabled={!canAdmin}
                className="h-4 w-4"
              />
              {formData.enabled ? 'Ativa' : 'Inativa'}
            </label>
          </div>
          <div>
            <Label htmlFor="form_id">Form ID (do Google Forms)</Label>
            <Input
              id="form_id"
              value={formData.form_id || ''}
              onChange={(e) => handleChange('form_id', e.target.value)}
              placeholder="1AbCdEf…"
              maxLength={200}
              disabled={!canAdmin}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="form_url">URL pública do Form</Label>
          <Input
            id="form_url"
            value={formData.form_url || ''}
            onChange={(e) => handleChange('form_url', e.target.value)}
            placeholder="https://forms.gle/abc123"
            disabled={!canAdmin}
          />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Mapeamento de campos</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Para cada campo do nosso applicant_form, qual é o nome do campo no Google Forms?
          </p>
          <div className="space-y-2">
            {Object.entries(DEFAULT_FIELD_MAP).map(([key, label]) => (
              <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                <span className="text-sm">{label}</span>
                <Input
                  value={formData.field_map?.[key] || ''}
                  onChange={(e) => handleFieldMap(key, e.target.value)}
                  placeholder={`Nome do campo no Forms`}
                  disabled={!canAdmin}
                />
              </div>
            ))}
          </div>
        </div>

        {config?.secret_token && (
          <div>
            <Label>Secret Token (compartilhe com o Apps Script)</Label>
            <div className="flex gap-2">
              <Input
                type={secretVisible ? 'text' : 'password'}
                value={config.secret_token}
                readOnly
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={() => setSecretVisible((v) => !v)}>
                {secretVisible ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button type="button" variant="outline" onClick={handleRotate}>
                Rotacionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total recebido: <strong>{config.total_received || 0}</strong>
              {config.last_received_at && ` • último: ${new Date(config.last_received_at).toLocaleString('pt-BR')}`}
            </p>
          </div>
        )}

        {canAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {isCreating ? 'Criar integração' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function _delta(oldObj, newObj) {
  if (!oldObj) return newObj || {};
  const out = {};
  for (const k of Object.keys(newObj || {})) {
    if (JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k])) {
      out[k] = newObj[k] === '' ? null : newObj[k];
    }
  }
  return out;
}
