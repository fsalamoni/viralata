/**
 * @fileoverview ContractCard — card de contrato na lista (TASK-288).
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, ShieldCheck } from 'lucide-react';
import { CONTRACT_STATUS } from '../schemas/contractSchema';

const STATUS_LABEL = {
  [CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE]: 'Aguardando assinatura do abrigo',
  [CONTRACT_STATUS.FULLY_SIGNED]: 'Totalmente assinado',
  [CONTRACT_STATUS.CANCELLED]: 'Cancelado',
};

const STATUS_VARIANT = {
  [CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE]: 'secondary',
  [CONTRACT_STATUS.FULLY_SIGNED]: 'default',
  [CONTRACT_STATUS.CANCELLED]: 'destructive',
};

export function ContractCard({ contract, onDownload, onSign, canSign = false }) {
  const { id, pet_id, adopter_uid, status, created_at, document_version, pdf_storage_path } = contract;
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="arena-section-card-title flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Contrato {id.slice(0, 12)}…
            </h3>
            <p className="arena-section-card-description">
              Pet: {pet_id} · Adotante: {adopter_uid.slice(0, 12)}… · v{document_version}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[status] || 'outline'}>
            {STATUS_LABEL[status] || status}
          </Badge>
        </div>
      </div>
      <div className="arena-section-card-body">
        <p className="text-xs text-muted-foreground mb-3">
          Criado em {new Date(created_at).toLocaleString('pt-BR')}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onDownload?.(pdf_storage_path)}>
            <Download className="h-4 w-4 mr-1" /> Baixar PDF
          </Button>
          {canSign && status === CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE && (
            <Button size="sm" onClick={() => onSign?.(id)}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Assinar
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
