import { useState } from 'react';
import { Video, ExternalLink, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function JitsiRoomLauncher({ prefix = 'shelter', contextLabel = 'entrevista', organizerName = null, className, testId = 'jitsi-launcher' }) {
  const [roomId, setRoomId] = useState(() => generateRoomId());
  const [expiresAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);

  const url = `https://meet.jit.si/${prefix}-${roomId}`;
  const openRoom = () => { window.open(url, '_blank', 'noopener,noreferrer'); setOpened(true); };
  const copyLink = async () => { try { await navigator.clipboard.writeText(url); } catch {} setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const generateNew = () => { setRoomId(generateRoomId()); setOpened(false); };

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-3', className)} data-testid={testId}>
      <div className="flex items-start gap-2">
        <div className="rounded-full bg-blue-50 p-2 text-blue-700"><Video className="h-4 w-4" /></div>
        <div>
          <h4 className="text-[13px] font-semibold">Sala de vídeo-entrevista</h4>
          <p className="text-[12px] text-muted-foreground">Link efêmero ({contextLabel}) — expira em 1h. LGPD: sem gravação sem consentimento.</p>
        </div>
      </div>
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-[11.5px] font-mono" data-testid={`${testId}-url`}>{url}</code>
          <Button size="sm" variant="ghost" onClick={copyLink} data-testid={`${testId}-copy`} className="h-7 px-2">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="mt-1 text-[10.5px] text-muted-foreground">Expira às {expiresAt.toLocaleTimeString('pt-BR')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={openRoom} className="flex-1" data-testid={`${testId}-open`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />{opened ? 'Reabrir' : 'Iniciar'}</Button>
        <Button variant="outline" onClick={generateNew} data-testid={`${testId}-new`}>Gerar novo</Button>
      </div>
      <div className="flex items-start gap-1.5 text-[10.5px] text-muted-foreground border-t border-border pt-2">
        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
        <span>Não compartilhe. Qualquer pessoa com o link pode entrar.{organizerName && ` Organizador: ${organizerName}.`}</span>
      </div>
    </div>
  );
}

export default JitsiRoomLauncher;
