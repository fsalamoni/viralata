/**
 * @fileoverview SingleAcceptanceDialog — modal de aceite para UM documento
 * legal (uso em fluxos de ação: adoção, LT, doação, voluntariado, abrigo).
 *
 * Componente genérico que renderiza:
 *   1. Texto integral do termo (scrollable, altura limitada)
 *   2. Checkbox "Li integralmente" + "Compreendo" + "Aceito"
 *   3. Campo de assinatura eletrônica (nome completo)
 *   4. Hash do documento computado via Web Crypto API
 *
 * O aceite é gravado pelo chamador via callback `onAccept` —
 * este componente NÃO fala com Firestore. O caller é que sabe
 * qual doc gravar (application, foster, donation, etc.).
 *
 * Usado em:
 *   - AdocaoResponsavelDialog (adoption)
 *   - FosterAcceptanceDialog (LT)
 *   - DonationAcceptanceDialog (donation)
 *   - VolunteerAcceptanceDialog (volunteer signup)
 *   - ShelterDpaAcceptanceDialog (shelter onboarding - DPA)
 *
 * Guias de Implementacao Legal v2 (10/07/2026) - Lei 14.063/2020
 * (assinatura eletronica basica) + LGPD art. 37 (registro de operacoes).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 4-6)
 * @see src/modules/shelter/domain/legal/ (textos integrais)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/core/lib/utils';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {string} props.title - titulo do modal (ex: "Termo de Adocao")
 * @param {string} props.description - subtitulo explicando o contexto
 * @param {string} props.documentText - texto integral a ser exibido
 * @param {string} props.documentVersion - versao do documento (ex: "2026-07-10")
 * @param {string} [props.legalRepLabel] - label do campo de assinatura
 *   (default: "Digite seu nome completo")
 * @param {string} [props.prefillSignature] - valor pre-preenchido (ex: nome do user)
 * @param {Function} props.onAccept - async ({signature, documentHash, acceptedAt}) => void
 * @param {string} [props.acceptButtonLabel] - label do botao de submit
 * @param {boolean} [props.requireCpf] - exige CPF para assinatura (uso em DPA abrigo)
 * @param {string} [props.prefillCpf] - CPF pre-preenchido
 */
export default function SingleAcceptanceDialog({
  open,
  onOpenChange,
  title,
  description,
  documentText,
  documentVersion,
  legalRepLabel = 'Digite seu nome completo como assinatura eletronica (Lei 14.063/2020):',
  prefillSignature = '',
  prefillCpf = '',
  onAccept,
  acceptButtonLabel = 'Aceitar e continuar',
  requireCpf = false,
  requireRole = false,
  prefillRole = '',
  roleLabel = 'Cargo / funcao do responsavel:',
}) {
  const [signature, setSignature] = useState(prefillSignature);
  const [cpf, setCpf] = useState(prefillCpf);
  const [role, setRole] = useState(prefillRole);
  const [checks, setChecks] = useState({ read: false, understood: false, agree: false });
  const [documentHash, setDocumentHash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Reseta estado quando o modal abre/fecha
  useEffect(() => {
    if (open) {
      setSignature(prefillSignature);
      setCpf(prefillCpf);
      setRole(prefillRole);
      setChecks({ read: false, understood: false, agree: false });
      setDocumentHash(null);
      setError(null);
    }
  }, [open, prefillSignature, prefillCpf, prefillRole]);

  // Computa o hash SHA-256 do texto (Web Crypto API).
  // Resultado e gravado no Firestore como prova de integridade.
  useEffect(() => {
    if (!open || !documentText) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(documentText);
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        const hashHex = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
        if (!cancelled) setDocumentHash(hashHex);
      } catch (e) {
        // Crypto API indisponivel - falha silenciosa (hash null)
        if (!cancelled) setDocumentHash(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, documentText]);

  const allChecked = checks.read && checks.understood && checks.agree;
  const signatureOk = signature.trim().length >= 3;
  const cpfOk = !requireCpf || cpf.replace(/\D/g, '').length === 11;
  const roleOk = !requireRole || role.trim().length >= 2;
  const canSubmit = allChecked && signatureOk && cpfOk && roleOk && !busy;

  async function handleSubmit() {
    if (!canSubmit || typeof onAccept !== 'function') return;
    setBusy(true);
    setError(null);
    try {
      const acceptedAt = new Date().toISOString();
      await onAccept({
        signature: signature.trim(),
        cpf: requireCpf ? cpf.replace(/\D/g, '') : null,
        role: requireRole ? role.trim() : null,
        documentHash,
        documentVersion,
        acceptedAt,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || 'Nao foi possivel registrar o aceite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Texto integral do documento */}
          <section className="rounded-md border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Texto integral - versao {documentVersion}
              </h4>
            </header>
            <pre className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-[1.55] text-foreground/85 sm:text-xs">
{documentText}
            </pre>
          </section>

          {/* 3 checkboxes de consciencia */}
          <div className="space-y-1.5">
            <CheckRow
              id={`acc-${documentVersion}-read`}
              checked={checks.read}
              onChange={(v) => setChecks((p) => ({ ...p, read: v }))}
              label="Li integralmente o documento acima."
            />
            <CheckRow
              id={`acc-${documentVersion}-und`}
              checked={checks.understood}
              onChange={(v) => setChecks((p) => ({ ...p, understood: v }))}
              label="Compreendo as condicoes e responsabilidades."
            />
            <CheckRow
              id={`acc-${documentVersion}-agr`}
              checked={checks.agree}
              onChange={(v) => setChecks((p) => ({ ...p, agree: v }))}
              label="Aceito de forma livre e espontanea."
            />
          </div>

          {/* Assinatura eletronica */}
          <div className="space-y-2">
            <label
              htmlFor="single-acc-signature"
              className="block text-xs font-medium text-foreground/80"
            >
              {legalRepLabel}
            </label>
            <Input
              id="single-acc-signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Ex.: Maria Silva da Silva"
              className="font-serif italic"
              disabled={busy}
            />
            {requireCpf && (
              <div className="space-y-1">
                <label htmlFor="single-acc-cpf" className="block text-xs font-medium text-foreground/80">
                  CPF do responsavel legal:
                </label>
                <Input
                  id="single-acc-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={busy}
                />
              </div>
            )}
            {requireRole && (
              <div className="space-y-1">
                <label htmlFor="single-acc-role" className="block text-xs font-medium text-foreground/80">
                  {roleLabel}
                </label>
                <Input
                  id="single-acc-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex.: Presidente / Diretor / Coordenador"
                  disabled={busy}
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Esta assinatura sera vinculada ao hash SHA-256 do documento,
              com registro de data, IP e user agent. Aceite imutavel.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {documentHash && (
            <p className="break-all rounded-md bg-muted/40 p-2 text-[10px] text-muted-foreground">
              Hash SHA-256: <code>{documentHash}</code>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn('min-w-[180px]')}
          >
            {busy ? 'Registrando...' : acceptButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-foreground/85">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-primary/40 text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  );
}
