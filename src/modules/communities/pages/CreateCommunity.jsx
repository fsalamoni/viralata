import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { createCommunity } from '../services/communityService';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { toast } from 'sonner';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', description: '', cover_url: '', privacy: 'public' });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Nome é obrigatório');
    
    setLoading(true);
    try {
      const id = await createCommunity(form, user.uid);
      toast.success('Comunidade criada!');
      navigate(`/comunidade/${id}`);
    } catch (err) {
      toast.error('Erro ao criar comunidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={useArenaPageClasses('arena-page mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8')}>
      <PageHero
        eyebrow="Comunidade"
        title="Criar Nova Comunidade"
        description="Crie um espaço para conectar pessoas em torno de uma causa, cidade ou tipo de pet. Você poderá editar as informações depois."
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/comunidade')}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
          </Button>
        }
      />

      <section className="arena-section-card">
        <div className="arena-section-card-body">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Capa da Comunidade</Label>
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm(f => ({ ...f, cover_url: url }))}
                folder="communities"
                shape="square"
                className="w-full h-40 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Comunidade</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Amantes de Gatos SP"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Sobre o que é esta comunidade?"
              />
            </div>
            <div className="space-y-2">
              <Label>Privacidade</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.privacy}
                onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}
              >
                <option value="public">Pública (Qualquer um pode ver e entrar)</option>
                <option value="private">Privada (Apenas com convite)</option>
              </select>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Criando...' : 'Criar Comunidade'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
