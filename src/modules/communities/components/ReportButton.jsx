/**
 * @fileoverview ReportButton — botão "Denunciar" em posts/comentários
 * (TASK-157).
 *
 * Compliance Marco Civil Art. 19: denúncias são armazenadas em
 * audit_log + collection `abuse_reports` (já existe) com flag de
 * revisão. Admin pode revisar via painel admin.
 */
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';

const REASONS = [
  { value: 'spam', label: 'Spam ou propaganda' },
  { value: 'harassment', label: 'Assédio ou bullying' },
  { value: 'hate', label: 'Discurso de ódio' },
  { value: 'violence', label: 'Violência ou ameaças' },
  { value: 'sexual', label: 'Conteúdo sexual' },
  { value: 'illegal', label: 'Atividade ilegal' },
  { value: 'false_info', label: 'Informação falsa' },
  { value: 'other', label: 'Outro' },
];

export function ReportButton({ contentId, contentType, contentSnapshot, communityId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    if (!user) return;
    if (!reason) return;
    setSubmitting(true);
    try {
      // 1) Salvar em abuse_reports
      const ref = await addDoc(collection(db, 'abuse_reports'), {
        reporter_uid: user.uid,
        content_id: contentId,
        content_type: contentType, // 'post' | 'comment'
        community_id: communityId,
        reason,
        details: details || null,
        status: 'pending',
        created_at: serverTimestamp(),
        reviewed_at: null,
        reviewed_by: null,
        content_snapshot: contentSnapshot || null, // backup para revisão
      });

      // 2) Audit log (Marco Civil Art. 19)
      await createAuditLog({
        action: 'content_reported',
        actor: { uid: user.uid, email: user.email },
        details: {
          report_id: ref.id,
          content_id: contentId,
          content_type: contentType,
          reason,
        },
      }).catch(() => {});

      setOpen(false);
      setReason('');
      setDetails('');
    } catch (err) {
      logger.error('ReportButton.handleReport', { err: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Flag className="h-3 w-3 mr-1" /> Denunciar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar conteúdo</DialogTitle>
            <DialogDescription>
              Sua denúncia é registrada em auditoria e revisada por moderadores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Detalhes (opcional)</label>
              <Textarea
                placeholder="Adicione contexto se necessário…"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReport} disabled={!reason || submitting}>
              {submitting ? 'Enviando…' : 'Denunciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
