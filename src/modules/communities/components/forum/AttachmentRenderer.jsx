import React from 'react';
import { Paperclip, Play, Music } from 'lucide-react';

export default function AttachmentRenderer({ attachments }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-4 mt-4 border-t border-border/50 pt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4" /> Anexos</h4>

      {/* Inline Rendered Media */}
      <div className="flex flex-col gap-4">
        {attachments.filter(f => f.type.startsWith('video/')).map((file, i) => (
          <div key={`vid-${i}`} className="rounded-lg overflow-hidden border border-border/50 max-w-2xl bg-black">
            <video src={file.url} controls className="w-full h-auto max-h-[400px]" />
          </div>
        ))}

        {attachments.filter(f => f.type.startsWith('audio/')).map((file, i) => (
          <div key={`aud-${i}`} className="w-full max-w-md">
            <audio src={file.url} controls className="w-full" />
          </div>
        ))}

        {attachments.filter(f => f.type.startsWith('image/')).map((file, i) => (
          <div key={`img-${i}`} className="rounded-lg overflow-hidden border border-border/50 max-w-sm inline-block">
             <a href={file.url} target="_blank" rel="noreferrer">
               <img src={file.url} alt={file.name} className="w-full h-auto object-cover max-h-[300px]" />
             </a>
          </div>
        ))}
      </div>

      {/* Other files as download links */}
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.filter(f => !f.type.startsWith('video/') && !f.type.startsWith('audio/') && !f.type.startsWith('image/')).map((file, i) => (
          <a
            key={`doc-${i}`}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-2 border border-border rounded-lg bg-secondary/30 hover:bg-secondary/50 text-sm transition-colors"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{file.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
