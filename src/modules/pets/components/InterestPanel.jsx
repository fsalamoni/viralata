import React from 'react';
import { useInterestsByPet, useUpdateInterestStatus, useCompleteAdoption } from '../hooks/usePets';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getOrCreateDirectConversation } from '@/modules/chat/services/chatService';
import { useNavigate } from 'react-router-dom';

const STATUS_BADGE = {
  pending: <Badge variant="secondary">Aguardando</Badge>,
  chat_opened: <Badge className="bg-blue-100 text-blue-800">Em conversa</Badge>,
  rejected: <Badge variant="destructive">Rejeitado</Badge>,
  adopted: <Badge className="bg-green-100 text-green-800">Adotado</Badge>,
};

export default function InterestPanel({ petId, pet }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: interests = [], isLoading } = useInterestsByPet(petId);
  const updateStatus = useUpdateInterestStatus();
  const completeAdoption = useCompleteAdoption();

  async function handleOpenChat(interest) {
    try {
      const conversationId = await getOrCreateDirectConversation(
        user.uid, interest.user_id, { pet_id: petId, pet_title: pet?.title || pet?.name }
      );
      await updateStatus.mutateAsync({ petId, userId: interest.user_id, status: 'chat_opened' });
      navigate(`/chat/${conversationId}`);
    } catch (e) {
      toast.error('Erro ao abrir conversa.');
    }
  }

  async function handleReject(interest) {
    try {
      await updateStatus.mutateAsync({ petId, userId: interest.user_id, status: 'rejected' });
      toast.success('Interesse rejeitado.');
    } catch (e) {
      toast.error('Erro ao rejeitar interesse.');
    }
  }

  async function handleComplete(interest) {
    if (!confirm(`Confirmar adoção para ${interest.user_name}?`)) return;
    try {
      await completeAdoption.mutateAsync({ petId, adoptedByUid: interest.user_id });
      toast.success('Adoção concluída! 🎉');
    } catch (e) {
      toast.error('Erro ao concluir adoção.');
    }
  }

  if (isLoading) return <div className="py-8 text-center text-gray-400">Carregando...</div>;
  if (interests.length === 0) return (
    <div className="py-8 text-center text-gray-400">
      Nenhum interessado ainda. Compartilhe o link do pet!
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      {interests.map((interest) => (
        <div key={interest.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={interest.user_photo} />
            <AvatarFallback>{interest.user_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{interest.user_name || 'Usuário'}</p>
            <div className="mt-0.5">{STATUS_BADGE[interest.status]}</div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {interest.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleOpenChat(interest)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Conversar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleReject(interest)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {interest.status === 'chat_opened' && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleOpenChat(interest)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
                </Button>
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleComplete(interest)}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Adotado!
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
