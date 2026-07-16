/**
 * @fileoverview ShelterInterviewsList — lista de entrevistas do abrigo (TASK-290).
 * Rota: /abrigos/:shelterId/interviews
 */
import { useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { InterviewCard } from '../components/InterviewCard';
import { listInterviewsByClub, completeInterview, cancelInterview, evaluateInterview } from '../services/interviewService';
import { useQuery } from '@tanstack/react-query';

export function ShelterInterviewsList({ clubId }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data: interviews = [], isLoading, refetch } = useQuery({
    queryKey: ['interviews', 'club', clubId],
    queryFn: () => listInterviewsByClub(clubId),
    enabled: !!clubId && !!user,
  });

  const filtered = filter === 'all'
    ? interviews
    : interviews.filter((i) => i.status === filter);

  const onComplete = async (id) => {
    if (!user) return;
    await completeInterview({ clubId, interviewId: id, checklist: [], notes: '' }, user);
    refetch();
  };
  const onCancel = async (id) => {
    if (!user) return;
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;
    await cancelInterview({ clubId, interviewId: id, reason }, user);
    refetch();
  };
  const onEvaluate = async (id) => {
    if (!user) return;
    const stars = Number(window.prompt('Avaliação (1-5 estrelas):'));
    if (!stars || stars < 1 || stars > 5) return;
    await evaluateInterview({ clubId, interviewId: id, stars, notes: '' }, user);
    refetch();
  };

  if (!user) return <p className="p-4">Faça login para ver entrevistas.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Entrevistas</h1>
        <p className="text-muted-foreground">Gerencie as entrevistas de adoção com os candidatos</p>
      </div>
      <section className="arena-section-card">
        <div className="arena-section-card-body p-4 flex gap-2 flex-wrap">
          {['all', 'proposed', 'scheduled', 'completed', 'evaluated', 'cancelled'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-sm border ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            >
              {s === 'all' ? 'Todas' : s}
            </button>
          ))}
        </div>
      </section>
      {isLoading && <p>Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground">Nenhuma entrevista encontrada.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((i) => (
          <InterviewCard
            key={i.id}
            interview={i}
            onComplete={onComplete}
            onCancel={onCancel}
            onEvaluate={onEvaluate}
            canAct
          />
        ))}
      </div>
    </div>
  );
}
