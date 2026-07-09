import React, { useState } from 'react';
import { toast } from 'sonner';
import { Save, Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUpdateMemberProfile } from '../hooks/useClubs';
import { normalizeMemberInput } from '../domain/validators';
import {
  PRIVACY_LEVEL, PRIVACY_LEVEL_LABELS,
  MEMBER_FIELD, MEMBER_FIELD_LABELS, MEMBER_FIELD_DEFAULT_PRIVACY,
} from '../domain/constants';
import { normalizePrivacyMap } from '../domain/privacy';

/**
 * Editor de perfil + privacidade de um membro da equipe. Usado em dois
 * contextos:
 *  - Pelo próprio membro: edita apenas seus campos visuais.
 *  - Pelo admin/equipe: edita qualquer membro.
 *
 * Cada campo de informação tem um seletor de privacidade
 * (`public` | `followers` | `members` | `private`). Os campos
 * de privacidade são salvos no `privacy_map` do member.
 */
export default function ClubMemberEditorDialog({ open, onOpenChange, member, canEditProfile = true }) {
  const updateProfile = useUpdateMemberProfile(member?.club_id || '');
  const [form, setForm] = useState(() => buildForm(member));
  const [saving, setSaving] = useState(false);

  // Re-inicializa quando o member muda (ex.: admin abre outro).
  React.useEffect(() => {
    if (open) setForm(buildForm(member));
  }, [open, member]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setPrivacy = (field) => (value) =>
    setForm((p) => ({ ...p, privacy_map: { ...p.privacy_map, [field]: value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const sanitized = normalizeMemberInput(form);
      // Mantém a estrutura de privacy_map mesmo se o caller passou vazio.
      sanitized.privacy_map = normalizePrivacyMap(form.privacy_map);
      await updateProfile.mutateAsync({ member, input: sanitized });
      toast.success('Perfil atualizado.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar perfil — {member.user_name || 'Membro'}</DialogTitle>
          <DialogDescription>
            Atualize as informações visíveis no card público e a privacidade de cada campo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto</Label>
            <ImageUpload
              value={form.photo_url}
              onChange={(url) => setField('photo_url')({ target: { value: url } })}
              folder="members"
              shape="circle"
              label="Enviar foto"
              hint="Foto do membro. Será exibida no card público (conforme privacidade)."
            />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <PrivacyField field={MEMBER_FIELD.FULL_NAME} value={form.privacy_map[MEMBER_FIELD.FULL_NAME]} onChange={setPrivacy(MEMBER_FIELD.FULL_NAME)}>
              <Input value={form.user_name} onChange={setField('user_name')} maxLength={120} />
            </PrivacyField>
          </div>
          <div className="space-y-2">
            <Label>Função / cargo</Label>
            <PrivacyField field={MEMBER_FIELD.TITLE} value={form.privacy_map[MEMBER_FIELD.TITLE]} onChange={setPrivacy(MEMBER_FIELD.TITLE)}>
              <Input value={form.title} onChange={setField('title')} maxLength={120} placeholder="Ex.: Veterinária, Coordenador" />
            </PrivacyField>
          </div>
          <div className="space-y-2">
            <Label>Descrição / bio</Label>
            <PrivacyField field={MEMBER_FIELD.BIO} value={form.privacy_map[MEMBER_FIELD.BIO]} onChange={setPrivacy(MEMBER_FIELD.BIO)}>
              <Textarea value={form.bio} onChange={setField('bio')} rows={3} maxLength={2000} />
            </PrivacyField>
          </div>
          <div className="space-y-2">
            <Label>Histórico na ONG</Label>
            <PrivacyField field={MEMBER_FIELD.HISTORY} value={form.privacy_map[MEMBER_FIELD.HISTORY]} onChange={setPrivacy(MEMBER_FIELD.HISTORY)}>
              <Textarea value={form.history} onChange={setField('history')} rows={3} maxLength={4000} placeholder="Ex.: Cuida dos animais desde 2018" />
            </PrivacyField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <PrivacyField field={MEMBER_FIELD.EMAIL} value={form.privacy_map[MEMBER_FIELD.EMAIL]} onChange={setPrivacy(MEMBER_FIELD.EMAIL)}>
                <Input type="email" value={form.user_email} onChange={setField('user_email')} maxLength={200} />
              </PrivacyField>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <PrivacyField field={MEMBER_FIELD.PHONE} value={form.privacy_map[MEMBER_FIELD.PHONE]} onChange={setPrivacy(MEMBER_FIELD.PHONE)}>
                <Input type="tel" value={form.phone} onChange={setField('phone')} maxLength={30} placeholder="(31) 99999-9999" />
              </PrivacyField>
            </div>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <PrivacyField field={MEMBER_FIELD.WHATSAPP} value={form.privacy_map[MEMBER_FIELD.WHATSAPP]} onChange={setPrivacy(MEMBER_FIELD.WHATSAPP)}>
              <Input type="tel" value={form.whatsapp} onChange={setField('whatsapp')} maxLength={30} placeholder="31999990000" />
            </PrivacyField>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !canEditProfile}>
              <Save className="mr-1.5 h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildForm(member) {
  if (!member) return null;
  return {
    user_name: member.user_name || '',
    user_email: member.user_email || '',
    photo_url: member.photo_url || '',
    title: member.title || '',
    bio: member.bio || '',
    history: member.history || '',
    phone: member.phone || '',
    whatsapp: member.whatsapp || '',
    privacy_map: normalizePrivacyMap(member.privacy_map),
  };
}

/** Input + seletor de privacidade. */
function PrivacyField({ field, value, onChange, children }) {
  return (
    <div className="space-y-1.5">
      {children}
      <div className="flex items-center gap-2">
        {value === PRIVACY_LEVEL.PRIVATE ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
        <Select value={value || MEMBER_FIELD_DEFAULT_PRIVACY[field]} onValueChange={onChange}>
          <SelectTrigger className="h-7 w-[220px] text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.values(PRIVACY_LEVEL).map((p) => (
              <SelectItem key={p} value={p}>{PRIVACY_LEVEL_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">
          {MEMBER_FIELD_LABELS[field]}
        </span>
      </div>
    </div>
  );
}
