/**
 * @fileoverview TermsAcceptanceModal — modal de aceite em lote
 * (geral: General + Privacy + Conduct).
 *
 * Renderiza 3 `TermsDocument` empilhados (cada um com seu próprio
 * hash + checkbox + assinatura), ou um único `TermsDocument` quando
 * o caller passa um `types` custom.
 *
 * Comportamento:
 *  - 3 checkboxes por termo (Li / Compreendo / Aceito) — todos
 *    desmarcados por default.
 *  - 1 campo "Digite seu nome" compartilhado entre os termos
 *    (reaproveita a assinatura).
 *  - SHA-256 do conteúdo de cada termo é computado no client.
 *  - Envia tudo via `onAccept({items, signature, ip, ua})`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
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
import {
  TERMS_TYPE,
  TERMS_TYPE_META,
  computeDocumentHash,
  getCurrentTermsVersion,
} from '@/modules/shelter/domain/legal/terms';

/** Tipos padrão de signup: General + Privacy + Conduct. */
const DEFAULT_TYPES = [TERMS_TYPE.GENERAL, TERMS_TYPE.PRIVACY, TERMS_TYPE.CONDUCT];

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {string} [props.userId] - uid do usuário (audit)
 * @param {string} [props.userDisplayName] - nome pré-preenchido
 * @param {string[]} [props.types=DEFAULT_TYPES] - tipos a aceitar
 * @param {Function} props.onAccept - ({items, signature, ip, ua}) => void|Promise
 * @param {string} [props.title] - título do modal
 * @param {string} [props.description] - subtítulo
 * @param {React.ReactNode} [props.documents] - {general, privacy, conduct} overrides
 */
export default function TermsAcceptanceModal({
  open,
  onOpenChange,
  userId,
  userDisplayName = '',
  types = DEFAULT_TYPES,
  onAccept,
  title = 'Aceite de Termos e Política de Privacidade',
  description = 'Para usar a plataforma Viralata, precisamos do seu consentimento livre e informado nos documentos abaixo.',
  documents,
}) {
  const [signature, setSignature] = useState(userDisplayName);
  const [checks, setChecks] = useState(() =>
    types.reduce((acc, t) => {
      acc[t] = { read: false, understood: false, agree: false };
      return acc;
    }, {}),
  );
  const [hashes, setHashes] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setSignature(userDisplayName);
      setChecks(
        types.reduce((acc, t) => {
          acc[t] = { read: false, understood: false, agree: false };
          return acc;
        }, {}),
      );
      setHashes({});
      setError(null);
    }
  }, [open, userDisplayName, types]);

  // Computa o hash de cada documento quando o modal abre
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      const next = {};
      for (const t of types) {
        const content = getContent(t, documents);
        next[t] = await computeDocumentHash(content);
        if (cancelled) return;
      }
      if (!cancelled) setHashes(next);
    })();
    return () => { cancelled = true; };
  }, [open, types, documents]);

  const allChecked = types.every(
    (t) => checks[t]?.read && checks[t]?.understood && checks[t]?.agree,
  );
  const signatureOk = signature.trim().length >= 3;
  const allHashesReady = types.every((t) => Boolean(hashes[t]));
  const canSubmit = allChecked && signatureOk && allHashesReady && !busy;

  async function handleSubmit() {
    if (!canSubmit || typeof onAccept !== 'function') return;
    setBusy(true);
    setError(null);
    try {
      const items = types.map((t) => ({
        terms_type: t,
        terms_version: getCurrentTermsVersion(t),
        document_hash: hashes[t],
        signature_text: signature.trim(),
      }));
      const ctx = {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ip_address: 'unknown', // preenchido por Cloud Function se necessário
        liveness_verified: false,
        legal_basis: 'consentimento (LGPD Art. 7º I)',
      };
      await onAccept({ items, signature: signature.trim(), ctx });
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || 'Não foi possível registrar o aceite.');
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
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {types.map((t) => (
            <TermBlock
              key={t}
              type={t}
              checks={checks[t] || {}}
              onChange={(next) =>
                setChecks((prev) => ({ ...prev, [t]: next }))
              }
              hash={hashes[t]}
              customContent={documents?.[t]}
            />
          ))}

          <div className="space-y-2">
            <label
              htmlFor="modal-signature"
              className="block text-xs font-medium text-foreground/80"
            >
              Digite seu nome completo como assinatura eletrônica
              (Lei 14.063/2020):
            </label>
            <Input
              id="modal-signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Ex.: Maria Silva da Silva"
              className="font-serif italic"
              disabled={busy}
            />
            <p className="text-[11px] text-muted-foreground">
              Esta assinatura será vinculada ao hash SHA-256 de cada termo,
              com registro de data, IP e user agent. Aceite é imutável.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
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
            {busy ? 'Registrando…' : 'Aceitar e continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

const ICON_FOR_TYPE = {
  [TERMS_TYPE.GENERAL]: FileText,
  [TERMS_TYPE.PRIVACY]: ShieldCheck,
  [TERMS_TYPE.CONDUCT]: UserCheck,
};

function TermBlock({ type, checks, onChange, hash, customContent }) {
  const meta = TERMS_TYPE_META[type];
  const Icon = ICON_FOR_TYPE[type] || FileText;
  return (
    <section className="rounded-md border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">{meta?.label}</h4>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Versão {getCurrentTermsVersion(type)}
        </span>
      </header>
      <div className="space-y-2 p-3 text-xs leading-5 text-foreground/80">
        {customContent || <DefaultTermSummary type={type} />}
        <div className="space-y-1 pt-1">
          <CheckRow
            id={`m-${type}-read`}
            checked={checks.read}
            onChange={(v) => onChange({ ...checks, read: v })}
            label="Li integralmente o documento."
          />
          <CheckRow
            id={`m-${type}-und`}
            checked={checks.understood}
            onChange={(v) => onChange({ ...checks, understood: v })}
            label="Compreendo as condições e responsabilidades."
          />
          <CheckRow
            id={`m-${type}-agr`}
            checked={checks.agree}
            onChange={(v) => onChange({ ...checks, agree: v })}
            label="Aceito de forma livre e espontânea."
          />
        </div>
        {hash && (
          <p className="break-all pt-1 text-[10px] text-muted-foreground">
            Hash: <code>{hash}</code>
          </p>
        )}
      </div>
    </section>
  );
}

function CheckRow({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2">
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

function DefaultTermSummary({ type }) {
  const meta = TERMS_TYPE_META[type];
  if (!meta) return null;
  return (
    <p>
      {meta.short}{' '}
      <a
        href={meta.section_path}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        Ver documento completo →
      </a>
    </p>
  );
}

/** Helper: retorna o conteúdo canônico usado para hash de um tipo. */
function getContent(type, documents) {
  if (documents?.[type]) return documents[type];
  const meta = TERMS_TYPE_META[type];
  return `${meta?.label || type}\n${getCurrentTermsVersion(type)}\n${meta?.short || ''}\n${meta?.section_path || ''}`;
}
