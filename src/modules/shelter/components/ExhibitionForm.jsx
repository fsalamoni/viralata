/**
 * @fileoverview Componente: ExhibitionForm (Fase 11).
 *
 * Formulário para criar/editar uma vitrine. 5 seções:
 *   1. Dados básicos (título, organizador)
 *   2. Local (venue: endereço + lat/lng)
 *   3. Janela de tempo (start/end)
 *   4. Configurações (requires_volunteers, co_organizers)
 *   5. Notas
 *
 * Feature flag: `shelter_exhibition_workflow_v1` (default OFF).
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCreateExhibition } from '@/modules/shelter/hooks/useExhibitions';

function toLocalDatetimeInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Formato: YYYY-MM-DDTHH:MM
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeInput(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function ExhibitionForm({ shelterClubId, actor, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [organizerName, setOrganizerName] = useState(actor?.displayName || '');
  const [coOrganizersText, setCoOrganizersText] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [datetimeStart, setDatetimeStart] = useState('');
  const [datetimeEnd, setDatetimeEnd] = useState('');
  const [requiresVolunteers, setRequiresVolunteers] = useState(false);
  const [notes, setNotes] = useState('');

  const createMutation = useCreateExhibition(shelterClubId);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      toast({ title: 'Erro', description: 'Título deve ter ao menos 3 caracteres.', variant: 'destructive' });
      return;
    }
    if (!address.trim() || !lat || !lng) {
      toast({ title: 'Erro', description: 'Endereço e lat/lng são obrigatórios.', variant: 'destructive' });
      return;
    }
    const startIso = fromLocalDatetimeInput(datetimeStart);
    const endIso = fromLocalDatetimeInput(datetimeEnd);
    if (!startIso || !endIso) {
      toast({ title: 'Erro', description: 'Datas inválidas.', variant: 'destructive' });
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      toast({ title: 'Erro', description: 'Data final deve ser depois da inicial.', variant: 'destructive' });
      return;
    }

    const coOrganizersUids = coOrganizersText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const r = await createMutation.mutateAsync({
        input: {
          title: title.trim(),
          organizer_uid: actor.uid,
          organizer_name: organizerName.trim() || null,
          co_organizers_uids: coOrganizersUids,
          venue: {
            address: address.trim(),
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          },
          datetime_start: startIso,
          datetime_end: endIso,
          requires_volunteers: requiresVolunteers,
          notes: notes.trim() || undefined,
        },
        actor,
      });
      toast({ title: '✓ Vitrine criada.' });
      onCreated?.(r);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title">Nova vitrine</h3>
      </div>
      <div className="arena-section-card-body">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Básicos */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">1. Dados básicos</h3>
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Vitrine da Praça XV"
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome do organizador</label>
              <Input
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="(opcional — preenchido com seu nome)"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Co-organizadores (uids, separados por vírgula)</label>
              <Input
                value={coOrganizersText}
                onChange={(e) => setCoOrganizersText(e.target.value)}
                placeholder="user-1, user-2"
              />
            </div>
          </section>

          {/* 2. Local */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">2. Local</h3>
            <div>
              <label className="text-sm font-medium">Endereço *</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Praça XV, 100 — Centro"
                required
                minLength={3}
                maxLength={300}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Latitude *</label>
                <Input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-22.9"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude *</label>
                <Input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-43.2"
                  required
                />
              </div>
            </div>
          </section>

          {/* 3. Janela de tempo */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">3. Janela de tempo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Início *</label>
                <Input
                  type="datetime-local"
                  value={datetimeStart}
                  onChange={(e) => setDatetimeStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fim *</label>
                <Input
                  type="datetime-local"
                  value={datetimeEnd}
                  onChange={(e) => setDatetimeEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* 4. Configurações */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">4. Configurações</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresVolunteers}
                onChange={(e) => setRequiresVolunteers(e.target.checked)}
              />
              Precisa de voluntários (exibe escalas)
            </label>
          </section>

          {/* 5. Notas */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">5. Notas</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lembretes, instruções especiais, o que levar, etc."
              maxLength={2000}
              rows={3}
            />
          </section>

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando…' : 'Criar vitrine'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export { toLocalDatetimeInput };
