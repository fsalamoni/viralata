/**
 * @fileoverview PostAdoptionDashboard — dashboard pessoal do adotante
 * pós-adoção (TASK-289).
 *
 * Lista as tasks de pós-adoção do usuário (cross-shelter) com:
 *  - Status badge (kanban column → label)
 *  - Tipo de task (check-in, foto, relato) com ícone
 *  - Due date com overdue/soon marker
 *  - Botão "Completar" (placeholder — TASK-289 stub para o flow real)
 *
 * Gated por feature flag `SHELTER_POSTADOPTION` (Fase 6).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Calendar, Image as ImageIcon, MessageCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useMyPostAdoptionTasks } from '@/modules/shelter/hooks/useMyPostAdoptionTasks';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

const TASK_ICONS = {
  'check-in': MessageCircle,
  photo: ImageIcon,
  relato: Heart,
  default: Calendar,
};

function taskTypeLabel(card) {
  if (card?.checklist_template) return card.checklist_template;
  if (Array.isArray(card?.tags)) {
    if (card.tags.includes('post-adoption-check-in')) return 'check-in';
    if (card.tags.includes('post-adoption-photo')) return 'foto';
    if (card.tags.includes('post-adoption-relato')) return 'relato';
  }
  return 'default';
}

function dueState(dueAt) {
  if (!dueAt) return { label: 'Sem prazo', tone: 'secondary' };
  const d = dueAt?.toDate ? dueAt.toDate() : new Date(dueAt);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Atrasado (${Math.abs(diffDays)}d)`, tone: 'destructive' };
  if (diffDays === 0) return { label: 'Vence hoje', tone: 'destructive' };
  if (diffDays <= 3) return { label: `Em ${diffDays}d`, tone: 'secondary' };
  return { label: d.toLocaleDateString('pt-BR'), tone: 'outline' };
}

export function PostAdoptionDashboard() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useMyPostAdoptionTasks(user?.uid);

  // Agrupa por abrigo
  const byClub = tasks.reduce((acc, t) => {
    const key = t.shelter_club_id || 'unknown';
    if (!acc[key]) acc[key] = { name: t.shelter_club_name || 'Abrigo', items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Faça login para ver suas tasks de pós-adoção.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6" /> Pós-adoção
        </h1>
        <p className="text-muted-foreground">
          Suas tasks e check-ins com os abrigos onde você adotou
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-green-600" />
            <p>Você não tem tasks pendentes de pós-adoção. 🎉</p>
            <p className="text-sm mt-2">
              Quando você adotar um pet, o abrigo poderá agendar check-ins, fotos e relatos.
            </p>
          </CardContent>
        </Card>
      )}

      {Object.entries(byClub).map(([clubId, { name, items }]) => (
        <Card key={clubId}>
          <CardHeader>
            <CardTitle className="text-base">
              <Link to={`/abrigos/${clubId}`} className="hover:underline">
                {name}
              </Link>
            </CardTitle>
            <CardDescription>
              {items.length} task{items.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((task) => {
                const Icon = TASK_ICONS[taskTypeLabel(task)] || TASK_ICONS.default;
                const due = dueState(task.due_at);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {task.title || task.name || 'Task sem título'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.column_name || 'Sem coluna'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={due.tone}>
                        {due.tone === 'destructive' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {due.label}
                      </Badge>
                      <Button size="sm" variant="outline" disabled>
                        Completar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
