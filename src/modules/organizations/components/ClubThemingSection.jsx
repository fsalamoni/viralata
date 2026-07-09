import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Palette, RotateCcw, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUpdateClub } from '@/modules/organizations/hooks/useClubs';
import {
  CLUB_THEME_FIELDS,
  DEFAULT_CLUB_THEME,
  effectiveClubTheme,
  normalizeClubThemeInput,
  buildClubThemeStyle,
} from '@/modules/organizations/domain/clubTheme';

/**
 * Converte um valor HSL em string (`"H S% L%"`) para um hex `#RRGGBB`
 * aceitável pelo `<input type="color">`. Aceitamos pequenas variações
 * (falta de `%`, espaços extras) e tratamos transparências como base
 * branca para o preview.
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
 * para cada campo configurável do tema, com um preview ao vivo e botões de
 * "Restaurar padrão" e "Salvar alterações". As mudanças só persistem após
 * clicar em "Salvar" — até lá o preview é local.
 *
 * O tema é salvo como objeto `theme` no doc do clube via `useUpdateClub`.
 * Aplicação visual: `ClubThemedScope` consome esse objeto e injeta CSS
 * variables no escopo da página.
 */
export default function ClubThemingSection({ club }) {
  const updateClub = useUpdateClub(club.id);
  const initial = effectiveClubTheme(club);
  const [theme, setTheme] = useState(initial);
  const [draft, setDraft] = useState(initial); // versão editável, ainda não persistida

  // Mantém o `theme` (estado persistido) sincronizado quando o Firestore
  // atualiza — por ex., após salvar.
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

  return (
    <Card className="rounded-xl overflow-hidden">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" /> Personalização visual
        </CardTitle>
        <CardDescription>
          Escolha as cores dos cards, botões e textos da sua ONG. As mudanças entram em
          vigor quando você salvar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <div
          className="rounded-xl border border-border p-4 transition-colors"
          style={{
            background: `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%), hsl(${draft.primary} / 0.06)`,
            ...liveStyle,
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização</p>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CLUB_THEME_FIELDS.map((field) => (
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
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor={`theme_${field.key}`} className="text-sm font-semibold">
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
