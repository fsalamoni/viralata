/**
 * @fileoverview TermsDocument — wrapper para renderizar o conteúdo
 * canônico de um termo com checkboxes de aceite + campo de assinatura.
 *
 * Usado tanto pelo `TermsAcceptanceModal` quanto por páginas
 * standalone (ex.: ShelterTerms.jsx para um abrigo clicar "Aceitar"
 * sem precisar do modal). A renderização do conteúdo é via children
 * — o wrapper cuida de scroll, botões de link "Ver termo completo",
 * checkboxes e assinatura.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, ScrollText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';
import {
  TERMS_TYPE,
  TERMS_TYPE_META,
  computeDocumentHash,
  getCurrentTermsVersion,
} from '@/modules/shelter/domain/legal/terms';

/**
 * @param {object} props
 * @param {string} props.termsType - TERMS_TYPE.*
 * @param {string} [props.title] - título custom (default: meta.label)
 * @param {string} [props.version] - default: getCurrentTermsVersion
 * @param {string} [props.documentContent] - conteúdo canônico para hash;
 *   se ausente, computa hash do meta resumido.
 * @param {boolean} [props.requireCheckboxes=true] - mostra os checkboxes
 * @param {boolean} [props.requireSignature=true] - exige "digite seu nome"
 * @param {string} [props.prefilledName] - nome pré-preenchido (perfil)
 * @param {string} [props.ctaLabel="Aceitar e assinar"] - label do botão
 * @param {boolean} [props.disabled] - estado desabilitado
 * @param {string} [props.busyLabel] - label durante submit
 * @param {Function} [props.onAccept] - ({hash, signature, checkboxes}) => void
 * @param {React.ReactNode} [props.children] - conteúdo do documento
 */
export default function TermsDocument({
  termsType,
  title,
  version,
  documentContent,
  requireCheckboxes = true,
  requireSignature = true,
  prefilledName = '',
  ctaLabel = 'Aceitar e assinar',
  disabled = false,
  busyLabel = 'Registrando…',
  onAccept,
  children,
}) {
  const meta = TERMS_TYPE_META[termsType] || {};
  const v = version || getCurrentTermsVersion(termsType);
  const [checks, setChecks] = useState({
    read: false,
    understood: false,
    agree: false,
  });
  const [signature, setSignature] = useState(prefilledName);
  const [hash, setHash] = useState(null);
  const [busy, setBusy] = useState(false);

  const allChecked = !requireCheckboxes
    || (checks.read && checks.understood && checks.agree);
  const signatureOk = !requireSignature || (signature.trim().length >= 3);
  const canAccept = allChecked && signatureOk && !busy && !disabled;

  // Calcula o hash do documento no client (Lei 14.063/2020)
  const contentForHash = documentContent
    || `${meta.label}\n${v}\n${meta.short}\n${meta.section_path}`;

  const computedHash = useMemo(() => {
    let cancelled = false;
    computeDocumentHash(contentForHash).then((h) => {
      if (!cancelled) setHash(h);
    });
    return () => { cancelled = true; };
  }, [contentForHash]);

  async function handleAccept() {
    if (!canAccept || typeof onAccept !== 'function') return;
    setBusy(true);
    try {
      const finalHash = hash || await computeDocumentHash(contentForHash);
      await onAccept({
        hash: finalHash,
        signature: signature.trim(),
        checkboxes: { ...checks },
        version: v,
        termsType,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {title || meta.label}
          </h3>
          <p className="text-xs text-muted-foreground">
            Versão {v} · {meta.short}
          </p>
        </div>
        {meta.section_path && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="text-primary"
          >
            <Link to={meta.section_path} target="_blank" rel="noopener noreferrer">
              <ScrollText className="h-4 w-4" />
              Ver termo completo
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </header>

      <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-sm leading-6 text-foreground/80">
        {children}
      </div>

      {requireCheckboxes && (
        <div className="space-y-2">
          <CheckboxRow
            id="check-read"
            checked={checks.read}
            onChange={(v) => setChecks((s) => ({ ...s, read: v }))}
            label="Li integralmente o documento acima."
          />
          <CheckboxRow
            id="check-understood"
            checked={checks.understood}
            onChange={(v) => setChecks((s) => ({ ...s, understood: v }))}
            label="Compreendo as condições, riscos e responsabilidades."
          />
          <CheckboxRow
            id="check-agree"
            checked={checks.agree}
            onChange={(v) => setChecks((s) => ({ ...s, agree: v }))}
            label="Aceito de forma livre e espontânea, sem vícios de consentimento."
          />
        </div>
      )}

      {requireSignature && (
        <div className="space-y-2">
          <label
            htmlFor="signature-text"
            className="block text-xs font-medium text-foreground/80"
          >
            Digite seu nome completo como assinatura eletrônica
            (Lei 14.063/2020):
          </label>
          <Input
            id="signature-text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Ex.: Maria Silva da Silva"
            disabled={disabled || busy}
            className="font-serif italic"
          />
          {hash && (
            <p className="break-all text-[10px] text-muted-foreground">
              Hash SHA-256 do documento: <code>{hash}</code>
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        onClick={handleAccept}
        disabled={!canAccept}
        className={cn('w-full sm:w-auto')}
      >
        <Check className="h-4 w-4" />
        {busy ? busyLabel : ctaLabel}
      </Button>
    </div>
  );
}

function CheckboxRow({ id, checked, onChange, label }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-white/65 p-3 text-sm leading-5 hover:border-primary/30"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <span className="flex-1 text-foreground/80">{label}</span>
    </label>
  );
}
