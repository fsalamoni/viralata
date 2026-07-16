/**
 * @fileoverview RescueStep — step "Resgate" do wizard de criação de pet
 * (TASK-296). Captura informações de origem do pet: nome do resgatador,
 * data, localização, microchip, intake_type e asilomar_status.
 *
 * **Conformidade**: dados de resgate são usados em auditorias
 * veterinárias (CFMV) e relatórios Asilomar (abrigos internacionais).
 *
 * **Asilomar Status** (5 valores) — convenção internacional:
 *  - `healthy`: saudável, pronto para adoção
 *  - `treatable_rehabilitatable`: tratável, reabilitável
 *  - `treatable_manageable`: tratável, gerenciável (ex: FIV+)
 *  - `unhealthy_untreatable`: não tratável
 *  - `unknown`: desconhecido (avaliação pendente)
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, MapPin, Calendar, User, AlertCircle } from 'lucide-react';

/** Tipos de intake (origem do pet). */
export const INTAKE_TYPES = [
  { value: 'stray', label: 'Animal de rua' },
  { value: 'surrender', label: 'Entrega voluntária (tutor)' },
  { value: 'transfer', label: 'Transferência de outro abrigo' },
  { value: 'return', label: 'Devolução (pós-adoção)' },
  { value: 'born', label: 'Nascido no abrigo' },
];

/** Status Asilomar — convenção internacional de abrigos. */
export const ASILOMAR_STATUS = [
  { value: 'healthy', label: 'Saudável', tone: 'Pronto para adoção', color: 'green' },
  { value: 'treatable_rehabilitatable', label: 'Tratável/Reabilitável', tone: 'Recuperável com tratamento', color: 'blue' },
  { value: 'treatable_manageable', label: 'Tratável/Gerenciável', tone: 'Crônico controlável (FIV+, diabético)', color: 'amber' },
  { value: 'unhealthy_untreatable', label: 'Não tratável', tone: 'Sem perspectiva de recuperação', color: 'red' },
  { value: 'unknown', label: 'Desconhecido', tone: 'Avaliação veterinária pendente', color: 'gray' },
];

export function RescueStep({ form, setValue }) {
  const update = (field, value) => {
    setValue(field, value, { shouldValidate: false });
  };

  return (
    <div className="space-y-4">
      {/* Intro / microcopy */}
      <section className="arena-section-card">
        <div className="arena-section-card-body p-4 text-sm text-muted-foreground flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Sobre o Status Asilomar:</strong> convenção internacional
            usada em abrigos do mundo todo para classificar o estado de saúde
            e perspectivas de adoção. Auxilia na tomada de decisão ética e
            padroniza relatórios de transparência.
          </p>
        </div>
      </section>

      {/* Identificação do resgate */}
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Identificação do resgate
          </h3>
        </div>
        <div className="arena-section-card-body space-y-3">
          <div>
            <Label htmlFor="rescue_name">Nome do resgatador / tutor original</Label>
            <Input
              id="rescue_name"
              value={form.rescue_name || ''}
              onChange={(e) => update('rescue_name', e.target.value)}
              placeholder="Ex: Maria Silva (tutora) ou [Anônimo]"
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rescue_date" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data do resgate
              </Label>
              <Input
                id="rescue_date"
                type="date"
                value={form.rescue_date || ''}
                onChange={(e) => update('rescue_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="rescue_by_uid">UID do resgatador (opcional)</Label>
              <Input
                id="rescue_by_uid"
                value={form.rescue_by_uid || ''}
                onChange={(e) => update('rescue_by_uid', e.target.value)}
                placeholder="uid (vínculo com users collection)"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Local do resgate
          </h3>
          <p className="arena-section-card-description">
            Endereço aproximado (não exigir precisão por privacidade).
          </p>
        </div>
        <div className="arena-section-card-body space-y-3">
          <div>
            <Label htmlFor="rescue_address">Endereço (rua, bairro)</Label>
            <Input
              id="rescue_address"
              value={form.rescue_address || ''}
              onChange={(e) => update('rescue_address', e.target.value)}
              placeholder="Ex: Rua das Flores, 123 — Centro"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="rescue_city">Cidade</Label>
              <Input
                id="rescue_city"
                value={form.rescue_city || ''}
                onChange={(e) => update('rescue_city', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rescue_state">UF</Label>
              <Input
                id="rescue_state"
                value={form.rescue_state || ''}
                onChange={(e) => update('rescue_state', e.target.value)}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div>
              <Label htmlFor="rescue_zip">CEP</Label>
              <Input
                id="rescue_zip"
                value={form.rescue_zip || ''}
                onChange={(e) => update('rescue_zip', e.target.value)}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rescue_lat">Latitude (opcional)</Label>
              <Input
                id="rescue_lat"
                type="number"
                step="any"
                value={form.rescue_lat ?? ''}
                onChange={(e) => update('rescue_lat', e.target.value)}
                placeholder="-23.5505"
              />
            </div>
            <div>
              <Label htmlFor="rescue_lng">Longitude (opcional)</Label>
              <Input
                id="rescue_lng"
                type="number"
                step="any"
                value={form.rescue_lng ?? ''}
                onChange={(e) => update('rescue_lng', e.target.value)}
                placeholder="-46.6333"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Classificação */}
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" /> Classificação
          </h3>
        </div>
        <div className="arena-section-card-body space-y-3">
          <div>
            <Label htmlFor="intake_type">Tipo de intake</Label>
            <Select value={form.intake_type || ''} onValueChange={(v) => update('intake_type', v)}>
              <SelectTrigger id="intake_type">
                <SelectValue placeholder="Selecione a origem do pet" />
              </SelectTrigger>
              <SelectContent>
                {INTAKE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="asilomar_status">Status Asilomar</Label>
            <Select
              value={form.asilomar_status || ''}
              onValueChange={(v) => update('asilomar_status', v)}
            >
              <SelectTrigger id="asilomar_status">
                <SelectValue placeholder="Selecione o status de saúde" />
              </SelectTrigger>
              <SelectContent>
                {ASILOMAR_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">{s.tone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="microchip_id">Microchip (opcional)</Label>
            <Input
              id="microchip_id"
              value={form.microchip_id || ''}
              onChange={(e) => update('microchip_id', e.target.value)}
              placeholder="Ex: 985112004523456"
              maxLength={20}
            />
          </div>
          <div>
            <Label htmlFor="rescue_notes">Observações do resgate</Label>
            <Textarea
              id="rescue_notes"
              value={form.rescue_notes || ''}
              onChange={(e) => update('rescue_notes', e.target.value)}
              placeholder="Estado do animal ao chegar, condições, história…"
              rows={3}
              maxLength={2000}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
