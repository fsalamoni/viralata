import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateCommunity } from '../services/communityService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Edit2, Save, X } from 'lucide-react';

export default function AboutTab({ community, isAdmin, onUpdate }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(community.description || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCommunity(community.id, { ...community, description }, user);
      onUpdate({ description });
      setIsEditing(false);
      toast.success('Descrição atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar descrição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card border border-border rounded-3xl relative group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-lg">Sobre a Comunidade</h3>
        {isAdmin && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Editar
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[150px] resize-y"
            placeholder="Descreva o propósito da comunidade..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              setDescription(community.description || '');
              setIsEditing(false);
            }} disabled={loading}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
          {community.description || 'Nenhuma descrição fornecida.'}
        </p>
      )}
    </div>
  );
}
