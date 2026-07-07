import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { votePoll, getPollVotes } from '../../services/communityService';
import { CheckCircle2 } from 'lucide-react';

export default function PollComponent({ entityType, entityId, poll }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPollVotes(entityType, entityId).then(data => {
      if (isMounted) {
        setVotes(data);
        if (user) {
          const uVote = data.find(v => v.userId === user.uid);
          if (uVote) setUserVote(uVote.optionIndex);
        }
      }
    });
    return () => { isMounted = false; };
  }, [entityType, entityId, user]);

  const handleVote = async (index) => {
    if (!user) return toast.error('Faça login para votar');
    if (userVote === index) return;

    setVoting(true);
    try {
      await votePoll(entityType, entityId, index, user.uid);
      setUserVote(index);

      // Optimistic update
      setVotes(prev => {
        const filtered = prev.filter(v => v.userId !== user.uid);
        return [...filtered, { userId: user.uid, optionIndex: index }];
      });
      toast.success('Voto registrado!');
    } catch (e) {
      toast.error('Erro ao registrar voto');
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = votes.length;

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">{poll.question}</h4>
      <div className="space-y-3">
        {poll.options.map((option, index) => {
          const optionVotes = votes.filter(v => v.optionIndex === index).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = userVote === index;

          return (
            <div key={index} className="relative group">
              <button
                onClick={() => handleVote(index)}
                disabled={voting}
                className={`w-full text-left p-3 rounded-md border transition-colors relative z-10 flex justify-between items-center ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  <span className="font-medium text-sm">{option}</span>
                </div>
                <span className="text-xs text-muted-foreground">{percentage}% ({optionVotes})</span>
              </button>
              {totalVotes > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-secondary/30 rounded-md transition-all duration-500 z-0"
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground text-right">
        Total de votos: {totalVotes}
      </div>
    </div>
  );
}
