import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { FEATURE_FLAG_META } from '@/core/featureFlags';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/core/platformSettings';
import {
  setFeatureFlag,
  updatePlatformSettingsSection,
} from '@/core/services/platformSettingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PageHero from '@/components/PageHero';
import PageContainer from '@/components/PageContainer';

export default function AdminPlatformSettings() {
  const { isPlatformAdmin, user } = useAuth();
  const { settings, isLoading } = usePlatformSettings();
  const [labelsForm, setLabelsForm] = useState(settings.ui_labels);
  const [textsForm, setTextsForm] = useState(settings.ui_text);
  const [limitsForm, setLimitsForm] = useState(settings.operational_limits);
  const [saving, setSaving] = useState({
    labels: false,
    texts: false,
    limits: false,
    flags: '',
  });

  useEffect(() => {
    setLabelsForm(settings.ui_labels);
    setTextsForm(settings.ui_text);
    setLimitsForm(settings.operational_limits);
  }, [settings]);

  if (!isPlatformAdmin) return <div className="py-16 text-center text-muted-foreground">Acesso restrito.</div>;
  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando configurações...</div>;

  async function saveSection(section, payload, successMessage) {
    const key = section === 'ui_labels' ? 'labels' : section === 'ui_text' ? 'texts' : 'limits';
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const saved = await updatePlatformSettingsSection(section, payload, user);
      if (section === 'ui_labels') setLabelsForm(saved);
      if (section === 'ui_text') setTextsForm(saved);
      if (section === 'operational_limits') setLimitsForm(saved);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar as configurações.');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleFlagToggle(flagKey, enabled) {
    setSaving((prev) => ({ ...prev, flags: flagKey }));
    try {
      await setFeatureFlag(flagKey, enabled, user);
      toast.success('Feature flag atualizada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar a flag.');
    } finally {
      setSaving((prev) => ({ ...prev, flags: '' }));
    }
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHero
        eyebrow="Admin"
        title="Configurações globais"
        description="Centralize textos, rótulos, feature flags e parâmetros operacionais versionáveis da plataforma."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Auditável
          </span>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rótulos configuráveis</CardTitle>
              <CardDescription>CTA do cabeçalho, atalhos mobile e chamadas da home.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TextField label="Botão do cabeçalho" value={labelsForm.header_create_pet_cta} onChange={(value) => setLabelsForm((prev) => ({ ...prev, header_create_pet_cta: value }))} />
              <TextField label="Atalho mobile central" value={labelsForm.mobile_create_pet_cta} onChange={(value) => setLabelsForm((prev) => ({ ...prev, mobile_create_pet_cta: value }))} />
              <TextField label="CTA principal da home" value={labelsForm.home_primary_cta} onChange={(value) => setLabelsForm((prev) => ({ ...prev, home_primary_cta: value }))} />
              <TextField label="CTA secundário da home" value={labelsForm.home_secondary_cta} onChange={(value) => setLabelsForm((prev) => ({ ...prev, home_secondary_cta: value }))} />
              <TextField label="CTA final da home" value={labelsForm.home_final_cta} onChange={(value) => setLabelsForm((prev) => ({ ...prev, home_final_cta: value }))} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => saveSection('ui_labels', labelsForm, 'Rótulos globais salvos.')} disabled={saving.labels}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving.labels ? 'Salvando...' : 'Salvar rótulos'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLabelsForm(PLATFORM_SETTINGS_DEFAULTS.ui_labels)} disabled={saving.labels}>
                  Restaurar padrões
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Textos institucionais</CardTitle>
              <CardDescription>Mensagens de entrada e descrição do feed visíveis para todos os usuários.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TextField label="Badge da home" value={textsForm.home_hero_badge} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_hero_badge: value }))} />
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Título da home · início" value={textsForm.home_hero_title_prefix} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_hero_title_prefix: value }))} />
                <TextField label="Título da home · destaque" value={textsForm.home_hero_title_highlight} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_hero_title_highlight: value }))} />
                <TextField label="Título da home · fim" value={textsForm.home_hero_title_suffix} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_hero_title_suffix: value }))} />
              </div>
              <TextareaField label="Descrição principal da home" value={textsForm.home_hero_description} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_hero_description: value }))} />
              <TextField label="Título da CTA final" value={textsForm.home_final_cta_title} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_final_cta_title: value }))} />
              <TextareaField label="Descrição da CTA final" value={textsForm.home_final_cta_description} onChange={(value) => setTextsForm((prev) => ({ ...prev, home_final_cta_description: value }))} />
              <TextareaField label="Descrição do hero do feed" value={textsForm.feed_hero_description} onChange={(value) => setTextsForm((prev) => ({ ...prev, feed_hero_description: value }))} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => saveSection('ui_text', textsForm, 'Textos globais salvos.')} disabled={saving.texts}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving.texts ? 'Salvando...' : 'Salvar textos'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setTextsForm(PLATFORM_SETTINGS_DEFAULTS.ui_text)} disabled={saving.texts}>
                  Restaurar padrões
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parâmetros operacionais</CardTitle>
              <CardDescription>Limites de carregamento para os fluxos atuais de notificações.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <NumberField label="Itens no dropdown de notificações" value={limitsForm.notifications_dropdown_limit} onChange={(value) => setLimitsForm((prev) => ({ ...prev, notifications_dropdown_limit: value }))} min={5} max={50} />
              <NumberField label="Itens no painel admin de notificações" value={limitsForm.admin_notifications_limit} onChange={(value) => setLimitsForm((prev) => ({ ...prev, admin_notifications_limit: value }))} min={50} max={500} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => saveSection('operational_limits', limitsForm, 'Parâmetros operacionais salvos.')} disabled={saving.limits}>
                  <Save className="mr-1.5 h-4 w-4" /> {saving.limits ? 'Salvando...' : 'Salvar parâmetros'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLimitsForm(PLATFORM_SETTINGS_DEFAULTS.operational_limits)} disabled={saving.limits}>
                  Restaurar padrões
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature flags</CardTitle>
              <CardDescription>Recursos aditivos que podem ser ativados sem alterar os fluxos principais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(FEATURE_FLAG_META).map(([flagKey, meta]) => (
                <div key={flagKey} className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" /> {meta.label}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{meta.description}</p>
                  </div>
                  <Switch
                    checked={Boolean(settings.feature_flags[flagKey])}
                    disabled={saving.flags === flagKey}
                    onCheckedChange={(checked) => handleFlagToggle(flagKey, checked === true)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextareaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          onChange(Number.isNaN(parsed) ? '' : parsed);
        }}
      />
    </div>
  );
}
