/**
 * @fileoverview TaskAttachmentsField — upload e listagem de anexos (imagem/PDF)
 * de uma tarefa. Cada anexo pode ser aberto por qualquer membro (link público).
 */
import React, { useRef, useState } from 'react';
import { Paperclip, FileText, ImageIcon, X, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { uploadFile } from '@/core/services/storageService';

function isPdf(att) {
  return (att?.content_type || '').includes('pdf') || (att?.name || '').toLowerCase().endsWith('.pdf');
}

/** Lista somente-leitura de anexos (usada no detalhe). */
export function TaskAttachmentsList({ items = [], className }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((att, i) => (
        <li key={att.url || i}>
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50"
          >
            {isPdf(att) ? <FileText className="h-3.5 w-3.5 text-rose-600" /> : <ImageIcon className="h-3.5 w-3.5 text-sky-600" />}
            <span className="max-w-[180px] truncate">{att.name || 'anexo'}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function TaskAttachmentsField({ value = [], onChange, uid, folder = 'task-attachments' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (!uid) { toast.error('Faça login para enviar anexos.'); return; }
    setBusy(true);
    try {
      const uploaded = [];
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        const r = await uploadFile(f, { uid, folder });
        uploaded.push({ url: r.url, name: r.name, content_type: r.content_type, size: r.size });
      }
      onChange([...(value || []), ...uploaded]);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setBusy(false);
    }
  }

  function remove(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((att, i) => (
          <span key={att.url || i} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
            {isPdf(att) ? <FileText className="h-3.5 w-3.5 text-rose-600" /> : <ImageIcon className="h-3.5 w-3.5 text-sky-600" />}
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="max-w-[160px] truncate hover:underline">
              {att.name || 'anexo'}
            </a>
            <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remover anexo">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Paperclip className="mr-1.5 h-4 w-4" />}
        {busy ? 'Enviando…' : 'Anexar documento ou imagem'}
      </Button>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFiles} />
      <p className="text-[10.5px] text-muted-foreground">Imagens ou PDF, até 20 MB cada. Visíveis a todos os membros do abrigo.</p>
    </div>
  );
}
