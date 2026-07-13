/**
 * @fileoverview CreateForumThreadDialog — dialog para criar thread no fórum
 * com CoC clickwrap (TASK-160).
 *
 * Flow:
 *  1. User clica em "Nova thread"
 *  2. Se não aceitou CoC, exibe CodeOfConductDialog (TASK-157)
 *  3. Após aceite, exibe form de criação
 *  4. submit → createForumThread (TASK-160)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toast } from 'sonner';
import {
  checkForumCocStatus, createForumThread, COC_STATUS,
} from '../services/forumModerationService';
import { recordCocAcceptance } from '../services/codeOfConductService';
import { CodeOfConductDialog } from './CodeOfConductDialog';
import { logger } from '@/core/lib/logger';

export function CreateForumThreadDialog({ communityId, communityName, onCreated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cocOpen, setCocOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = async (next) => {
    if (!next) {
      setOpen(false);
      return;
    }
    if (!user) {
      toast.error('Faça login para criar uma thread.');
      navigate('/login');
      return;
    }
    // Pre-check CoC
    const status = await checkForumCocStatus(user.uid, communityId);
    if (status.status === COC_STATUS.HAS_NOT_ACCEPTED) {
      setCocOpen(true);
      return;
    }
    setOpen(true);
  };

  const handleAcceptCoc = async () => {
    try {
      await recordCocAcceptance(user.uid, communityId, user);
      setCocOpen(false);
      setOpen(true);
    } catch (err) {
      logger.error('CreateForumThreadDialog.handleAcceptCoc', { err: String(err) });
      toast.error('Falha ao registrar aceite. Tente novamente.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const result = await createForumThread({
        communityId,
        title: title.trim(),
        body: body.trim(),
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
      }, user);
      toast.success('Thread criada!');
      setOpen(false);
      setTitle('');
      setBody('');
      if (onCreated) onCreated(result);
    } catch (err) {
      if (err.code === 'forum/coc_required') {
        setCocOpen(true);
        return;
      }
      logger.error('CreateForumThreadDialog.handleSubmit', { err: String(err) });
      toast.error('Falha ao criar thread.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Nova thread
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Nova thread em {communityName}
            </DialogTitle>
            <DialogDescription>
              Compartilhe uma dúvida, dica ou experiência com a comunidade.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="thread-title">Título</Label>
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sobre o que é a thread?"
                maxLength={200}
                required
              />
            </div>
            <div>
              <Label htmlFor="thread-body">Conteúdo</Label>
              <Textarea
                id="thread-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Detalhe sua thread…"
                rows={6}
                maxLength={5000}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Criar thread
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CodeOfConductDialog
        open={cocOpen}
        onOpenChange={setCocOpen}
        onAccept={handleAcceptCoc}
        communityName={communityName}
      />
    </>
  );
}
