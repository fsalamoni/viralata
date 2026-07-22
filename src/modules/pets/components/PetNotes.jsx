/**
 * @fileoverview PetNotes — anotações livres dos admins do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): subcoleção pets/{petId}/pet_notes.
 * CRUD simples: lista + form para adicionar + delete (apenas autor/admin).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Trash2, User, Clock, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/core/lib/utils';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  usePetNotes, useCreatePetNote, useDeletePetNote,
} from '../hooks/usePetNotes';
import { parseTimestamp } from '@/core/utils/timestamp';
import { toast } from 'sonner';

function timeAgo(date) {
  if (!date) return '';
  const now = Date.now();
  const d = date.getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PetNotes({ petId, canManage = true }) {
  const { user } = useAuth();
  const { data: notes = [], isLoading } = usePetNotes(petId);
  const createMutation = useCreatePetNote(petId);
  const deleteMutation = useDeletePetNote(petId);

  const [text, setText] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await createMutation.mutateAsync({ text: trimmed });
      setText('');
      toast.success('Anotação registrada');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar anotação.');
    }
  }

  async function handleDelete(noteId) {
    if (!window.confirm('Excluir esta anotação?')) return;
    try {
      await deleteMutation.mutateAsync(noteId);
      toast.success('Anotação excluída');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir.');
    }
  }

  function canDelete(note) {
    if (!user) return false;
    if (user.email === 'fsalamoni@gmail.com') return true;
    return note.author_uid === user.uid;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            <MessageSquare className="mr-1.5 inline h-4 w-4 text-sky-600" />
            Nova anotação
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma observação sobre o pet (ex: 'Reagiu bem ao novo banho', 'Apresentou alergia', 'Aniversariante do mês!')"
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            maxLength={1000}
            data-testid="pet-notes-input"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10.5px] text-muted-foreground">{text.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || createMutation.isPending}
              data-testid="pet-notes-submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Registrar
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma anotação ainda"
          description="Use o campo acima para registrar a primeira observação sobre o pet."
        />
      ) : (
        <ul className="space-y-3" data-testid="pet-notes-list">
          <AnimatePresence>
            {notes.map((note) => {
              const date = parseTimestamp(note.created_at);
              return (
                <motion.li
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {note.text}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                    <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="font-semibold text-foreground">
                        {note.author_name || 'Anônimo'}
                      </span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{date ? timeAgo(date) : '—'}</span>
                    </div>
                    {canDelete(note) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-100 hover:text-rose-700"
                        title="Excluir anotação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
