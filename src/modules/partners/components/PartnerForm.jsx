/**
 * @fileoverview PartnerForm — modal for create/edit partner.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.2
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/core/lib/utils';
import {
  PARTNER_STATUS, PARTNER_CATEGORIES, PARTNER_STATUS_LABELS,
} from '../domain/constants';
import { uploadBannerImage, validateBannerFile } from '../services/bannerStorageService';

const ANIM = 'animate-in fade-in slide-in-from-bottom-4 duration-200';

const EMPTY_DATA = {
  name: '',
  logoUrl: '',
  siteUrl: '',
  contactEmail: '',
  contactPhone: '',
  description: '',
  category: 'pet_shop',
  status: PARTNER_STATUS.PENDING_REVIEW,
  expiresAt: null,
};

function buildDataFrom(partner) {
  if (!partner) return EMPTY_DATA;
  return {
    name: partner.name || '',
    logoUrl: partner.logoUrl || '',
    siteUrl: partner.siteUrl || '',
    contactEmail: partner.contactEmail || '',
    contactPhone: partner.contactPhone || '',
    description: partner.description || '',
    category: partner.category || 'pet_shop',
    status: partner.status || PARTNER_STATUS.PENDING_REVIEW,
    expiresAt: partner.expiresAt
      ? new Date(partner.expiresAt.seconds ? partner.expiresAt.seconds * 1000 : partner.expiresAt).toISOString().slice(0, 10)
      : null,
  };
}

export function PartnerForm({ open, onOpenChange, partner = null, onSubmit }) {
  const [data, setData] = useState(buildDataFrom(partner));
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setData(buildDataFrom(partner));
      setLogoFile(null);
      setErrors({});
    }
  }, [open, partner]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    const v = e?.target ? e.target.value : e;
    setData((d) => ({ ...d, [field]: v }));
  };

  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      const v = validateBannerFile(f, 2 * 1024 * 1024); // 2MB max para logo
      if (!v.ok) {
        setErrors((e) => ({ ...e, logo: v.error }));
        return;
      }
      setErrors((e) => ({ ...e, logo: null }));
      setLogoFile(f);
    }
  };

  const validate = () => {
    const errs = {};
    if (!data.name?.trim()) errs.name = 'Nome é obrigatório';
    if (!data.siteUrl?.trim()) errs.siteUrl = 'Site é obrigatório';
    else if (!/^https?:\/\//i.test(data.siteUrl)) errs.siteUrl = 'URL deve começar com http:// ou https://';
    if (data.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.contactEmail)) {
      errs.contactEmail = 'Email inválido';
    }
    if (data.description && data.description.length > 500) {
      errs.description = 'Descrição deve ter no máximo 500 caracteres';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let payload = { ...data };
      if (logoFile) {
        setUploading(true);
        const logoId = `logo-${Date.now()}`;
        const url = await uploadBannerImage({
          file: logoFile, partnerId: partner?.id || 'new', bannerId: logoId, slot: 'logo', filename: logoFile.name,
        });
        setUploading(false);
        payload.logoUrl = url;
      }
      if (payload.expiresAt) {
        payload.expiresAt = new Date(payload.expiresAt);
      } else {
        delete payload.expiresAt;
      }
      await onSubmit(payload);
    } catch (err) {
      setErrors((e) => ({ ...e, form: err.message || 'Erro ao salvar' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={() => onOpenChange(false)}
      data-testid="partner-form-modal"
    >
      <div
        className={cn('w-full max-w-lg rounded-t-3xl bg-background border border-border shadow-2xl sm:rounded-3xl', ANIM)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-bold text-foreground">
            {partner ? 'Editar parceiro' : 'Novo parceiro'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
          {errors.form && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <AlertCircle className="inline h-3 w-3 mr-1" aria-hidden="true" />
              {errors.form}
            </div>
          )}

          <Field label="Nome" required error={errors.name}>
            <Input value={data.name} onChange={handleChange('name')} placeholder="Ex: Pet Shop Amigo" data-testid="partner-name-input" />
          </Field>

          <Field label="Site" required error={errors.siteUrl}>
            <Input value={data.siteUrl} onChange={handleChange('siteUrl')} placeholder="https://exemplo.com.br" data-testid="partner-site-input" />
          </Field>

          <Field label="Categoria" required>
            <select
              value={data.category}
              onChange={handleChange('category')}
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
              data-testid="partner-category-input"
            >
              {PARTNER_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="E-mail de contato" error={errors.contactEmail}>
            <Input
              type="email"
              value={data.contactEmail}
              onChange={handleChange('contactEmail')}
              placeholder="contato@exemplo.com.br"
            />
          </Field>

          <Field label="Telefone de contato">
            <Input
              value={data.contactPhone}
              onChange={handleChange('contactPhone')}
              placeholder="(11) 99999-9999"
            />
          </Field>

          <Field label="Status">
            <select
              value={data.status}
              onChange={handleChange('status')}
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              {Object.values(PARTNER_STATUS).map((s) => (
                <option key={s} value={s}>{PARTNER_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>

          <Field label="Expira em (opcional)">
            <Input
              type="date"
              value={data.expiresAt || ''}
              onChange={handleChange('expiresAt')}
            />
          </Field>

          <Field label="Logo" error={errors.logo} hint="JPG/PNG/WEBP. Máx 2MB.">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              {data.logoUrl || logoFile ? (
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : data.logoUrl}
                  alt="Logo"
                  className="h-10 w-10 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
              <span className="text-left">
                {logoFile ? logoFile.name : data.logoUrl ? 'Logo atual' : 'Selecionar imagem'}
              </span>
            </button>
          </Field>

          <Field label="Descrição" hint={`${data.description?.length || 0}/500`} error={errors.description}>
            <textarea
              value={data.description}
              onChange={handleChange('description')}
              maxLength={500}
              rows={3}
              placeholder="Descreva brevemente o parceiro..."
              className="w-full rounded-md border border-border bg-card p-2 text-sm"
            />
          </Field>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || uploading} data-testid="partner-submit-button">
            <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {uploading ? 'Enviando logo...' : submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required, error, hint }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
        {hint && !required && <span className="ml-1 text-[10px] font-normal text-muted-foreground">({hint})</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
