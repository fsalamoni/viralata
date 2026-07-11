/**
 * @fileoverview KanbanPage — página principal `/abrigos/:clubId/kanban`
 * (Fase 15).
 *
 * Toolbar: board selector, botão "+ Card", filtro por assignee/tipo.
 * Grid horizontal de colunas (scroll horizontal em mobile).
 * Empty state quando sem board default.
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, AlertCircle, Inbox, Kanban as KanbanIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import {
  useBoard, useBoards, useEnsureDefaultBoard,
  useCreateBoard, useCreateColumn, useUpdateColumn, useDeleteColumn,
  useReorderColumns, useCreateCard, useUpdateCard, useDeleteCard, useMoveCard,
} from '@/modules/shelter/hooks/useKanban';
import {
  KANBAN_CARD_TYPES, KANBAN_CARD_TYPE_LABELS,
  sortCardsByOrder, computeBoardProgress, emptyCardDraft,
  DEFAULT_COLUMN_SLUGS,
} from '@/modules/shelter/domain/operational/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardModal } from './KanbanCardModal';
import { KanbanColumnEditor } from './KanbanColumnEditor';
import { KanbanBoardSelector } from './KanbanBoardSelector';

const CONCLUDED_SLUG = 'concluida';

export function KanbanPage() {
  const { clubId } = useParams();
  const { currentUser } = useAuth();
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_KANBAN);

  const [activeBoardId, setActiveBoardId] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Garante que existe um board default
  const { id: defaultBoardId, isLoading: isEnsuring } = useEnsureDefaultBoard(
    enabled && clubId ? clubId : null,
  );

  // Lista todos os boards (para o seletor)
  const { data: boards = [] } = useBoards(clubId);

  // Decide qual board assistir
  useEffect(() => {
    if (!activeBoardId && defaultBoardId) {
      setActiveBoardId(defaultBoardId);
    }
  }, [defaultBoardId, activeBoardId]);

  // Subscribe ao board ativo
  const { board, columns, cards, errors, isLoading } = useBoard(
    enabled && clubId && activeBoardId ? clubId : null,
    activeBoardId,
  );

  // Mutations
  const createBoardMut = useCreateBoard(clubId);
  const createColumnMut = useCreateColumn(clubId);
  const updateColumnMut = useUpdateColumn(clubId);
  const deleteColumnMut = useDeleteColumn(clubId);
  const reorderColumnsMut = useReorderColumns(clubId);
  const createCardMut = useCreateCard(clubId);
  const updateCardMut = useUpdateCard(clubId);
  const deleteCardMut = useDeleteCard(clubId);
  const moveCardMut = useMoveCard(clubId);

  // Filtros aplicados
  const filteredCards = useMemo(() => {
    if (!Array.isArray(cards)) return [];
    return cards.filter((c) => {
      if (c.is_archived) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterAssignee !== 'all' && !(c.assignees || []).includes(filterAssignee)) {
        return false;
      }
      return true;
    });
  }, [cards, filterType, filterAssignee]);

  // Progress
  const progress = useMemo(
    () => computeBoardProgress({ columns }, filteredCards, { concludedColumnSlug: CONCLUDED_SLUG }),
    [columns, filteredCards],
  );

  // Map: column.id → cards
  const cardsByColumn = useMemo(() => {
    const m = {};
    if (Array.isArray(columns)) {
      for (const c of columns) m[c.id] = [];
    }
    for (const card of filteredCards) {
      if (m[card.column_id]) m[card.column_id].push(card);
      else m[card.column_id] = [card]; // coluna ausente
    }
    return m;
  }, [columns, filteredCards]);

  // Assignees únicos (para o filtro)
  const uniqueAssignees = useMemo(() => {
    const set = new Set();
    for (const c of cards || []) {
      for (const uid of c.assignees || []) set.add(uid);
    }
    return Array.from(set);
  }, [cards]);

  const openCard = useMemo(
    () => (openCardId ? cards.find((c) => c.id === openCardId) : null),
    [openCardId, cards],
  );

  const actor = useMemo(() => ({
    uid: currentUser?.uid || 'anonymous',
    displayName: currentUser?.displayName || currentUser?.email || 'Usuário',
  }), [currentUser]);

  if (!enabled) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Funcionalidade em rollout.</p>
              <p className="text-xs mt-1">
                A Central de Pendências (Kanban) está em rollout gradual controlado
                pela flag <code>SHELTER_KANBAN</code>. Em breve estará disponível
                para o seu abrigo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clubId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-sm text-muted-foreground">Abrigo não especificado.</p>
      </div>
    );
  }

  async function handleAddCard(column) {
    try {
      const out = await createCardMut.mutateAsync({
        boardId: activeBoardId,
        input: emptyCardDraft({
          shelterClubId: clubId,
          boardId: activeBoardId,
          columnId: column.id,
          createdBy: actor.uid,
        }),
        actor,
      });
      // Abre o card criado para edição
      setOpenCardId(out.id);
    } catch (err) {
      toast.error(`Erro ao criar card: ${err?.message || ''}`);
    }
  }

  async function handleCreateBoard(input) {
    return await createBoardMut.mutateAsync({
      input: {
        ...input,
        shelter_club_id: clubId,
        created_by: actor.uid,
      },
      actor,
    });
  }

  async function handleEditColumnSave(patch) {
    if (!editingColumn) return;
    await updateColumnMut.mutateAsync({
      boardId: activeBoardId,
      columnId: editingColumn.id,
      updates: patch,
      actor,
    });
    setEditingColumn(null);
    toast.success('Coluna atualizada');
  }

  async function handleCreateColumnSave(patch) {
    await createColumnMut.mutateAsync({
      boardId: activeBoardId,
      input: {
        ...patch,
        shelter_club_id: clubId,
        board_id: activeBoardId,
        order: columns.length,
        responsible_uids: patch.responsible_uids || [],
        wip_limit: patch.wip_limit ?? null,
        created_by: actor.uid,
      },
      actor,
    });
    setCreatingColumn(false);
    toast.success('Coluna criada');
  }

  async function handleDeleteColumn(col) {
    const cardCount = (cardsByColumn[col.id] || []).length;
    const msg = cardCount > 0
      ? `Deletar a coluna "${col.title}" e seus ${cardCount} card(s)? Os cards ficarão órfãos.`
      : `Deletar a coluna "${col.title}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteColumnMut.mutateAsync({
        boardId: activeBoardId,
        columnId: col.id,
        actor,
      });
      toast.success('Coluna deletada');
    } catch (err) {
      toast.error(`Erro: ${err?.message || ''}`);
    }
  }

  async function handleDropCard(cardId, toColumn) {
    try {
      await moveCardMut.mutateAsync({
        boardId: activeBoardId,
        cardId,
        toColumnId: toColumn.id,
        toOrder: 0,
        actor,
      });
    } catch (err) {
      toast.error(`Erro ao mover: ${err?.message || ''}`);
    }
  }

  async function handleCardUpdate(updatedCard) {
    const { id, board_id, column_id, shelter_club_id, created_by, created_at, ...patch } = updatedCard;
    await updateCardMut.mutateAsync({
      boardId: activeBoardId,
      cardId: id,
      updates: patch,
      actor,
    });
  }

  async function handleCardDelete(card) {
    await deleteCardMut.mutateAsync({
      boardId: activeBoardId,
      cardId: card.id,
      actor,
    });
    toast.success('Card deletado');
  }

  async function handleCardMove(card, toColumnId) {
    await moveCardMut.mutateAsync({
      boardId: activeBoardId,
      cardId: card.id,
      toColumnId,
      toOrder: 0,
      actor,
    });
  }

  const isInitialLoading = isEnsuring || isLoading;

  return (
    <div className="container mx-auto py-6 px-4 space-y-4" data-testid="kanban-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <KanbanIcon className="h-6 w-6 text-primary" />
            Central de Pendências
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize tarefas do abrigo em colunas. Arraste cards para mudar de fase.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <KanbanBoardSelector
            boards={boards}
            activeBoardId={activeBoardId}
            onSelectBoard={setActiveBoardId}
            onCreateBoard={handleCreateBoard}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatingColumn(true)}
            data-testid="kanban-add-column"
          >
            <Plus className="h-4 w-4 mr-1" /> Coluna
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <Badge variant="secondary">
          {progress.total} card{progress.total !== 1 ? 's' : ''}
        </Badge>
        {progress.overdue > 0 && (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" /> {progress.overdue} atrasado{progress.overdue !== 1 ? 's' : ''}
          </Badge>
        )}
        {progress.byPriority.urgent > 0 && (
          <Badge variant="outline" className="border-red-300 text-red-700">
            {progress.byPriority.urgent} urgente{progress.byPriority.urgent !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtros:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tipo:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[160px]" data-testid="kanban-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {KANBAN_CARD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{KANBAN_CARD_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {uniqueAssignees.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Responsável:</span>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="h-8 w-[180px]" data-testid="kanban-filter-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueAssignees.map((uid) => (
                    <SelectItem key={uid} value={uid}>{uid}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {errors._init || errors._board === 'no_default_board' ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum board encontrado. Criando um automaticamente…</p>
          </CardContent>
        </Card>
      ) : isInitialLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4" data-testid="kanban-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[300px] h-64 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          data-testid="kanban-columns"
        >
          {Array.isArray(columns) && columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] || []}
              onAddCard={handleAddCard}
              onCardClick={(c) => setOpenCardId(c.id)}
              onCardMenuClick={(c) => setOpenCardId(c.id)}
              onDropCard={handleDropCard}
              onEditColumn={(c) => setEditingColumn(c)}
              onDeleteColumn={handleDeleteColumn}
              concludedColumnSlug={CONCLUDED_SLUG}
              testId={`kanban-col-${col.id}`}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {openCard && (
        <KanbanCardModal
          open={Boolean(openCardId)}
          onOpenChange={(o) => !o && setOpenCardId(null)}
          card={openCard}
          columns={columns}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
          onMove={handleCardMove}
        />
      )}

      <KanbanColumnEditor
        open={Boolean(editingColumn)}
        onOpenChange={(o) => !o && setEditingColumn(null)}
        initial={editingColumn}
        onSubmit={handleEditColumnSave}
        testId="kanban-edit-column"
      />

      <KanbanColumnEditor
        open={creatingColumn}
        onOpenChange={setCreatingColumn}
        initial={null}
        onSubmit={handleCreateColumnSave}
        testId="kanban-create-column"
      />
    </div>
  );
}

export default KanbanPage;
