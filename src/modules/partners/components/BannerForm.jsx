/**
 * @fileoverview BannerForm — modal for create/edit banner.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §8.2
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Image as ImageIcon, AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/core/lib/utils';
import {
  BANNER_STATUS, BANNER_POSITIONS, BANNER_STATUS_LABELS,
  BANNER_LIMITS,
} from '../domain/constants';
import { validateBannerFile } from '../services/bannerStorageService';

const ANIM = 'animate-in fade-in slide-in-from-bottom-4 duration-200';

const EMPTY_DATA = {
  alt: '',
  linkUrl: '',
  position: 'feed_top',
  weight: BANNER_LIMITS.DEFAULT_WEIGHT,
  startDate: null,
  endDate: null,
  maxImpressions: 0, // 0 = ilimitado
  maxClicks: 0,
  status: BANNER_STATUS.DRAFT,
  imageUrl: '',
  imageUrlMobile: '',
};

function buildDataFrom(banner) {
  if (!banner) return EMPTY_DATA;
  return {
    alt: banner.alt || '',
    linkUrl: banner.linkUrl || '',
    position: banner.position || 'feed_top',
    weight: banner.weight ?? BANNER_LIMITS.DEFAULT_WEIGHT,
    startDate: banner.startDate
      ? new Date(banner.startDate.seconds ? banner.startDate.seconds * 1000 : banner.startDate).toISOString().slice(0, 10)
      : null,
    endDate: banner.endDate
      ? new Date(banner.endDate.seconds ? banner.endDate.seconds * 1000 : banner.endDate).toISOString().slice(0, 10)
      : null,
    maxImpressions: banner.maxImpressions || 0,
    maxClicks: banner.maxClicks || 0,
    status: banner.status || BANNER_STATUS.DRAFT,
    imageUrl: banner.imageUrl || '',
    imageUrlMobile: banner.imageUrlMobile || '',
  };
}

export function BannerForm({ open, onOpenChange, partnerId, banner = null, onSubmit }) {
  const [data, setData] = useState(buildDataFrom(banner));
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const desktopRef = useRef(null);
  const mobileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setData(buildDataFrom(banner));
      setDesktopFile(null);
      setMobileFile(null);
      setErrors({});
    }
  }, [open, banner]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setData((d) => ({ ...d, [field]: v }));
  };

  const handleFileChange = (slot) => (e) => {
    const f = e.target.files?.[0];
    if (f) {
      const v = validateBannerFile(f);
      if (!v.ok) {
        setErrors((e) => ({ ...e, [slot]: v.error }));
        return;
      }
      setErrors((e) => ({ ...e, [slot]: null }));
      if (slot === 'desktop') setDesktopFile(f);
      else setMobileFile(f);
    }
  };

  const validate = () => {
    const errs = {};
    if (!data.alt?.trim()) errs.alt = 'Texto alternativo é obrigatório';
    if (!data.linkUrl?.trim()) errs.linkUrl = 'Link é obrigatório';
    else if (!/^https?:\/\//i.test(data.linkUrl)) errs.linkUrl = 'URL deve começar com http:// ou https://';
    if (!banner && !desktopFile && !data.imageUrl) {
      errs.desktop = 'Banner desktop é obrigatório';
    }
    if (data.weight < BANNER_LIMITS.MIN_WEIGHT || data.weight > BANNER_LIMITS.MAX_WEIGHT) {
      errs.weight = `Peso deve estar entre ${BANNER_LIMITS.MIN_WEIGHT} e ${BANNER_LIMITS.MAX_WEIGHT}`;
    }
    if (data.maxImpressions < 0) errs.maxImpressions = 'Não pode ser negativo';
    if (data.maxClicks < 0) errs.maxClicks = 'Não pode ser negativo';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const files = {};
      if (desktopFile) files.desktop = desktopFile;
      if (mobileFile) files.mobile = mobileFile;
      const payload = { ...data };
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      else delete payload.startDate;
      if (payload.endDate) payload.endDate = new Date(payload.endDate);
      else delete payload.endDate;
      if (!payload.maxImpressions) delete payload.maxImpressions;
      if (!payload.maxClicks) delete payload.maxClicks;
      await onSubmit(payload, files);
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
      data-testid="banner-form-modal"
    >
      <div
        className={cn('w-full max-w-lg rounded-t-3xl bg-background border border-border shadow-2xl sm:rounded-3xl', ANIM)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-bold text-foreground">
            {banner ? 'Editar banner' : 'Novo banner'}
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

          <Field label="Texto alternativo (alt)" required error={errors.alt} hint="Para acessibilidade">
            <Input value={data.alt} onChange={handleChange('alt')} placeholder="Ex: Promoção Banho e Tosa 30% off" data-testid="banner-alt-input" />
          </Field>

          <Field label="Link de destino" required error={errors.linkUrl}>
            <Input value={data.linkUrl} onChange={handleChange('linkUrl')} placeholder="https://exemplo.com.br/promo" data-testid="banner-link-input" />
          </Field>

          <Field label="Posição" required>
            <select
              value={data.position}
              onChange={handleChange('position')}
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
              data-testid="banner-position-input"
            >
              {BANNER_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (0-100)" required error={errors.weight}>
              <Input
                type="number"
                min={0}
                max={100}
                value={data.weight}
                onChange={handleChange('weight')}
              />
            </Field>
            <Field label="Status">
              <select
                value={data.status}
                onChange={handleChange('status')}
                className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
              >
                {Object.values(BANNER_STATUS).map((s) => (
                  <option key={s} value={s}>{BANNER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Início (opcional)">
              <Input type="date" value={data.startDate || ''} onChange={handleChange('startDate')} />
            </Field>
            <Field label="Fim (opcional)">
              <Input type="date" value={data.endDate || ''} onChange={handleChange('endDate')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Máx views (0=∞)" error={errors.maxImpressions}>
              <Input
                type="number"
                min={0}
                value={data.maxImpressions}
                onChange={handleChange('maxImpressions')}
              />
            </Field>
            <Field label="Máx clicks (0=∞)" error={errors.maxClicks}>
              <Input
                type="number"
                min={0}
                value={data.maxClicks}
                onChange={handleChange('maxClicks')}
              />
            </Field>
          </div>

          {/* Desktop upload */}
          <Field label="Banner desktop" required={!banner} error={errors.desktop} hint={`${BANNER_LIMITS.DESKTOP_WIDTH}x${BANNER_LIMITS.DESKTOP_HEIGHT}px · máx ${Math.round(BANNER_LIMITS.MAX_SIZE_BYTES / 1024)}KB`}>
            <input
              ref={desktopRef}
              type="file"
              accept={BANNER_LIMITS.ALLOWED_TYPES.join(',')}
              onChange={handleFileChange('desktop')}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => desktopRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Monitor className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="flex-1 text-left">
                {desktopFile ? (
                  <span className="text-foreground">{desktopFile.name}</span>
                ) : data.imageUrl ? (
                  <span className="text-foreground">Substituir imagem atual</span>
                ) : (
                  <span>Selecionar imagem desktop</span>
                )}
                <p className="text-[10px] text-muted-foreground">JPG, PNG ou WEBP</p>
              </div>
              {data.imageUrl && !desktopFile && (
                <img src={data.imageUrl} alt="Atual" className="h-8 w-16 rounded object-cover" />
              )}
            </button>
          </Field>

          {/* Mobile upload (optional) */}
          <Field label="Banner mobile (opcional)" error={errors.mobile} hint={`${BANNER_LIMITS.MOBILE_WIDTH}x${BANNER_LIMITS.MOBILE_HEIGHT}px`}>
            <input
              ref={mobileRef}
              type="file"
              accept={BANNER_LIMITS.ALLOWED_TYPES.join(',')}
              onChange={handleFileChange('mobile')}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => mobileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="flex-1 text-left">
                {mobileFile ? (
                  <span className="text-foreground">{mobileFile.name}</span>
                ) : data.imageUrlMobile ? (
                  <span className="text-foreground">Substituir imagem atual</span>
                ) : (
                  <span>Selecionar imagem mobile</span>
                )}
                <p className="text-[10px] text-muted-foreground">Recomendado para mobile</p>
              </div>
              {data.imageUrlMobile && !mobileFile && (
                <img src={data.imageUrlMobile} alt="Atual" className="h-8 w-10 rounded object-cover" />
              )}
            </button>
          </Field>

          <p className="text-[10px] text-muted-foreground">
            💡 Se não enviar banner mobile, o desktop será usado em todas as telas (com object-cover).
          </p>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting} data-testid="banner-submit-button">
            <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {submitting ? 'Salvando...' : 'Salvar'}
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
