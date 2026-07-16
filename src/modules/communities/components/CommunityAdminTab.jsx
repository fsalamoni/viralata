import React, { useState } from 'react';
import { toast } from 'sonner';
import { Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { useUpdateCommunity } from '@/modules/communities/hooks/useCommunities';

export default function CommunityAdminTab({ community }) {
  const navigate = useNavigate();
  const updateCommunity = useUpdateCommunity(community.id);

  const [form, setForm] = useState({
    name: community.name || '',
    description: community.description || '',
    cover_url: community.cover_url || '',
    privacy: community.privacy || 'public',
  });

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('O nome da comunidade é obrigatório.');
      return;
    }
    try {
      await updateCommunity.mutateAsync(form);
      toast.success('Comunidade atualizada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar.');
    }
  };

  return (
    <div className="space-y-4">
      <section className="arena-section-card rounded-xl">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Editar comunidade</h3>
          <p className="arena-section-card-description">Atualize as informações exibidas para os membros.</p>
        </div>
        <div className="arena-section-card-body p-4 pt-0 sm:p-5 sm:pt-0">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Capa da Comunidade</Label>
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm((prev) => ({ ...prev, cover_url: url }))}
                folder="communities"
                shape="square"
                label="Enviar capa"
                hint="Imagem exibida no cabeçalho da comunidade."
                className="w-full h-40 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_name">Nome *</Label>
              <Input id="admin_name" value={form.name} onChange={setField('name')} maxLength={80} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_description">Descrição</Label>
              <textarea
                id="admin_description"
                value={form.description}
                onChange={setField('description')}
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Privacidade</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.privacy}
                onChange={setField('privacy')}
              >
                <option value="public">Pública (Qualquer um pode ver e entrar)</option>
                <option value="private">Privada (Apenas com convite)</option>
              </select>
            </div>
            <Button type="submit" disabled={updateCommunity.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> {updateCommunity.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
