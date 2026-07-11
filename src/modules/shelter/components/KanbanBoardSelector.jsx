/**
 * @fileoverview KanbanBoardSelector — dropdown para trocar de board
 * (Fase 15).
 *
 * Lista todos os boards do abrigo (default marcado com estrela),
 * opção de criar novo board.
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useState } from 'react';
import { Star, ChevronDown, Plus, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/core/lib/utils';

export function KanbanBoardSelector({
  boards = [],
  activeBoardId = null,
  onSelectBoard,
  onCreateBoard,
  testId = 'kanban-board-selector',
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const active = boards.find((b) => b.id === activeBoardId) || boards[0];

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Título é obrigatório');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const out = await onCreateBoard({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        is_default: false,
        is_archived: false,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      if (out?.id && onSelectBoard) onSelectBoard(out.id);
    } catch (err) {
      setError(err?.message || 'Erro ao criar board');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" data-testid={testId}>
            {active?.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
            <span className="truncate max-w-[160px]">{active?.title || 'Selecionar board'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          <DropdownMenuLabel>Boards</DropdownMenuLabel>
          {boards.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Nenhum board ainda
            </div>
          )}
          {boards.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => onSelectBoard && onSelectBoard(b.id)}
              className={cn(
                'flex items-center gap-2',
                b.id === activeBoardId && 'bg-muted',
                b.is_archived && 'opacity-60',
              )}
              data-testid={`${testId}-item-${b.id}`}
            >
              {b.is_default ? (
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              ) : (
                <span className="h-3.5 w-3.5" />
              )}
              {b.is_archived && <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="flex-1 truncate">{b.title}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            data-testid={`${testId}-new`}
          >
            <Plus className="h-3.5 w-3.5 mr-2" /> Novo board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>Novo board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="kb-title">Título</Label>
              <Input
                id="kb-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex.: Operacional 2026"
                maxLength={120}
                required
                data-testid={`${testId}-title`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-desc">Descrição (opcional)</Label>
              <Input
                id="kb-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Para que serve este board?"
                maxLength={500}
                data-testid={`${testId}-description`}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} data-testid={`${testId}-submit`}>
                {submitting ? 'Criando…' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default KanbanBoardSelector;
