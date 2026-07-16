import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, FileText, Upload, CheckCircle2, User } from 'lucide-react';
import { isValidCpf } from '@/core/lib/cpfUtils';

export const RELATIONSHIP_TYPES = [
  { value: 'pai_mae', label: 'Pai / Mãe' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'filho_filha', label: 'Filho / Filha' },
  { value: 'irmao_irma', label: 'Irmão / Irmã' },
  { value: 'tutor', label: 'Tutor legal' },
  { value: 'procurador', label: 'Procurador' },
  { value: 'outro', label: 'Outro' },
];

export function AdoptionProxyDialog({ open, onOpenChange, onSubmit, proxyData, onProxyDataChange }) {
  const [proxyEnabled, setProxyEnabled] = useState(proxyData?.enabled || false);
  const [representedName, setRepresentedName] = useState(proxyData?.representedName || '');
  const [representedCpf, setRepresentedCpf] = useState(proxyData?.representedCpf || '');
  const [relationship, setRelationship] = useState(proxyData?.relationship || '');
  const [relationshipDetail, setRelationshipDetail] = useState(proxyData?.relationshipDetail || '');
  const [proxyDocument, setProxyDocument] = useState(proxyData?.proxyDocument || null);
  const [accepted, setAccepted] = useState(proxyData?.accepted || false);

  const cpfValid = representedCpf ? isValidCpf(representedCpf) : true;
  const canSubmit = proxyEnabled && representedName.trim().length >= 3 && cpfValid && relationship && (relationship !== 'outro' || relationshipDetail.trim().length >= 3) && proxyDocument && accepted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="adoption-proxy-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5 text-amber-600" />Representação legal (procuração)</DialogTitle>
          <DialogDescription>Se você está assinando em nome de outra pessoa, preencha os dados e anexe a procuração (Lei 14.063/2020 art. 6º).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <Checkbox checked={proxyEnabled} onCheckedChange={(v) => { setProxyEnabled(!!v); onProxyDataChange?.({ ...proxyData, enabled: !!v }); }} data-testid="proxy-checkbox" />
            <span className="text-[13px] font-semibold text-amber-900">Represento outra pessoa</span>
          </label>
          {proxyEnabled && (
            <div className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="proxy-name">Nome completo do representado *</Label>
                <Input id="proxy-name" value={representedName} onChange={(e) => { setRepresentedName(e.target.value); onProxyDataChange?.({ ...proxyData, representedName: e.target.value }); }} data-testid="proxy-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proxy-cpf">CPF *</Label>
                  <Input id="proxy-cpf" value={representedCpf} onChange={(e) => { setRepresentedCpf(e.target.value); onProxyDataChange?.({ ...proxyData, representedCpf: e.target.value }); }} data-testid="proxy-cpf-input" />
                  {representedCpf && !cpfValid && <p className="text-[11.5px] text-rose-600" data-testid="proxy-cpf-invalid">CPF inválido</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proxy-rel">Tipo *</Label>
                  <select id="proxy-rel" value={relationship} onChange={(e) => { setRelationship(e.target.value); onProxyDataChange?.({ ...proxyData, relationship: e.target.value }); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" data-testid="proxy-relationship-select">
                    <option value="">Selecione...</option>
                    {RELATIONSHIP_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              {relationship === 'outro' && (
                <Input value={relationshipDetail} onChange={(e) => { setRelationshipDetail(e.target.value); onProxyDataChange?.({ ...proxyData, relationshipDetail: e.target.value }); }} placeholder="Detalhe" data-testid="proxy-relationship-detail" />
              )}
              <div className="space-y-1.5">
                <Label>Procuração *</Label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-[12.5px]">
                  <Upload className="h-3.5 w-3.5" />{proxyDocument ? 'Trocar' : 'Selecionar'}
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProxyDocument({ name: f.name, size: f.size }); onProxyDataChange?.({ ...proxyData, proxyDocument: { name: f.name, size: f.size } }); } }} className="hidden" data-testid="proxy-file-input" />
                </label>
                {proxyDocument && <span className="ml-2 text-[12px] text-emerald-700" data-testid="proxy-file-name"><FileText className="h-3.5 w-3.5 inline" /> {proxyDocument.name}</span>}
              </div>
              <label className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-2.5">
                <Checkbox checked={accepted} onCheckedChange={(v) => { setAccepted(!!v); onProxyDataChange?.({ ...proxyData, accepted: !!v }); }} data-testid="proxy-accept-checkbox" />
                <span className="text-[12px] text-emerald-900">Declaro que tenho poderes legais (Lei 14.063/2020 art. 6º).</span>
              </label>
              {!canSubmit && proxyEnabled && <p className="flex items-center gap-1 text-[11.5px] text-amber-700" data-testid="proxy-warning"><AlertTriangle className="h-3.5 w-3.5" />Preencha todos os campos.</p>}
              {canSubmit && <p className="flex items-center gap-1 text-[11.5px] text-emerald-700" data-testid="proxy-ready"><CheckCircle2 className="h-3.5 w-3.5" />Pronto!</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={!canSubmit} data-testid="proxy-submit">Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdoptionProxyDialog;
