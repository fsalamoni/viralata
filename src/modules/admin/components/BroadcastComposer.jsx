/**
 * @fileoverview BroadcastComposer — envio de notificação segmentada
 * (TASK-174). Montado no AdminNotifications.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { confirmDialog } from '@/components/ui/confirm-provider';
import {
  BROADCAST_SEGMENTS,
  BROADCAST_MAX_RECIPIENTS,
  resolveSegmentUserIds,
  sendSegmentedBroadcast,
} from '../services/broadcastService';

export function BroadcastComposer() {
  const { user } = useAuth();
  const [segment, setSegment] = useState('all');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Preview do alcance antes de disparar — evita broadcast acidental.
      const ids = await resolveSegmentUserIds(segment, { city });
      if (ids.length === 0) {
        toast.error('Nenhum usuário neste segmento.');
        return;
      }
      const ok = await confirmDialog({
        title: `Enviar para ${ids.length} usuário(s)?`,
        description: `Segmento: ${BROADCAST_SEGMENTS.find((s) => s.value === segment)?.label}${segment === 'city' ? ` (${city})` : ''}. Máximo por disparo: ${BROADCAST_MAX_RECIPIENTS}.`,
        destructive: false,
        confirmLabel: 'Enviar agora',
      });
      if (!ok) return;
      const { recipients } = await sendSegmentedBroadcast({
        segment, city, title, message, link,
        actor: { uid: user?.uid, email: user?.email, displayName: user?.displayName },
      });
      toast.success(`Notificação enviada para ${recipients} usuário(s).`);
      setTitle(''); setMessage(''); setLink('');
    } catch (err) {
      toast.error(err?.message || 'Falha ao enviar.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base">
          <Send className="h-4.5 w-4.5 text-primary" /> Enviar notificação segmentada
        </h3>
        <p className="arena-section-card-description">
          Escolha o segmento, escreva a mensagem e confirme o alcance antes do disparo.
          Tudo fica registrado no audit log.
        </p>
      </div>
      <div className="arena-section-card-body">
        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Segmento</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                {BROADCAST_SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            {segment === 'city' && (
              <div className="space-y-1">
                <Label htmlFor="bc_city" className="text-xs font-medium text-muted-foreground">Cidade</Label>
                <Input id="bc_city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" required />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="bc_title" className="text-xs font-medium text-muted-foreground">Título *</Label>
            <Input id="bc_title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bc_msg" className="text-xs font-medium text-muted-foreground">Mensagem *</Label>
            <Textarea id="bc_msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bc_link" className="text-xs font-medium text-muted-foreground">Link interno (opcional, ex.: /feed)</Label>
            <Input id="bc_link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/feed" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={sending || !title.trim() || !message.trim()}>
              {sending ? 'Enviando…' : 'Revisar e enviar'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default BroadcastComposer;
