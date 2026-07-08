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
import { hasQuestions, summarizeAnswers } from '../domain/adoptionForm';

const STATUS_BADGE = {
  pending: <Badge variant="secondary">Aguardando</Badge>,
  chat_opened: <Badge className="bg-highlight/20 text-[hsl(30,60%,30%)]">Em conversa</Badge>,
  rejected: <Badge variant="destructive">Rejeitado</Badge>,
  adopted: <Badge variant="success">Adotado</Badge>,
};

export default function InterestPanel({ petId, pet }) {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { data: allInterests = [], isLoading } = useInterestsByPet(petId);
  // Filtra auto-interesse (não exibimos o dono na própria lista — o createInterest
  // já bloqueia isso, mas mantém o filtro para dados legados). Falhar silencioso:
  // se algum dado inconsistente escapar, ele só não aparece no painel.
  const interests = allInterests.filter((it) => it.user_id !== pet?.owner_id);
  const updateStatus = useUpdateInterestStatus();
  const completeAdoption = useCompleteAdoption();

  async function handleOpenChat(interest) {
    try {
      const conversationId = await getOrCreateDirectConversation(
        user,
        userProfile,
        {
          uid: interest.user_id,
          name: interest.user_name,
          photo_url: interest.user_photo,
        },
        { pet_id: petId, pet_title: pet?.title || pet?.name },
      );
      await updateStatus.mutateAsync({
        petId,
        userId: interest.user_id,
        status: 'chat_opened',
        conversationId,
      });
      navigate(`/chat?c=${conversationId}`);
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

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  if (interests.length === 0) return (
    <div className="py-8 text-center text-muted-foreground">
      Nenhum interessado ainda. Compartilhe o link do pet!
    </div>
  );

  // Esconde o botão 'Conversar' / 'Chat' / 'Adotado!' quando o interessado é
  // o próprio usuário atual. Defesa em profundidade — o createInterest já
  // bloqueia self-interest novo, mas dados legados podem ter passado.
  const isSelfInterest = (interest) => Boolean(user?.uid && interest?.user_id === user.uid);

  const petHasForm = hasQuestions(pet?.adoption_form);

  return (
    <div className="space-y-3 mt-4">
      {interests.map((interest) => (
        <div key={interest.id} className="arena-panel rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={interest.user_photo} />
              <AvatarFallback>{interest.user_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{interest.user_name || 'Usuário'}</p>
              <div className="mt-0.5">{STATUS_BADGE[interest.status]}</div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {interest.status === 'pending' && !isSelfInterest(interest) && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleOpenChat(interest)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Conversar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleReject(interest)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              {interest.status === 'chat_opened' && !isSelfInterest(interest) && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleOpenChat(interest)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
                  </Button>
                  <Button size="sm" onClick={() => handleComplete(interest)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Adotado!
                  </Button>
                </>
              )}
              {isSelfInterest(interest) && (
                <span className="text-xs text-muted-foreground italic">Você mesmo</span>
              )}
            </div>
          </div>

          {petHasForm && interest.form_answers && (
            <dl className="mt-3 space-y-1.5 border-t border-border pt-2.5">
              {summarizeAnswers(pet.adoption_form, interest.form_answers).map((row) => (
                <div key={row.id} className="text-[12.5px] leading-snug">
                  <dt className="font-semibold text-foreground/80">{row.label}</dt>
                  <dd className="text-muted-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}
