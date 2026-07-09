import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Palette, RotateCcw, Save, Type } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUpdateClub } from '@/modules/organizations/hooks/useClubs';
import {
  CLUB_THEME_FIELDS,
  CLUB_THEME_SECTIONS,
  DEFAULT_CLUB_THEME,
  effectiveClubTheme,
  normalizeClubThemeInput,
  buildClubThemeStyle,
} from '@/modules/organizations/domain/clubTheme';

/**
 * Converte um valor HSL em string (`"H S% L%"`) para um hex `#RRGGBB`
 * aceitável pelo `<input type="color">`.
 */
function hslStringToHex(hsl) {
  if (typeof hsl !== 'string') return '#cccccc';
  const parts = hsl.trim().split(/\s+/).slice(0, 3);
  if (parts.length < 3) return '#cccccc';
  const h = parseFloat(parts[0]);
  let s = parseFloat(parts[1].replace('%', ''));
  let l = parseFloat(parts[2].replace('%', ''));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return '#cccccc';
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => {
    const i = Math.round((v + m) * 255);
    return Math.max(0, Math.min(255, i)).toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Inverso: hex `#RRGGBB` → string HSL `"H S% L%"` (formato aceito pelos vars CSS). */
function hexToHslString(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
      default: break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Seção de personalização visual do clube. Renderiza um `<input type="color">`
 * para cada campo configurável do tema (8 no total: 5 da UI geral + 3 do
 * card da ONG), agrupados por seção. Preview ao vivo em duas áreas:
 *  - "Cores da UI": chips simulando botões/cards de fundo
 *  - "Card da ONG": preview real do banner com nome, mesmo markup
 *    usado em `ClubCover.jsx`, para o admin ver exatamente como vai
 *    aparecer na home pública antes de salvar.
 */
export default function ClubThemingSection({ club }) {
  const updateClub = useUpdateClub(club.id);
  const initial = effectiveClubTheme(club);
  const [theme, setTheme] = useState(initial);
  const [draft, setDraft] = useState(initial);

  useEffect(() => { setTheme(initial); }, [club.id, club?.updated_at]);

  const liveStyle = buildClubThemeStyle(draft);

  const setColor = (key, hex) => {
    const hsl = hexToHslString(hex);
    if (!hsl) return;
    setDraft((prev) => ({ ...prev, [key]: hsl }));
  };

  const handleReset = () => setDraft({ ...DEFAULT_CLUB_THEME });

  const handleSave = async () => {
    const sanitized = normalizeClubThemeInput(draft);
    try {
      await updateClub.mutateAsync({ theme: sanitized });
      setTheme(sanitized);
      toast.success('Personalização visual salva.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar a personalização.');
    }
  };

  const dirty = CLUB_THEME_FIELDS.some((f) => draft[f.key] !== theme[f.key]);

  const grouped = CLUB_THEME_SECTIONS.map((section) => ({
    ...section,
    fields: CLUB_THEME_FIELDS.filter((f) => f.section === section.key),
  }));

  return (
    <Card className="rounded-xl overflow-hidden">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" /> Personalização visual
        </CardTitle>
        <CardDescription>
          Escolha as cores dos botões, fundos, do card principal e do
          nome da sua ONG. As mudanças entram em vigor quando você salvar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pt-0 sm:p-5 sm:pt-0">

        {/* PREVIEW — CARD DA ONG (markup espelha ClubCover.jsx para
            fidelidade total). */}
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={liveStyle}
        >
          <div
            className="relative h-44 max-h-[260px] w-full sm:h-52"
            style={{
              background: `var(--cover-gradient, linear-gradient(135deg, hsl(20 90% 50%) 0%, hsl(350 80% 55%) 100%))`,
            }}
          >
            <span className="absolute bottom-3 right-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 sm:right-6">
              Prévia
            </span>
          </div>
          <div className="relative z-10 -mt-12 bg-background px-4 pb-3 pt-0 sm:-mt-14">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-orange-400 to-rose-500 text-3xl font-extrabold text-white shadow-lg sm:h-28 sm:w-28">
              {(club.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <h3
              className="mt-3 text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'hsl(var(--cover-name, 0 0% 100%))' }}
            >
              {club.name || 'Nome da ONG'}
            </h3>
            <p
              className="mt-1 text-[11px] text-muted-foreground"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              Como o card aparece na home pública.
            </p>
          </div>
        </div>

        {/* PREVIEW — UI (chips simulando botões/cards). */}
        <div
          className="rounded-xl border border-border p-4"
          style={liveStyle}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prévia da UI</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Botão primário</span>
            <span className="rounded-full bg-highlight px-4 py-1.5 text-xs font-semibold text-highlight-foreground">Destaque</span>
            <span className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-card-foreground">Card</span>
            <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">Apoio</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="rounded-full">Badge padrão</Badge>
            <Badge className="rounded-full bg-primary text-primary-foreground">Badge colorido</Badge>
          </div>
        </div>

        {/* GRUPOS DE CAMPOS */}
        {grouped.map((section) => (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <h4 className="text-sm font-semibold">{section.title}</h4>
              <span className="text-[11px] text-muted-foreground">{section.description}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
                >
                  <div className="relative">
                    <input
                      type="color"
                      aria-label={`Cor: ${field.label}`}
                      value={hslStringToHex(draft[field.key])}
                      onChange={(e) => setColor(field.key, e.target.value)}
                      className="h-12 w-12 cursor-pointer appearance-none rounded-lg border border-border bg-background p-0"
                    />
                    {/* Mostrador discreto do hex atual */}
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-background/80 px-1 text-[8px] font-mono uppercase text-muted-foreground">
                      {hslStringToHex(draft[field.key]).replace('#', '')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`theme_${field.key}`} className="flex items-center gap-1.5 text-sm font-semibold">
                      {field.key.startsWith('cover_') && field.key !== 'cover_name' && <Type className="h-3 w-3" />}
                      {field.label}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{field.hint}</p>
                    <Input
                      id={`theme_${field.key}`}
                      readOnly
                      value={draft[field.key]}
                      className="mt-1 h-7 font-mono text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={updateClub.isPending}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateClub.isPending || !dirty}>
            {updateClub.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {updateClub.isPending ? 'Salvando…' : 'Salvar personalização'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
