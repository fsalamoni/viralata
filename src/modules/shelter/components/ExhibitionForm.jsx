/**
 * @fileoverview Componente: ExhibitionForm (Fase 11).
 *
 * Formulário de criação/edição de Vitrines. Sub-componente do
 * ExhibitionsList.
 *
 * Seções:
 *   1. Dados básicos (título, co-organizadores)
 *   2. Localização (endereço, cidade, UF, lat/lng, place_id)
 *   3. Data/horário (data, time_start, time_end)
 *   4. Responsáveis (lista de UIDs — input livre por enquanto)
 *   5. Animais do abrigo (lista livre de pet_ids)
 *   6. Pets externos (coalizão: owner_uid + pet_id + shelter_id)
 *   7. Observações
 *
 * Feature flag: `shelter_exhibitions` (default OFF).
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function ExhibitionForm({
  shelterClubId,
  initialValue = null,        // exhibition existente (modo edição) ou null (criação)
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const isEdit = Boolean(initialValue?.id);

  const [title, setTitle] = useState(initialValue?.title || '');
  const [coOrganizersText, setCoOrganizersText] = useState(
    (initialValue?.co_organizers || []).join(', '),
  );
  const [address, setAddress] = useState(initialValue?.location?.address || '');
  const [city, setCity] = useState(initialValue?.location?.city || '');
  const [stateUf, setStateUf] = useState(initialValue?.location?.state || 'SC');
  const [lat, setLat] = useState(
    initialValue?.location?.lat != null ? String(initialValue.location.lat) : '',
  );
  const [lng, setLng] = useState(
    initialValue?.location?.lng != null ? String(initialValue.location.lng) : '',
  );
  const [placeId, setPlaceId] = useState(initialValue?.location?.place_id || '');

  const [date, setDate] = useState(
    initialValue?.date
      ? new Date(
          typeof initialValue.date.seconds === 'number'
            ? initialValue.date.seconds * 1000
            : initialValue.date,
        )
          .toISOString()
          .slice(0, 10)
      : '',
  );
  const [timeStart, setTimeStart] = useState(initialValue?.time_start || '14:00');
  const [timeEnd, setTimeEnd] = useState(initialValue?.time_end || '18:00');

  const [responsibleUidsText, setResponsibleUidsText] = useState(
    (initialValue?.responsible_uids || ['']).join(', '),
  );

  const [animalsText, setAnimalsText] = useState(
    (initialValue?.animals || []).join(', '),
  );
  const [externalPets, setExternalPets] = useState(
    initialValue?.external_pets || [],
  );
  const [notes, setNotes] = useState(initialValue?.notes || '');

  const handleAddExternalPet = () => {
    setExternalPets((prev) => [...prev, { owner_uid: '', pet_id: '', shelter_id: '' }]);
  };
  const handleRemoveExternalPet = (idx) => {
    setExternalPets((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleUpdateExternalPet = (idx, field, value) => {
    setExternalPets((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const splitIds = (txt) =>
      String(txt || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const dateIso = date
      ? new Date(`${date}T12:00:00.000Z`).toISOString()
      : null;

    const payload = {
      title: title.trim(),
      organizer_shelter_id: shelterClubId,
      co_organizers: splitIds(coOrganizersText),
      location: {
        address: address.trim(),
        city: city.trim(),
        state: stateUf,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        place_id: placeId.trim() || undefined,
      },
      date: dateIso,
      time_start: timeStart,
      time_end: timeEnd,
      responsible_uids: splitIds(responsibleUidsText),
      animals: splitIds(animalsText),
      external_pets: externalPets.filter(
        (p) => p.pet_id && p.shelter_id && p.owner_uid,
      ),
      notes: notes.trim() || undefined,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-md border border-border p-5 bg-zinc-50">
      {/* 1. Dados básicos */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">1. Dados básicos</h3>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Título <span className="text-red-600">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Vitrine da Praça XV"
            minLength={3}
            maxLength={200}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Co-organizadores (IDs de abrigos, separados por vírgula)
          </label>
          <Input
            value={coOrganizersText}
            onChange={(e) => setCoOrganizersText(e.target.value)}
            placeholder="shelter-xyz, shelter-abc"
          />
        </div>
      </section>

      {/* 2. Localização */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">2. Localização</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-foreground block mb-1">Endereço</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Praça XV, s/n"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground block mb-1">Cidade</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Florianópolis"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">UF</label>
            <select
              value={stateUf}
              onChange={(e) => setStateUf(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
              required
            >
              {BRAZILIAN_STATES.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Latitude (opcional)</label>
            <Input
              type="number" step="any" min={-90} max={90}
              value={lat} onChange={(e) => setLat(e.target.value)}
              placeholder="-27.59"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Longitude (opcional)</label>
            <Input
              type="number" step="any" min={-180} max={180}
              value={lng} onChange={(e) => setLng(e.target.value)}
              placeholder="-48.55"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Google Place ID (opcional)</label>
            <Input
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="ChIJ..."
            />
          </div>
        </div>
      </section>

      {/* 3. Data/horário */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">3. Data e horário</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Data</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Início (HH:MM)</label>
            <Input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Fim (HH:MM)</label>
            <Input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              required
            />
          </div>
        </div>
      </section>

      {/* 4. Responsáveis */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">4. Responsáveis</h3>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            UIDs dos responsáveis (separados por vírgula, mínimo 1)
          </label>
          <Input
            value={responsibleUidsText}
            onChange={(e) => setResponsibleUidsText(e.target.value)}
            placeholder="user-1, user-2"
            required
          />
        </div>
      </section>

      {/* 5. Animais do abrigo */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">5. Animais do abrigo</h3>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            IDs dos pets do abrigo (separados por vírgula)
          </label>
          <Input
            value={animalsText}
            onChange={(e) => setAnimalsText(e.target.value)}
            placeholder="pet-1, pet-2, pet-3"
          />
        </div>
      </section>

      {/* 6. Pets externos (coalizão) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">6. Pets externos (coalizão)</h3>
          <Button type="button" size="sm" variant="outline" onClick={handleAddExternalPet}>
            + Adicionar pet externo
          </Button>
        </div>
        {externalPets.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum pet externo adicionado.</p>
        ) : (
          <ol className="space-y-2">
            {externalPets.map((ep, idx) => (
              <li key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md border border-border p-3">
                <Input
                  value={ep.owner_uid}
                  onChange={(e) => handleUpdateExternalPet(idx, 'owner_uid', e.target.value)}
                  placeholder="owner_uid"
                />
                <Input
                  value={ep.pet_id}
                  onChange={(e) => handleUpdateExternalPet(idx, 'pet_id', e.target.value)}
                  placeholder="pet_id"
                />
                <div className="flex gap-2">
                  <Input
                    value={ep.shelter_id}
                    onChange={(e) => handleUpdateExternalPet(idx, 'shelter_id', e.target.value)}
                    placeholder="shelter_id"
                  />
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => handleRemoveExternalPet(idx)}
                    className="text-red-700"
                  >
                    ×
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 7. Observações */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">7. Observações</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotações livres (ex: levar coleiras extras, voluntária Joana confirmada...)"
          maxLength={2000}
          rows={3}
        />
      </section>

      <div className="flex gap-2 justify-end pt-3 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Criar vitrine')}
        </Button>
      </div>
    </form>
  );
}
